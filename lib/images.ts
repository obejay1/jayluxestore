export const DEFAULT_PRODUCT_IMAGE = '/product-placeholder.png';

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'res.cloudinary.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

/**
 * Prevents Next/Image from receiving unconfigured or malformed remote URLs.
 * Local public-folder paths and the hosts declared in next.config.js are kept.
 */
export function getSafeImageSource(
  source?: string | null,
  fallback = DEFAULT_PRODUCT_IMAGE,
): string {
  const value = source?.trim();

  if (!value) return fallback;
  if (value.startsWith('/')) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return fallback;

    return ALLOWED_REMOTE_IMAGE_HOSTS.has(url.hostname) ? value : fallback;
  } catch {
    return fallback;
  }
}
