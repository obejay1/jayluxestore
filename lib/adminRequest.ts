import type { NextRequest } from 'next/server';

import { getSiteUrl } from '@/lib/site';

export function getRequestIp(request: Request | NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    null
  );
}

export function getRequestBrowser(request: Request | NextRequest) {
  return request.headers.get('user-agent')?.trim().slice(0, 500) || null;
}

export function hasTrustedRequestOrigin(request: Request | NextRequest) {
  const origin = request.headers.get('origin')?.trim();
  if (!origin) return true;

  let originHost = '';
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  const requestHost = request.headers.get('host')?.trim().toLowerCase();
  const configuredHost = getSiteUrl().host.toLowerCase();
  const trustedHosts = new Set(
    [forwardedHost, requestHost, configuredHost, 'www.jayluxestore.com']
      .filter((host): host is string => Boolean(host)),
  );

  return trustedHosts.has(originHost);
}
