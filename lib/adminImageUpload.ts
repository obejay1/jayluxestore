'use client';

import { getIdToken } from 'firebase/auth';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type StorageError,
  type UploadTask,
} from 'firebase/storage';

import app, { auth } from '@/lib/firebase';

export type AdminImageKind =
  | 'products'
  | 'services'
  | 'categories'
  | 'testimonials'
  | 'transformation-before'
  | 'transformation-after'
  | 'bridal-gallery';

export type AdminImageUploadOptions = {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
};

export type AdminImageUploadController = {
  promise: Promise<string>;
  cancel: () => void;
};

export const MAX_ADMIN_IMAGE_BYTES = 8 * 1024 * 1024;
export const ADMIN_IMAGE_UPLOAD_TIMEOUT_MS = 90_000;

const FIREBASE_RETRY_HEADROOM_MS = 10_000;
const MIN_FIREBASE_RETRY_MS = 15_000;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const STORAGE_PREFIX: Record<AdminImageKind, string> = {
  products: 'products',
  services: 'services',
  categories: 'categories',
  testimonials: 'testimonials',
  'transformation-before': 'transformations/before',
  'transformation-after': 'transformations/after',
  'bridal-gallery': 'bridal-gallery',
};

export class AdminImageUploadError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AdminImageUploadError';
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

