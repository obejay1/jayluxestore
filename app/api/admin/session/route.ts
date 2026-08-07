import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  getAdminProfile,
  verifyAdminSessionCookieValue,
} from '@/lib/adminServerAuth';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from '@/lib/adminSession';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import {
  getRequestBrowser,
  getRequestIp,
  hasTrustedRequestOrigin,
} from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUTH_AGE_SECONDS = 5 * 60;

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await verifyAdminSessionCookieValue(sessionCookie, true);

    return NextResponse.json(
      { ok: true, authenticated: true, user: session.user },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    const response = NextResponse.json(
      { ...result.body, authenticated: false },
      { status: result.status, headers: { 'Cache-Control': 'no-store' } },
    );
    clearSessionCookie(response);
    return response;
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The sign-in request origin is not trusted.' },
      { status: 403 },
    );
  }

  let body: { idToken?: unknown };
  try {
    body = (await request.json()) as { idToken?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid sign-in request.' },
      { status: 400 },
    );
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return NextResponse.json(
      { ok: false, message: 'A Firebase ID token is required.' },
      { status: 400 },
    );
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      !decoded.auth_time ||
      nowSeconds - decoded.auth_time > MAX_AUTH_AGE_SECONDS
    ) {
      return NextResponse.json(
        { ok: false, message: 'Please sign in again to create a secure session.' },
        { status: 401 },
      );
    }

    const [profile, authUser] = await Promise.all([
      getAdminProfile(decoded.uid),
      adminAuth.getUser(decoded.uid),
    ]);

    if (!profile || !decoded.admin) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Access Denied. You do not have permission to access this page.',
        },
        { status: 403 },
      );
    }

    if (profile.status !== 'active' || authUser.disabled) {
      await adminAuth.revokeRefreshTokens(decoded.uid).catch(() => undefined);
      return NextResponse.json(
        {
          ok: false,
          code: 'ACCOUNT_DISABLED',
          message:
            'Your account has been disabled. Please contact the administrator.',
        },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE * 1000,
    });

    const profileRef = adminDb.collection('adminUsers').doc(decoded.uid);
    await adminDb.runTransaction(async (transaction) => {
      transaction.set(
        profileRef,
        {
          online: true,
          lastLoginAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          loginCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    await writeAdminActivity({
      actor: {
        uid: profile.uid,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        permissions: profile.permissions,
      },
      action: 'Logged In',
      description: 'Signed in to the JayLuxe administration area.',
      targetType: 'adminUser',
      targetId: profile.uid,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        uid: profile.uid,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        permissions: profile.permissions,
      },
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('ADMIN SESSION CREATE ERROR:', error);
    return NextResponse.json(
      { ok: false, message: 'The administrator session could not be created.' },
      { status: 401 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The sign-out request origin is not trusted.' },
      { status: 403 },
    );
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (sessionCookie) {
    try {
      const session = await verifyAdminSessionCookieValue(sessionCookie, false);
      await Promise.all([
        adminDb.collection('adminUsers').doc(session.user.uid).set(
          {
            online: false,
            lastLogoutAt: FieldValue.serverTimestamp(),
            lastSeenAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        writeAdminActivity({
          actor: session.user,
          action: 'Logged Out',
          description: 'Signed out of the JayLuxe administration area.',
          targetType: 'adminUser',
          targetId: session.user.uid,
          ipAddress: getRequestIp(request),
          browser: getRequestBrowser(request),
        }),
      ]);
    } catch {
      // Always clear the browser cookie, even when the session is already invalid.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
