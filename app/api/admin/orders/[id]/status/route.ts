import { NextRequest, NextResponse } from 'next/server';

import { adminAuthErrorResponse, requireAdminSession } from '@/lib/adminServerAuth';
import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { sendOrderStatusEmail } from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Ready for Shipment',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded',
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

type StatusPayload = {
  status?: unknown;
  courier?: unknown;
  trackingNumber?: unknown;
  trackingUrl?: unknown;
  estimatedDeliveryDate?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, message: 'The request origin is not trusted.' }, { status: 403 });
  }

  try {
    await requireAdminSession({ permission: 'orders' });
  } catch (error) {
    const response = adminAuthErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }

  const orderId = clean(id, 120);
  if (!orderId) {
    return NextResponse.json({ ok: false, message: 'Invalid order ID.' }, { status: 400 });
  }

  let body: StatusPayload;
  try {
    body = (await request.json()) as StatusPayload;
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid order status request.' }, { status: 400 });
  }

  const status = clean(body.status, 60);
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ ok: false, message: 'Unsupported order status.' }, { status: 400 });
  }

  const reference = adminDb.collection('orders').doc(orderId);
  try {
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return NextResponse.json({ ok: false, message: 'Order not found.' }, { status: 404 });
    }

    const current = { ...(snapshot.data() as Order), id: snapshot.id };
    if (current.status === status) {
      return NextResponse.json({ ok: true, unchanged: true, emailStatus: 'not_needed' });
    }

    const now = new Date().toISOString();
    const patch: Record<string, string> = {
      status,
      updatedAt: now,
    };

    const courier = clean(body.courier, 120);
    const trackingNumber = clean(body.trackingNumber, 160);
    const trackingUrl = clean(body.trackingUrl, 500);
    const estimatedDeliveryDate = clean(body.estimatedDeliveryDate, 120);

    if (courier) patch.courier = courier;
    if (trackingNumber) patch.trackingNumber = trackingNumber;
    if (trackingUrl) patch.trackingUrl = trackingUrl;
    if (estimatedDeliveryDate) patch.estimatedDeliveryDate = estimatedDeliveryDate;
    if (status === 'Delivered') patch.deliveredAt = now;
    if (status === 'Cancelled') patch.cancelledAt = now;
    if (status === 'Refunded') patch.refundedAt = now;

    await reference.set(patch, { merge: true });
    const updatedOrder = { ...current, ...patch } as Order;

    // The order state is authoritative. Email failure is logged but does not
    // roll back or hide a successful admin status change.
    let emailStatus = 'failed';
    let emailError: string | null = null;
    try {
      const emailResult = await sendOrderStatusEmail(updatedOrder, status);
      emailStatus = emailResult.status;
      emailError = emailResult.error || null;
    } catch (emailFailure) {
      emailError = emailFailure instanceof Error ? emailFailure.message : 'Email notification failed.';
      console.error('ORDER STATUS EMAIL ERROR:', emailFailure);
    }

    return NextResponse.json({
      ok: true,
      status,
      emailStatus,
      emailError,
    });
  } catch (error) {
    console.error('ADMIN ORDER STATUS ERROR:', error);
    return NextResponse.json({ ok: false, message: 'The order status could not be updated.' }, { status: 500 });
  }
}
