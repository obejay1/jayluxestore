import { NextRequest, NextResponse } from 'next/server';

import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { hasAdminPermission } from '@/lib/adminPermissions';
import type {
  AdminActivityRecord,
  AdminPermission,
  AdminRole,
} from '@/lib/adminTypes';
import { adminDb } from '@/lib/firebaseAdmin';
import {
  getRequestBrowser,
  getRequestIp,
  hasTrustedRequestOrigin,
} from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function timestampToIso(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}


const CLIENT_AUDIT_PERMISSIONS: Record<string, AdminPermission> = {
  'Added Product': 'products',
  'Edited Product': 'products',
  'Deleted Product': 'products',
  'Added Category': 'categories',
  'Edited Category': 'categories',
  'Deleted Category': 'categories',
  'Added Bridal Package': 'products',
  'Edited Bridal Package': 'products',
  'Deleted Bridal Package': 'products',
  'Added Gallery Image': 'content',
  'Deleted Gallery Image': 'content',
  'Added Transformation': 'content',
  'Edited Transformation': 'content',
  'Deleted Transformation': 'content',
  'Added Testimonial': 'testimonials',
  'Edited Testimonial': 'testimonials',
  'Deleted Testimonial': 'testimonials',
  'Added Promotion': 'promotions',
  'Edited Promotion': 'promotions',
  'Deleted Promotion': 'promotions',
  'Processed Order': 'orders',
  'Updated Order Status': 'orders',
  'Processed Booking': 'bookings',
  'Deleted Booking': 'bookings',
  'Changed Settings': 'settings',
};

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > 5000) return {};
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession({ permission: 'activity' });

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(params.get('pageSize')) || 25));
    const search = clean(params.get('search'), 200).toLowerCase();
    const user = clean(params.get('user'), 200).toLowerCase();
    const role = clean(params.get('role'), 40).toLowerCase();
    const action = clean(params.get('action'), 120).toLowerCase();
    const from = params.get('from') ? new Date(`${params.get('from')}T00:00:00`) : null;
    const to = params.get('to') ? new Date(`${params.get('to')}T23:59:59.999`) : null;

    const snapshot = await adminDb
      .collection('adminActivity')
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    const all = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        actorUid: String(data.actorUid || ''),
        userName: String(data.userName || ''),
        email: String(data.email || ''),
        role: String(data.role || 'staff') as AdminRole,
        action: String(data.action || ''),
        description: String(data.description || ''),
        targetType: data.targetType ? String(data.targetType) : null,
        targetId: data.targetId ? String(data.targetId) : null,
        ipAddress: data.ipAddress ? String(data.ipAddress) : null,
        browser: data.browser ? String(data.browser) : null,
        createdAt: timestampToIso(data.createdAt),
      } satisfies AdminActivityRecord;
    });

    const filtered = all.filter((entry) => {
      const haystack = `${entry.userName} ${entry.email} ${entry.action} ${entry.description}`.toLowerCase();
      if (search && !haystack.includes(search)) return false;
      if (user && !`${entry.userName} ${entry.email}`.toLowerCase().includes(user)) return false;
      if (role && entry.role !== role) return false;
      if (action && entry.action.toLowerCase() !== action) return false;
      const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;
      return true;
    });

    const start = (page - 1) * pageSize;
    const records = filtered.slice(start, start + pageSize);
    const actions = Array.from(new Set(all.map((entry) => entry.action))).filter(Boolean).sort();
    const users = Array.from(
      new Map(
        all.map((entry) => [entry.actorUid, { uid: entry.actorUid, name: entry.userName, email: entry.email }]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({
      ok: true,
      records,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
      filters: { actions, users },
    });
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
    const session = await requireAdminSession();
    const body = (await request.json()) as Record<string, unknown>;
    const action = clean(body.action, 120);
    const description = clean(body.description, 1200);
    const requiredPermission = CLIENT_AUDIT_PERMISSIONS[action];

    if (!action || !description || !requiredPermission) {
      return NextResponse.json(
        { ok: false, message: 'A supported action and description are required.' },
        { status: 400 },
      );
    }

    if (!hasAdminPermission(session.user, requiredPermission)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Access Denied. You do not have permission to log this action.',
        },
        { status: 403 },
      );
    }

    await writeAdminActivity({
      actor: session.user,
      action,
      description,
      targetType: clean(body.targetType, 120) || null,
      targetId: clean(body.targetId, 240) || null,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
      metadata: safeMetadata(body.metadata),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
