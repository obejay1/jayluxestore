import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import {
  normalizePermissions,
  hasAdminPermission,
} from '@/lib/adminPermissions';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import {
  ADMIN_ROLES,
  ADMIN_STATUSES,
  type AdminPermission,
  type AdminRole,
  type AdminSessionUser,
  type AdminStatus,
  type AdminUserProfile,
} from '@/lib/adminTypes';

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | 'UNAUTHENTICATED'
      | 'ACCESS_DENIED'
      | 'ACCOUNT_DISABLED'
      | 'PROFILE_MISSING',
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

function timestampToIso(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function isRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole);
}

function isStatus(value: unknown): value is AdminStatus {
  return (
    typeof value === 'string' &&
    ADMIN_STATUSES.includes(value as AdminStatus)
  );
}

export function serializeAdminProfile(
  snapshot: DocumentSnapshot,
): AdminUserProfile | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const role: AdminRole = isRole(data.role) ? data.role : 'staff';
  const status: AdminStatus = isStatus(data.status) ? data.status : 'disabled';

  return {
    uid: snapshot.id,
    fullName: String(data.fullName || data.name || '').trim() || 'JayLuxe User',
    email: String(data.email || '').trim(),
    emailLower: String(data.emailLower || data.email || '').trim().toLowerCase(),
    phoneNumber: data.phoneNumber ? String(data.phoneNumber) : null,
    role,
    status,
    permissions: normalizePermissions(
      role,
      Array.isArray(data.permissions) ? data.permissions : null,
    ),
    online: data.online === true,
    loginCount: Number.isFinite(Number(data.loginCount))
      ? Number(data.loginCount)
      : 0,
    lastLoginAt: timestampToIso(data.lastLoginAt),
    lastLogoutAt: timestampToIso(data.lastLogoutAt),
    lastSeenAt: timestampToIso(data.lastSeenAt),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    createdBy: data.createdBy ? String(data.createdBy) : null,
    updatedBy: data.updatedBy ? String(data.updatedBy) : null,
  };
}

export async function getAdminProfile(uid: string) {
  const snapshot = await adminDb.collection('adminUsers').doc(uid).get();
  return serializeAdminProfile(snapshot);
}

export async function verifyAdminSessionCookieValue(
  sessionCookie?: string | null,
  checkRevoked = true,
): Promise<{ token: DecodedIdToken; user: AdminSessionUser }> {
  if (!sessionCookie) {
    throw new AdminAuthError(
      'Authentication is required.',
      401,
      'UNAUTHENTICATED',
    );
  }

  let token: DecodedIdToken;
  try {
    token = await adminAuth.verifySessionCookie(sessionCookie, checkRevoked);
  } catch {
    throw new AdminAuthError(
      'Your administrator session has expired.',
      401,
      'UNAUTHENTICATED',
    );
  }

  const profile = await getAdminProfile(token.uid);
  if (!profile) {
    throw new AdminAuthError(
      'Your administrator profile could not be found.',
      403,
      'PROFILE_MISSING',
    );
  }

  if (profile.status !== 'active') {
    throw new AdminAuthError(
      'Your account has been disabled. Please contact the administrator.',
      403,
      'ACCOUNT_DISABLED',
    );
  }

  if (!token.admin || !isRole(token.role)) {
    throw new AdminAuthError(
      'Access Denied. You do not have permission to access this page.',
      403,
      'ACCESS_DENIED',
    );
  }

  return {
    token,
    user: {
      uid: profile.uid,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      permissions: profile.permissions,
    },
  };
}

export async function getCurrentAdminSession(checkRevoked = true) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionCookieValue(sessionCookie, checkRevoked);
}

export async function requireAdminSession(options?: {
  roles?: readonly AdminRole[];
  permission?: AdminPermission;
}) {
  const session = await getCurrentAdminSession(true);

  if (options?.roles && !options.roles.includes(session.user.role)) {
    throw new AdminAuthError(
      'Access Denied. You do not have permission to access this page.',
      403,
      'ACCESS_DENIED',
    );
  }

  if (
    options?.permission &&
    !hasAdminPermission(session.user, options.permission)
  ) {
    throw new AdminAuthError(
      'Access Denied. You do not have permission to access this page.',
      403,
      'ACCESS_DENIED',
    );
  }

  return session;
}

export function adminAuthErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, message: error.message },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'The administrator service could not complete the request.',
    },
  };
}
