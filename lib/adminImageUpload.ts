'use client';

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

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_COMPRESSED_DIMENSION = 2000;
const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;
const PNG_QUALITY = 0.9;

const CLOUDINARY_FOLDER: Record<AdminImageKind, string> = {
  products: 'jayluxe/products',
  services: 'jayluxe/services',
  categories: 'jayluxe/categories',
  testimonials: 'jayluxe/testimonials',
  'transformation-before': 'jayluxe/transformations/before',
  'transformation-after': 'jayluxe/transformations/after',
  'bridal-gallery': 'jayluxe/bridal-gallery',
};

export class AdminImageUploadError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AdminImageUploadError';
    this.code = code;
  }
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
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

function loadImageObject(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new AdminImageUploadError('The selected image could not be read. Please choose another image.'));
    };
    image.src = objectUrl;
  });
}

function encodeBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(new AdminImageUploadError('The selected image could not be read. Please choose another image.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new AdminImageUploadError('The image could not be compressed. Please choose another image.'));
      },
      type,
      quality,
    );
  });
}

/**
 * Compresses and downscales very large images client-side before upload so
 * e-commerce uploads stay small without destroying visible quality. GIFs are
 * passed through untouched to preserve animation.
 */
async function prepareImageDataUrl(file: File): Promise<string> {
  if (file.type === 'image/gif' || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return encodeBlob(file);
  }

  const image = await loadImageObject(file);
  const needsScaling = Math.max(image.naturalWidth, image.naturalHeight) > MAX_COMPRESSED_DIMENSION;
  if (!needsScaling) {
    return encodeBlob(file);
  }

  const scale = Math.min(1, MAX_COMPRESSED_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new AdminImageUploadError('The image could not be processed. Please choose another image.');
  }
  context.drawImage(image, 0, 0, width, height);

  const outputType =
    file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const quality =
    outputType === 'image/png' ? PNG_QUALITY : outputType === 'image/webp' ? WEBP_QUALITY : JPEG_QUALITY;

  const compressed = await canvasToBlob(canvas, outputType, quality);
  if (compressed.size >= file.size) {
    return encodeBlob(file);
  }
  return encodeBlob(compressed);
}

async function sendUploadRequest(
  dataUrl: string,
  folder: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ image: dataUrl, folder }),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new AdminImageUploadError(
        `Image upload exceeded ${Math.round(timeoutMs / 1000)} seconds. Check your connection and try again.`,
        'jayluxe/upload-timeout',
      );
    }
    throw new AdminImageUploadError(
      'Could not reach the upload service. Check your connection and try again.',
      'jayluxe/network-error',
    );
  }

  const text = await response.text().catch(() => '');
  let body: { url?: unknown; message?: unknown; code?: unknown } = {};
  if (text) {
    try {
      body = JSON.parse(text) as { url?: unknown; message?: unknown; code?: unknown };
    } catch {
      body = {};
    }
  }

  const message =
    typeof body.message === 'string' && body.message
      ? body.message
      : 'Image upload failed. Please try again.';

  if (response.status === 401) {
    throw new AdminImageUploadError(
      'Your administrator session has expired. Sign in again and retry the image upload.',
      'jayluxe/unauthenticated',
    );
  }
  if (response.status === 403) {
    throw new AdminImageUploadError(
      'This administrator account does not have permission to upload images.',
      'jayluxe/forbidden',
    );
  }
  if (!response.ok) {
    throw new AdminImageUploadError(message, body.code ? String(body.code) : `jayluxe/http-${response.status}`);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !/^https:\/\//i.test(url)) {
    throw new AdminImageUploadError(
      'The upload service returned an invalid image URL. Please try again.',
      'jayluxe/invalid-response',
    );
  }
  return url;
}

export function startAdminImageUpload(
  file: File,
  kind: AdminImageKind,
  options: AdminImageUploadOptions = {},
): AdminImageUploadController {
  let aborted = false;

  const cancel = () => {
    aborted = true;
  };

  const promise = (async () => {
    validateFile(file);

    const timeoutMs = Math.max(25_000, options.timeoutMs ?? ADMIN_IMAGE_UPLOAD_TIMEOUT_MS);

    const progressTimer = window.setInterval(() => {
      options.onProgress?.(90);
    }, 600);
    const clearProgressTimer = () => window.clearInterval(progressTimer);

    try {
      options.onProgress?.(5);
      const dataUrl = await prepareImageDataUrl(file);
      if (aborted) throw new AdminImageUploadError('The image upload was cancelled.', 'jayluxe/cancelled');

      options.onProgress?.(40);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = await sendUploadRequest(
          dataUrl,
          CLOUDINARY_FOLDER[kind],
          timeoutMs,
          controller.signal,
        );
        if (aborted) throw new AdminImageUploadError('The image upload was cancelled.', 'jayluxe/cancelled');
        options.onProgress?.(100);
        return url;
      } finally {
        window.clearTimeout(timeoutId);
      }
    } finally {
      clearProgressTimer();
    }
  })().catch((error) => {
    throw error instanceof AdminImageUploadError
      ? error
      : new AdminImageUploadError(
          error instanceof Error ? error.message : 'Image upload failed. Please try again.',
        );
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
