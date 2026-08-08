export const SITE_NAME = 'JayLuxe';
export const PRODUCTION_SITE_URL = 'https://jayluxestore.com';
export const DEVELOPMENT_SITE_URL = 'http://localhost:3000';

function normaliseOrigin(value: string) {
  const parsed = new URL(value);
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';

  if (parsed.hostname.toLowerCase() === 'www.jayluxestore.com') {
    return new URL(PRODUCTION_SITE_URL);
  }

  return parsed;
}

export function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const fallback =
    process.env.NODE_ENV === 'production'
      ? PRODUCTION_SITE_URL
      : DEVELOPMENT_SITE_URL;

  try {
    const siteUrl = normaliseOrigin(configured || fallback);

    if (
      process.env.NODE_ENV === 'production' &&
      siteUrl.hostname.toLowerCase() !== 'jayluxestore.com'
    ) {
      return new URL(PRODUCTION_SITE_URL);
    }

    return siteUrl;
  } catch {
    return new URL(fallback);
  }
}

export function getSiteUrlString() {
  return getSiteUrl().toString().replace(/\/$/, '');
}
