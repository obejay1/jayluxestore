import { NextRequest, NextResponse } from 'next/server';

import { adminAuthErrorResponse, requireAdminSession } from '@/lib/adminServerAuth';
import { hasAdminPermission } from '@/lib/adminPermissions';
import { adminDb } from '@/lib/firebaseAdmin';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (!hasAdminPermission(session.user, 'orders') && !hasAdminPermission(session.user, 'reports')) {
      return NextResponse.json(
        { ok: false, message: 'You do not have permission to view orders.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  } catch (error) {
    const response = adminAuthErrorResponse(error);
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const snapshot = await adminDb.collection('orders').get();

    const orders = snapshot.docs
      .map((document) => ({
        ...(document.data() as Order),
        id: document.id,
      }))
      .sort((left, right) => {
        const leftTime = Date.parse(String(left.createdAt || ''));
        const rightTime = Date.parse(String(right.createdAt || ''));
        return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      });

    return NextResponse.json(
      { ok: true, orders },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('ADMIN ORDERS GET ERROR:', error);
    return NextResponse.json(
      { ok: false, message: 'Orders could not be loaded.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
