export const DEFAULT_PRODUCT_IMAGE = '/product-placeholder.png';

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'res.cloudinary.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

const LEGACY_DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;
const MAX_LEGACY_DATA_URL_LENGTH = 12_000_000;
const CLOUDINARY_UPLOAD_MARKER = '/image/upload/';

export type CloudinaryImageLoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

export function isLegacyDataImageSource(source?: string | null): boolean {
  const value = source?.trim() || '';
  return value.length <= MAX_LEGACY_DATA_URL_LENGTH && LEGACY_DATA_IMAGE.test(value);
}

export function isCloudinaryImageSource(source?: string | null): boolean {
  const value = source?.trim();
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && url.pathname.includes(CLOUDINARY_UPLOAD_MARKER);
  } catch {
    return false;
  }
}

/**
 * Build a Cloudinary delivery URL for the exact width requested by Next/Image.
 * `c_limit` prevents accidental upscaling while `f_auto` and `q_auto` let
 * Cloudinary choose an efficient browser-compatible format and quality.
 * A numeric Next/Image quality still takes precedence when explicitly passed.
 */
export function cloudinaryImageLoader({
  src,
  width,
  quality,
}: CloudinaryImageLoaderArgs): string {
  if (!isCloudinaryImageSource(src)) return src;

  const markerIndex = src.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (markerIndex < 0) return src;

  const markerEnd = markerIndex + CLOUDINARY_UPLOAD_MARKER.length;
  const prefix = src.slice(0, markerEnd);
  const suffix = src.slice(markerEnd);
  const safeWidth = Math.max(1, Math.round(width));
  const qualityTransform = quality
    ? `q_${Math.max(1, Math.min(100, Math.round(quality)))}`
    : 'q_auto';

  return `${prefix}f_auto,${qualityTransform},c_limit,w_${safeWidth}/${suffix}`;
}

/**
 * Optimizes a URL for image consumers that cannot use Next/Image directly
 * (for example the before/after comparison component). Non-Cloudinary and
 * legacy image sources are left on their safe original URL.
 */
export function getResponsiveDeliverySource(
  source: string | null | undefined,
  width: number,
  fallback = DEFAULT_PRODUCT_IMAGE,
  quality?: number,
): string {
  const safeSource = getSafeImageSource(source, fallback);
  return isCloudinaryImageSource(safeSource)
    ? cloudinaryImageLoader({ src: safeSource, width, quality })
    : safeSource;
}

/**
 * Prevents Next/Image from receiving unconfigured or malformed remote URLs.
 * New admin media uploads are durable Cloudinary URLs. Legacy Firebase Storage and
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
