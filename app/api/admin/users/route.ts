import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  requireAdminSession,
  serializeAdminProfile,
} from '@/lib/adminServerAuth';
import { normalizePermissions } from '@/lib/adminPermissions';
import {
  ADMIN_ROLES,
  type AdminRole,
  type AdminUserProfile,
} from '@/lib/adminTypes';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import {
  getRequestBrowser,
  getRequestIp,
  hasTrustedRequestOrigin,
} from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value: string) {
  return !value || /^\+[1-9]\d{7,14}$/.test(value);
}

function isRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

function isRecentlyOnline(profile: AdminUserProfile) {
  if (!profile.online || !profile.lastSeenAt) return false;
  return Date.now() - new Date(profile.lastSeenAt).getTime() <= 2 * 60 * 1000;
}

export async function GET() {
  try {
    await requireAdminSession({ roles: ['super_admin'] });

    const snapshot = await adminDb.collection('adminUsers').get();
    const profiles = snapshot.docs
      .map(serializeAdminProfile)
      .filter((profile): profile is AdminUserProfile => Boolean(profile));

    const authRecords = new Map<string, Awaited<ReturnType<typeof adminAuth.getUser>>>();
    for (let index = 0; index < profiles.length; index += 100) {
      const batch = profiles.slice(index, index + 100);
      const result = await adminAuth.getUsers(
        batch.map((profile) => ({ uid: profile.uid })),
      );
      result.users.forEach((record) => authRecords.set(record.uid, record));
    }

    const users = profiles
      .map((profile) => {
        const authRecord = authRecords.get(profile.uid);
        return {
          ...profile,
          online: isRecentlyOnline(profile),
          authCreatedAt: authRecord?.metadata.creationTime || null,
          authLastSignInAt: authRecord?.metadata.lastSignInTime || null,
          authDisabled: authRecord?.disabled ?? profile.status !== 'active',
        };
      })
      .sort((left, right) => {
        const leftDate = left.createdAt || left.authCreatedAt || '';
        const rightDate = right.createdAt || right.authCreatedAt || '';
        return rightDate.localeCompare(leftDate);
      });

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === 'active').length,
      onlineUsers: users.filter((user) => user.online).length,
      disabledUsers: users.filter((user) => user.status !== 'active').length,
      superAdmins: users.filter((user) => user.role === 'super_admin').length,
      admins: users.filter((user) => user.role === 'admin').length,
      staffMembers: users.filter((user) => user.role === 'staff').length,
    };

    return NextResponse.json(
      { ok: true, users, stats },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The request origin is not trusted.' },
      { status: 403 },
    );
  }

  try {
    const session = await requireAdminSession({ roles: ['super_admin'] });
    const body = (await request.json()) as Record<string, unknown>;

    const fullName = clean(body.fullName, 160);
    const email = clean(body.email, 200).toLowerCase();
    const password = clean(body.password, 128);
    const phoneNumber = clean(body.phoneNumber, 32);
    const roleValue = clean(body.role, 40);

    if (!fullName || !validEmail(email)) {
      return NextResponse.json(
        { ok: false, message: 'Enter a valid full name and email address.' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: 'Temporary passwords must contain at least 8 characters.' },
        { status: 400 },
      );
    }

    if (!validPhone(phoneNumber)) {
      return NextResponse.json(
        { ok: false, message: 'Phone numbers must use international format, for example +2348012345678.' },
        { status: 400 },
      );
    }

    if (!isRole(roleValue)) {
      return NextResponse.json(
        { ok: false, message: 'Select a valid administrator role.' },
        { status: 400 },
      );
    }

    const permissions = normalizePermissions(
      roleValue,
      Array.isArray(body.permissions)
        ? body.permissions.map((value) => String(value))
        : null,
    );

    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber: phoneNumber || undefined,
      disabled: false,
      emailVerified: false,
    });

    try {
      await adminAuth.setCustomUserClaims(authUser.uid, {
        admin: true,
        role: roleValue,
        permissions,
      });

      await adminDb.collection('adminUsers').doc(authUser.uid).set({
        uid: authUser.uid,
        fullName,
        email,
        emailLower: email,
        phoneNumber: phoneNumber || null,
        role: roleValue,
        status: 'active',
        permissions,
        online: false,
        loginCount: 0,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastSeenAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: session.user.uid,
        updatedBy: session.user.uid,
      });
    } catch (error) {
      await adminAuth.deleteUser(authUser.uid).catch(() => undefined);
      throw error;
    }

    await writeAdminActivity({
      actor: session.user,
      action: 'Created New User',
      description: `Created ${fullName} (${email}) with the ${roleValue.replace('_', ' ')} role.`,
      targetType: 'adminUser',
      targetId: authUser.uid,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
      metadata: { role: roleValue },
    });

    return NextResponse.json(
      {
        ok: true,
        message: `${fullName} can now sign in with the assigned email and temporary password.`,
        uid: authUser.uid,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('CREATE ADMIN USER ERROR:', error);
    const result = adminAuthErrorResponse(error);
    const firebaseMessage =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    if (firebaseMessage.includes('email-already-exists')) {
      return NextResponse.json(
        { ok: false, message: 'An account already uses this email address.' },
        { status: 409 },
      );
    }
    if (firebaseMessage.includes('phone-number-already-exists')) {
      return NextResponse.json(
        { ok: false, message: 'An account already uses this phone number.' },
        { status: 409 },
      );
    }

    return NextResponse.json(result.body, { status: result.status });
  }
}
