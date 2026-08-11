export const DEFAULT_PRODUCT_IMAGE = '/product-placeholder.png';

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'res.cloudinary.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

const LEGACY_DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;
const MAX_LEGACY_DATA_URL_LENGTH = 12_000_000;

export function isLegacyDataImageSource(source?: string | null): boolean {
  const value = source?.trim() || '';
  return value.length <= MAX_LEGACY_DATA_URL_LENGTH && LEGACY_DATA_IMAGE.test(value);
}

/**
 * Prevents Next/Image from receiving unconfigured or malformed remote URLs.
 * New catalog uploads are durable Firebase Storage/Cloudinary URLs. Legacy
 * catalog records that still contain a safe image data URL remain readable so
 * existing products do not suddenly show blank placeholders.
 */
export function getSafeImageSource(
  source?: string | null,
  fallback = DEFAULT_PRODUCT_IMAGE,
): string {
  const value = source?.trim();

  if (!value) return fallback;
  if (value.startsWith('/')) return value;
  if (isLegacyDataImageSource(value)) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return fallback;

    return ALLOWED_REMOTE_IMAGE_HOSTS.has(url.hostname) ? value : fallback;
  } catch {
    return fallback;
  }
}
