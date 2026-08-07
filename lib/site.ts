export const SITE_NAME = 'JayLuxe';

export function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';

  try {
    return new URL(configured);
  } catch {
    return new URL('http://localhost:3000');
  }
}
