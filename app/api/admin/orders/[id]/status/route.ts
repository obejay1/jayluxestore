import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

import { adminAuthErrorResponse, requireAdminSession } from '@/lib/adminServerAuth';
import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { sendOrderStatusEmail } from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';
import { dispatchOrderPushEvent } from '@/lib/orderPushServer';
import { buildOrderPushNotification, isOrderStatusTransition } from '@/lib/orderPush';
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
    const now = new Date().toISOString();
    const courier = clean(body.courier, 120);
    const trackingNumber = clean(body.trackingNumber, 160);
    const trackingUrl = clean(body.trackingUrl, 500);
    const estimatedDeliveryDate = clean(body.estimatedDeliveryDate, 120);

    const transition = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return { notFound: true as const };

      const current = { ...(snapshot.data() as Order), id: snapshot.id };
      if (!isOrderStatusTransition(current.status, status)) return { unchanged: true as const };

      const patch: Record<string, string | number> = {
        status,
        updatedAt: now,
        statusRevision: Number(current.statusRevision || 0) + 1,
      };
      if (courier) patch.courier = courier;
      if (trackingNumber) patch.trackingNumber = trackingNumber;
      if (trackingUrl) patch.trackingUrl = trackingUrl;
      if (estimatedDeliveryDate) patch.estimatedDeliveryDate = estimatedDeliveryDate;
      if (status === 'Delivered') patch.deliveredAt = now;
      if (status === 'Cancelled') patch.cancelledAt = now;
      if (status === 'Refunded') patch.refundedAt = now;

      const orderNumber = String(current.orderNumber || '').trim();

      const updatedOrder = { ...current, ...patch, orderNumber } as Order;
      const notification = buildOrderPushNotification(status, orderNumber);
      let eventId: string | null = null;
      if (notification && current.userId) {
        eventId = createHash('sha256')
          .update(`${reference.path}:${patch.statusRevision}`)
          .digest('hex');
        transaction.create(adminDb.collection('orderPushEvents').doc(eventId), {
          userId: current.userId,
          orderNumber: notification.orderNumber,
          status: notification.status,
          statusRevision: patch.statusRevision,
          url: notification.url,
          state: 'pending',
          attempts: 0,
          nextAttemptAtMs: Date.now(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.update(reference, patch);
      return { updatedOrder, eventId };
    });

    if ('notFound' in transition) {
      return NextResponse.json({ ok: false, message: 'Order not found.' }, { status: 404 });
    }
    if ('unchanged' in transition) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        emailStatus: 'not_needed',
        pushStatus: 'not_needed',
      });
    }

    // The order state is authoritative. Email failure is logged but does not
    // roll back or hide a successful admin status change.
    let emailStatus = 'failed';
    let emailError: string | null = null;
    try {
      const emailResult = await sendOrderStatusEmail(transition.updatedOrder, status);
      emailStatus = emailResult.status;
      emailError = emailResult.error || null;
    } catch (emailFailure) {
      emailError = emailFailure instanceof Error ? emailFailure.message : 'Email notification failed.';
      console.error('ORDER STATUS EMAIL ERROR:', emailFailure);
    }

    let pushStatus = 'not_requested';
    if (transition.eventId) {
      try {
        const pushResult = await dispatchOrderPushEvent(transition.eventId);
        pushStatus = pushResult.status;
      } catch (pushFailure) {
        pushStatus = 'failed';
        console.error('ORDER STATUS PUSH ERROR:', pushFailure);
      }
    }

    return NextResponse.json({
      ok: true,
      status,
      emailStatus,
      emailError,
      pushStatus,
    });
  } catch (error) {
    console.error('ADMIN ORDER STATUS ERROR:', error);
    return NextResponse.json({ ok: false, message: 'The order status could not be updated.' }, { status: 500 });
  }
}
