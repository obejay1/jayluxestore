'use client';

const TOKEN_KEY_PREFIX = 'jayluxe-order-access:';
const HASH_KEY = 'access_token';

function storageKey(orderId: string) {
  return `${TOKEN_KEY_PREFIX}${orderId}`;
}

export function buildPrivateOrderUrl(path: string, accessToken?: string | null) {
  const token = String(accessToken || '').trim();
  return token ? `${path}#${HASH_KEY}=${encodeURIComponent(token)}` : path;
}

export function captureOrderAccessToken(orderId: string): string {
  if (typeof window === 'undefined') return '';

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const token = hashParams.get(HASH_KEY)?.trim() || '';

  if (token) {
    try {
      sessionStorage.setItem(storageKey(orderId), token);
    } catch {
      // Session storage can be unavailable in hardened browser contexts.
    }

    // Remove the bearer token from the visible URL immediately after capture.
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return token;
  }

  try {
    return sessionStorage.getItem(storageKey(orderId))?.trim() || '';
  } catch {
    return '';
  }
}
