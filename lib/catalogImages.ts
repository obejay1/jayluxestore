'use client';

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type StorageError,
  type UploadTask,
} from 'firebase/storage';

import app from '@/lib/firebase';

export type CatalogImageKind = 'products' | 'categories';

export type CatalogImageUploadOptions = {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
};

export const MAX_CATALOG_IMAGE_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TIMEOUT_MS = 90_000;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeFileName(name: string) {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'image';
}

function catalogUploadError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as StorageError).code || '')
      : '';

  switch (code) {
    case 'storage/unauthorized':
      return new Error('You do not have permission to upload this image. Refresh your admin session and try again.');
    case 'storage/canceled':
      return new Error('The image upload was cancelled. Please try again.');
    case 'storage/retry-limit-exceeded':
      return new Error('The image upload timed out after repeated network attempts. Please check your connection and try again.');
    case 'storage/quota-exceeded':
      return new Error('Firebase Storage quota has been exceeded. Check the Firebase project billing/storage quota.');
    case 'storage/bucket-not-found':
      return new Error('The configured Firebase Storage bucket could not be found. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.');
    case 'storage/project-not-found':
      return new Error('The Firebase project for image uploads could not be found. Check the production Firebase configuration.');
    case 'storage/unknown':
      return new Error('Firebase Storage could not complete the image upload. Please try again.');
    default:
      return error instanceof Error ? error : new Error('Image upload failed. Please try again.');
  }
}

function cancelUpload(task: UploadTask) {
  try {
    task.cancel();
  } catch {
    // Cancellation is best-effort. The promise below still rejects with the timeout message.
  }
}

/**
 * Stores product/category media in the Firebase Storage bucket already used by
 * JayLuxe, then returns the durable HTTPS download URL that should be saved in
 * Firestore. Progress and timeout handling prevent the Admin UI from remaining
 * indefinitely in an "Uploading image…" state when a request stalls.
 */
export async function uploadCatalogImage(
  file: File,
  kind: CatalogImageKind,
  options: CatalogImageUploadOptions = {},
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Upload a JPG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_CATALOG_IMAGE_BYTES) {
    throw new Error('Upload an image that is 8 MB or smaller.');
  }

  const storage = getStorage(app);
  if (!storage.app.options.storageBucket) {
    throw new Error('Firebase Storage is not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.');
  }

  const fileName = safeFileName(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const imageRef = ref(storage, `${kind}/${unique}-${fileName}`);
  const task = uploadBytesResumable(imageRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  const timeoutMs = Math.max(5_000, options.timeoutMs ?? UPLOAD_TIMEOUT_MS);

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const cleanupAndResolve = (url: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      options.onProgress?.(100);
      resolve(url);
    };

    const cleanupAndReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(catalogUploadError(error));
    };

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cancelUpload(task);
      reject(new Error('Image upload timed out. Check your connection and Firebase Storage configuration, then try again.'));
    }, timeoutMs);

    task.on(
      'state_changed',
      (snapshot) => {
        if (settled) return;
        const progress = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        options.onProgress?.(Math.min(99, Math.max(0, progress)));
      },
      cleanupAndReject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          cleanupAndResolve(url);
        } catch (error) {
          cleanupAndReject(error);
        }
      },
    );
  });
}