function uniqueFileName(file: File) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${suffix}-${safeFileName(file.name)}`;
}

function storageErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error
    ? String((error as StorageError).code || '')
    : '';
}

function normalizedUploadError(error: unknown) {
  if (error instanceof AdminImageUploadError) return error;

  const code = storageErrorCode(error);

  switch (code) {
    case 'storage/unauthenticated':
      return new AdminImageUploadError(
        'Your Firebase administrator session is missing or expired. Sign in again and retry the image upload.',
        code,
      );
    case 'storage/unauthorized':
      return new AdminImageUploadError(
        'Firebase Storage rejected this image. Confirm this administrator has permission for this section and that the latest Storage Rules are deployed.',
        code,
      );
    case 'storage/canceled':
      return new AdminImageUploadError('The image upload was cancelled.', code);
    case 'storage/retry-limit-exceeded':
      return new AdminImageUploadError(
        'The image upload could not complete after repeated network attempts. Check your connection and try again.',
        code,
      );
    case 'storage/quota-exceeded':
      return new AdminImageUploadError(
        'Firebase Storage quota or billing access is unavailable. Check Firebase Usage/Billing and retry.',
        code,
      );
    case 'storage/invalid-checksum':
      return new AdminImageUploadError(
        'The uploaded image failed Firebase integrity validation. Select the image again and retry.',
        code,
      );
    case 'storage/object-not-found':
      return new AdminImageUploadError(
        'Firebase could not find the uploaded image object. Retry the upload.',
        code,
      );
    case 'storage/bucket-not-found':
      return new AdminImageUploadError(
        'The configured Firebase Storage bucket could not be found. Verify NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in Vercel against Firebase Console → Storage.',
        code,
      );
    case 'storage/no-default-bucket':
    case 'storage/invalid-default-bucket':
      return new AdminImageUploadError(
        'Firebase Storage does not have a valid default bucket. Copy the exact bucket name from Firebase Console → Storage into NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET and redeploy.',
        code,
      );
    case 'storage/unauthorized-app':
      return new AdminImageUploadError(
        'Firebase rejected this web app for Storage access. Verify that the Firebase web-app configuration and Storage bucket belong to the same project.',
        code,
      );
    case 'storage/project-not-found':
      return new AdminImageUploadError(
        'The Firebase project for this upload could not be found. Verify the production Firebase project configuration.',
        code,
      );
    case 'storage/server-file-wrong-size':
      return new AdminImageUploadError(
        'Firebase reported an incomplete image upload. Retry on a stable connection.',
        code,
      );
    case 'storage/unknown':
      return new AdminImageUploadError(
        'Firebase Storage returned an unknown error. Check the browser console/network response for the underlying Firebase message.',
        code,
      );
    default:
      return new AdminImageUploadError(
        error instanceof Error ? error.message : 'Image upload failed. Please try again.',
        code || undefined,
      );
  }
}

function validateFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new AdminImageUploadError('Image must be JPG, PNG, WebP, or GIF.');
  }

  if (file.size <= 0) {
    throw new AdminImageUploadError('The selected image is empty. Please choose another image.');
  }

  if (file.size > MAX_ADMIN_IMAGE_BYTES) {
    throw new AdminImageUploadError('Image is too large. Please choose an image that is 8 MB or smaller.');
  }
}

function createCanceledError() {
  return new AdminImageUploadError('The image upload was cancelled.', 'storage/canceled');
}

export function startAdminImageUpload(
  file: File,
  kind: AdminImageKind,
  options: AdminImageUploadOptions = {},
): AdminImageUploadController {
  let task: UploadTask | null = null;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    try {
      task?.cancel();
    } catch {
      // Cancellation is best effort; the promise still settles through the guard below.
    }
  };

  const promise = (async () => {
    validateFile(file);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new AdminImageUploadError(
        'Your Firebase administrator session is missing or expired. Sign in again and retry the image upload.',
        'storage/unauthenticated',
      );
    }

    // Force a fresh token so Storage Rules receive current admin role/permissions.
    await getIdToken(currentUser, true);
    if (cancelled) throw createCanceledError();

    const storage = getStorage(app);
    const bucket = storage.app.options.storageBucket;
    if (!bucket) {
      throw new AdminImageUploadError(
        'Firebase Storage is not configured. Verify NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in the production environment.',
        'jayluxe/storage-not-configured',
      );
    }

    const timeoutMs = Math.max(25_000, options.timeoutMs ?? ADMIN_IMAGE_UPLOAD_TIMEOUT_MS);
    const retryMs = Math.max(
      MIN_FIREBASE_RETRY_MS,
      Math.min(timeoutMs - FIREBASE_RETRY_HEADROOM_MS, 60_000),
    );
    storage.maxUploadRetryTime = retryMs;

    const imageRef = ref(storage, `${STORAGE_PREFIX[kind]}/${uniqueFileName(file)}`);
    task = uploadBytesResumable(imageRef, file, {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000,immutable',
    });

    console.info('[JayLuxe admin image upload] Firebase Storage bucket:', bucket, {
      projectId: storage.app.options.projectId || 'unknown',
      kind,
      path: imageRef.fullPath,
      fileType: file.type,
      fileSize: file.size,
    });

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeoutId: number | null = null;
      let unsubscribe: (() => void) | null = null;

      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        unsubscribe?.();
        unsubscribe = null;
      };

      const rejectOnce = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        const normalized = normalizedUploadError(error);
        console.error('[JayLuxe admin image upload] Firebase upload failed', {
          code: normalized.code || storageErrorCode(error) || 'unknown',
          message: normalized.message,
          bucket,
          kind,
          path: imageRef.fullPath,
        });
        reject(normalized);
      };

      const resolveOnce = (url: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        options.onProgress?.(100);
        resolve(url);
      };

      timeoutId = window.setTimeout(() => {
        if (settled) return;
        const timeoutError = new AdminImageUploadError(
          `Image upload exceeded ${Math.round(timeoutMs / 1000)} seconds. Check your connection, Firebase Storage bucket, authentication, and deployed Storage Rules.`,
          'jayluxe/upload-timeout',
        );
        cancel();
        rejectOnce(timeoutError);
      }, timeoutMs);

      unsubscribe = task!.on(
        'state_changed',
        (snapshot) => {
          if (settled || cancelled) return;
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          options.onProgress?.(Math.min(99, Math.max(0, progress)));
        },
        rejectOnce,
        async () => {
          try {
            if (cancelled) {
              rejectOnce(createCanceledError());
              return;
            }
            const url = await getDownloadURL(task!.snapshot.ref);
            resolveOnce(url);
          } catch (error) {
            rejectOnce(error);
          }
        },
      );

      if (cancelled) {
        cancel();
        rejectOnce(createCanceledError());
      }
    });
  })().catch((error) => {
    throw normalizedUploadError(error);
  });

  return { promise, cancel };
}

export async function uploadAdminImage(
  file: File,
  kind: AdminImageKind,
  options: AdminImageUploadOptions = {},
): Promise<string> {
  return startAdminImageUpload(file, kind, options).promise;
}
