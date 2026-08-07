import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  getAdminProfile,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { normalizePermissions } from '@/lib/adminPermissions';
import {
  ADMIN_ROLES,
  ADMIN_STATUSES,
  type AdminRole,
  type AdminStatus,
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

function isRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

function isStatus(value: string): value is AdminStatus {
  return ADMIN_STATUSES.includes(value as AdminStatus);
}

async function activeSuperAdminCount(excludingUid?: string) {
  const snapshot = await adminDb.collection('adminUsers').get();
  return snapshot.docs.filter((document) => {
    if (document.id === excludingUid) return false;
    const data = document.data();
    return data.role === 'super_admin' && data.status === 'active';
  }).length;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { uid: string } },
) {
  try {
    await requireAdminSession({ roles: ['super_admin'] });
    const profile = await getAdminProfile(params.uid);
    if (!profile) {
      return NextResponse.json(
        { ok: false, message: 'Administrator account not found.' },
        { status: 404 },
      );
    }
    const authUser = await adminAuth.getUser(params.uid);
    return NextResponse.json({
      ok: true,
      user: {
        ...profile,
        authCreatedAt: authUser.metadata.creationTime || null,
        authLastSignInAt: authUser.metadata.lastSignInTime || null,
        authDisabled: authUser.disabled,
      },
    });
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } },
) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The request origin is not trusted.' },
      { status: 403 },
    );
  }

  try {
    const session = await requireAdminSession({ roles: ['super_admin'] });
    const current = await getAdminProfile(params.uid);
    if (!current) {
      return NextResponse.json(
        { ok: false, message: 'Administrator account not found.' },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fullName = clean(body.fullName ?? current.fullName, 160);
    const email = clean(body.email ?? current.email, 200).toLowerCase();
    const phoneNumber = clean(body.phoneNumber ?? current.phoneNumber ?? '', 32);
    const roleValue = clean(body.role ?? current.role, 40);
    const statusValue = clean(body.status ?? current.status, 40);

    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: 'Enter a valid full name and email address.' },
        { status: 400 },
      );
    }
    if (phoneNumber && !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return NextResponse.json(
        { ok: false, message: 'Phone numbers must use international format.' },
        { status: 400 },
      );
    }
    if (!isRole(roleValue) || !isStatus(statusValue)) {
      return NextResponse.json(
        { ok: false, message: 'Select a valid role and status.' },
        { status: 400 },
      );
    }

    if (
      params.uid === session.user.uid &&
      (roleValue !== 'super_admin' || statusValue !== 'active')
    ) {
      return NextResponse.json(
        { ok: false, message: 'You cannot demote or disable your own active Super Admin account.' },
        { status: 400 },
      );
    }

    if (
      current.role === 'super_admin' &&
      current.status === 'active' &&
      (roleValue !== 'super_admin' || statusValue !== 'active') &&
      (await activeSuperAdminCount(params.uid)) === 0
    ) {
      return NextResponse.json(
        { ok: false, message: 'At least one active Super Admin account must remain.' },
        { status: 400 },
      );
    }

    const permissions = normalizePermissions(
      roleValue,
      Array.isArray(body.permissions)
        ? body.permissions.map((value) => String(value))
        : current.permissions,
    );
    const disabled = statusValue !== 'active';
    const permissionsChanged =
      [...permissions].sort().join('|') !==
      [...current.permissions].sort().join('|');
    const authBefore = await adminAuth.getUser(params.uid);
    const previousClaims = authBefore.customClaims || {};

    try {
      await adminAuth.updateUser(params.uid, {
        displayName: fullName,
        email,
        phoneNumber: phoneNumber || null,
        disabled,
      });
      await adminAuth.setCustomUserClaims(params.uid, {
        ...previousClaims,
        admin: true,
        role: roleValue,
        permissions,
      });

      await adminDb.collection('adminUsers').doc(params.uid).set(
        {
          fullName,
          email,
          emailLower: email,
          phoneNumber: phoneNumber || null,
          role: roleValue,
          status: statusValue,
          permissions,
          online: disabled ? false : current.online,
          ...(disabled && current.status === 'active'
            ? { lastLogoutAt: FieldValue.serverTimestamp() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.user.uid,
        },
        { merge: true },
      );
    } catch (updateError) {
      await Promise.allSettled([
        adminAuth.updateUser(params.uid, {
          displayName: authBefore.displayName || null,
          email: authBefore.email,
          phoneNumber: authBefore.phoneNumber || null,
          disabled: authBefore.disabled,
        }),
        adminAuth.setCustomUserClaims(params.uid, previousClaims),
      ]);
      throw updateError;
    }

    if (
      disabled ||
      roleValue !== current.role ||
      permissionsChanged
    ) {
      await adminAuth.revokeRefreshTokens(params.uid).catch((revokeError) => {
        console.error('REVOKE ADMIN USER TOKENS ERROR:', revokeError);
      });
    }

    const statusAction =
      statusValue === 'active' && current.status !== 'active'
        ? 'Enabled User'
        : statusValue !== 'active' && current.status === 'active'
          ? 'Disabled User'
          : 'Edited User';

    await writeAdminActivity({
      actor: session.user,
      action: statusAction,
      description: `Updated ${fullName} (${email}). Role: ${roleValue.replace('_', ' ')}. Status: ${statusValue}.`,
      targetType: 'adminUser',
      targetId: params.uid,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
      metadata: { previousRole: current.role, role: roleValue, previousStatus: current.status, status: statusValue },
    });

    return NextResponse.json({ ok: true, message: 'The user account was updated.' });
  } catch (error) {
    console.error('UPDATE ADMIN USER ERROR:', error);
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (code.includes('email-already-exists')) {
      return NextResponse.json(
        { ok: false, message: 'Another account already uses this email address.' },
        { status: 409 },
      );
    }
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } },
) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The request origin is not trusted.' },
      { status: 403 },
    );
  }

  try {
    const session = await requireAdminSession({ roles: ['super_admin'] });
    if (params.uid === session.user.uid) {
      return NextResponse.json(
        { ok: false, message: 'You cannot delete your own account.' },
        { status: 400 },
      );
    }

    const current = await getAdminProfile(params.uid);
    if (!current) {
      return NextResponse.json(
        { ok: false, message: 'Administrator account not found.' },
        { status: 404 },
      );
    }

    if (
      current.role === 'super_admin' &&
      current.status === 'active' &&
      (await activeSuperAdminCount(params.uid)) === 0
    ) {
      return NextResponse.json(
        { ok: false, message: 'At least one active Super Admin account must remain.' },
        { status: 400 },
      );
    }

    await adminAuth.deleteUser(params.uid);
    await adminDb.collection('adminUsers').doc(params.uid).delete();

    await writeAdminActivity({
      actor: session.user,
      action: 'Deleted User',
      description: `Deleted ${current.fullName} (${current.email}) from Firebase Authentication and Firestore.`,
      targetType: 'adminUser',
      targetId: params.uid,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
      metadata: { role: current.role, status: current.status },
    });

    return NextResponse.json({ ok: true, message: 'The user account was deleted.' });
  } catch (error) {
    console.error('DELETE ADMIN USER ERROR:', error);
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
