'use client';

import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import app from '@/lib/firebase';

export type CatalogImageKind = 'products' | 'categories';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
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

/**
 * Stores product/category media in the Firebase Storage bucket already used by
 * JayLuxe, then returns the durable HTTPS download URL that should be saved in
 * Firestore. This prevents base64/data URLs from being stored in catalog docs.
 */
export async function uploadCatalogImage(
  file: File,
  kind: CatalogImageKind,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Upload a JPG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Upload an image smaller than 8 MB.');
  }

  const storage = getStorage(app);
  const fileName = safeFileName(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const imageRef = ref(storage, `${kind}/${unique}-${fileName}`);

  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });

  return getDownloadURL(snapshot.ref);
}
