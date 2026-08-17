'use client';

import {
  MAX_UPLOAD_IMAGE_BYTES,
  uploadAdminImage,
  type ImageUploadOptions,
} from '@/lib/imageUpload';

export type CatalogImageKind = 'products' | 'categories';

export type CatalogImageUploadOptions = {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
};

export const MAX_CATALOG_IMAGE_BYTES = MAX_UPLOAD_IMAGE_BYTES;
export const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Backwards-compatible catalog helper. New UI uses the shared admin upload
 * field directly, but callers can still upload a product/category image here.
 */
export async function uploadCatalogImage(
  file: File,
  kind: CatalogImageKind,
  options: CatalogImageUploadOptions = {},
): Promise<string> {
  const uploadOptions: ImageUploadOptions = {
    folder: kind === 'products' ? 'jayluxe/products' : 'jayluxe/categories',
    onProgress: options.onProgress,
    timeoutMs: options.timeoutMs,
  };
  const result = await uploadAdminImage(file, uploadOptions);
  return result.url;
}
