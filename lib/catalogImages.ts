'use client';

import {
  ADMIN_IMAGE_UPLOAD_TIMEOUT_MS,
  MAX_ADMIN_IMAGE_BYTES,
  uploadAdminImage,
  type AdminImageUploadOptions,
} from '@/lib/adminImageUpload';

export type CatalogImageKind = 'products' | 'categories';
export type CatalogImageUploadOptions = AdminImageUploadOptions;

export const MAX_CATALOG_IMAGE_BYTES = MAX_ADMIN_IMAGE_BYTES;
export const UPLOAD_TIMEOUT_MS = ADMIN_IMAGE_UPLOAD_TIMEOUT_MS;

/**
 * Backward-compatible catalog wrapper. New admin upload UI uses
 * `AdminImageUpload` directly, while any older callers still receive the same
 * Promise<string> API through the single shared Firebase Storage uploader.
 */
export function uploadCatalogImage(
  file: File,
  kind: CatalogImageKind,
  options: CatalogImageUploadOptions = {},
): Promise<string> {
  return uploadAdminImage(file, kind, options);
}
