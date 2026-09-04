import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminSessionCookieValue } from '@/lib/adminServerAuth';
import { hasAdminPermission } from '@/lib/adminPermissions';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeOrder(order: Order) {
  const { accessToken: _accessToken, ...safe } = order;
  return safe;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orderId = id?.trim();
  if (!orderId || orderId.length > 120) {
    return NextResponse.json({ message: 'Invalid order ID.' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb.collection('orders').doc(orderId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    const order = { ...(snapshot.data() as Order), id: snapshot.id };
    const suppliedAccessToken = request.nextUrl.searchParams.get('token');
    const customer = await getVerifiedCustomer(request);
    let adminSession = false;
    try {
      const session = await verifyAdminSessionCookieValue(
        request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
        true,
      );
      adminSession = hasAdminPermission(session.user, 'orders');
    } catch {
      adminSession = false;
    }

    const emailMatches = Boolean(
      customer?.email &&
        order.customerEmail &&
        customer.email.trim().toLowerCase() ===
          order.customerEmail.trim().toLowerCase(),
    );
    const customerOwnsOrder = Boolean(
      customer && (order.userId === customer.uid || emailMatches),
    );
    const accessTokenMatches = Boolean(
      suppliedAccessToken &&
        order.accessToken &&
        suppliedAccessToken === order.accessToken,
    );

    if (!adminSession && !customerOwnsOrder && !accessTokenMatches) {
      return NextResponse.json(
        { message: 'You do not have permission to view this order.' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { order: safeOrder(order) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('ORDER LOOKUP ERROR:', error);
    return NextResponse.json(
      { message: 'The order could not be loaded.' },
      { status: 500 },
    );
  }
}
