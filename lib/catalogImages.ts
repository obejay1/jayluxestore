'use client';

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
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
const FIREBASE_RETRY_HEADROOM_MS = 10_000;
const MIN_FIREBASE_RETRY_MS = 15_000;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

class CatalogImageUploadError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CatalogImageUploadError';
    this.code = code;
  }
}

function safeFileName(name: string) {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'image';
}

function storageErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error
    ? String((error as StorageError).code || '')
    : '';
}

function catalogUploadError(error: unknown) {
  const code = storageErrorCode(error);

  switch (code) {
    case 'storage/unauthenticated':
      return new CatalogImageUploadError('Your Firebase sign-in session is missing or expired. Sign out of Admin, sign in again, and retry the image upload.', code);
    case 'storage/unauthorized':
      return new CatalogImageUploadError('Firebase Storage rejected this upload. Confirm the signed-in administrator has the required product/category permission and that the latest Storage Rules are deployed.', code);
    case 'storage/canceled':
      return new CatalogImageUploadError('The image upload was cancelled. Please try again.', code);
    case 'storage/retry-limit-exceeded':
      return new CatalogImageUploadError('Firebase Storage could not complete the upload after repeated network attempts. Check the browser Network panel, your connection, Firebase billing status, and bucket configuration.', code);
    case 'storage/quota-exceeded':
      return new CatalogImageUploadError('Firebase Storage quota or billing access is unavailable for this project. Check Firebase Usage and billing, then retry.', code);
    case 'storage/bucket-not-found':
      return new CatalogImageUploadError('The configured Firebase Storage bucket could not be found. Verify NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET against Firebase Console → Storage → Files.', code);
    case 'storage/project-not-found':
      return new CatalogImageUploadError('The Firebase project for image uploads could not be found. Verify the production Firebase project ID and Storage bucket.', code);
    case 'storage/invalid-checksum':
      return new CatalogImageUploadError('The uploaded image failed Firebase integrity validation. Please select the image again and retry.', code);
    case 'storage/server-file-wrong-size':
      return new CatalogImageUploadError('Firebase reported an incomplete image upload. Please retry on a stable connection.', code);
    case 'storage/unknown':
      return new CatalogImageUploadError('Firebase Storage returned an unknown error. Check the browser Network response and Firebase Console for the underlying failure.', code);
    default: {
      const message = error instanceof Error ? error.message : 'Image upload failed. Please try again.';
      return new CatalogImageUploadError(message, code || undefined);
    }
  }
}

function cancelUpload(task: UploadTask) {
  try {
    task.cancel();
  } catch {
    // Best effort: the outer promise still rejects with the timeout/error message.
  }
}

function configureRetryBudget(storage: FirebaseStorage, timeoutMs: number) {
  const retryMs = Math.max(
    MIN_FIREBASE_RETRY_MS,
    Math.min(timeoutMs - FIREBASE_RETRY_HEADROOM_MS, 60_000),
  );

  // FirebaseStorage exposes maxUploadRetryTime specifically for upload retry
  // behaviour. Keep it below JayLuxe's outer timeout so native Firebase error
  // codes are surfaced before the UI safety timer fires.
  storage.maxUploadRetryTime = retryMs;
}

/**
 * Upload product/category media to JayLuxe's configured Firebase Storage bucket
 * and return the durable HTTPS URL that is persisted in the existing Firestore
 * `image` field. The current form image is not mutated by this helper, so a
 * failed replacement upload never destroys an already saved image reference.
 */
export async function uploadCatalogImage(
  file: File,
  kind: CatalogImageKind,
  options: CatalogImageUploadOptions = {},
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new CatalogImageUploadError('Upload a JPG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_CATALOG_IMAGE_BYTES) {
    throw new CatalogImageUploadError('Upload an image that is 8 MB or smaller.');
  }

  const storage = getStorage(app);
  const bucket = storage.app.options.storageBucket;
  if (!bucket) {
    throw new CatalogImageUploadError('Firebase Storage is not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.');
  }

  const timeoutMs = Math.max(25_000, options.timeoutMs ?? UPLOAD_TIMEOUT_MS);
  configureRetryBudget(storage, timeoutMs);

  const fileName = safeFileName(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const imageRef = ref(storage, `${kind}/${unique}-${fileName}`);
  const task = uploadBytesResumable(imageRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });

  // Non-secret context intentionally goes to DevTools so production failures can
  // be distinguished without exposing API keys or service-account credentials.
  console.info('[JayLuxe image upload] Firebase Storage bucket:', bucket, {
    projectId: storage.app.options.projectId || 'unknown',
    kind,
    fileType: file.type,
    fileSize: file.size,
  });

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    const cleanupAndResolve = (url: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      options.onProgress?.(100);
      resolve(url);
    };

    const cleanupAndReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      const normalized = catalogUploadError(error);
      console.error('[JayLuxe image upload] Firebase upload failed', {
        code: normalized.code || storageErrorCode(error) || 'unknown',
        message: normalized.message,
        bucket,
        kind,
      });
      reject(normalized);
    };

    timeoutId = window.setTimeout(() => {
      if (settled) return;
      const timeoutError = new CatalogImageUploadError(
        `Image upload exceeded ${Math.round(timeoutMs / 1000)} seconds. Check the firebasestorage.googleapis.com request in DevTools and confirm Firebase Storage billing, bucket, rules, and network access.`,
        'jayluxe/upload-timeout',
      );
      settled = true;
      cleanup();
      cancelUpload(task);
      console.error('[JayLuxe image upload] Upload safety timeout', {
        code: timeoutError.code,
        message: timeoutError.message,
        bucket,
        kind,
      });
      reject(timeoutError);
    }, timeoutMs);

    unsubscribe = task.on(
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
