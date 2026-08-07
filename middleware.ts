import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) return NextResponse.next();

  const hasSessionCookie = Boolean(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Middleware performs the fast cookie-presence check. Every protected page
  // and API route performs full Firebase session and role verification in the
  // Node.js runtime before reading or changing privileged data.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
