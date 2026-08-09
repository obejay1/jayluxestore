import { NextRequest, NextResponse } from 'next/server';

import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { adminAuthErrorResponse, requireAdminSession } from '@/lib/adminServerAuth';
import {
  sendOrderCreatedEmails,
  sendOrderStatusEmail,
  sendPaymentConfirmedEmails,
} from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, message: 'The request origin is not trusted.' }, { status: 403 });
  }

  try {
    await requireAdminSession({ permission: 'orders' });
  } catch (error) {
    const response = adminAuthErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }

  const orderId = String(params.id || '').trim();
  if (!orderId) return NextResponse.json({ ok: false, message: 'Invalid order ID.' }, { status: 400 });

  try {
    const snapshot = await adminDb.collection('orders').doc(orderId).get();
    if (!snapshot.exists) return NextResponse.json({ ok: false, message: 'Order not found.' }, { status: 404 });
    const order = { ...(snapshot.data() as Order), id: snapshot.id };

    const results = await Promise.all([
      sendOrderCreatedEmails(order),
      sendPaymentConfirmedEmails(order),
      order.status ? sendOrderStatusEmail(order, order.status) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ok: true,
      message: 'Email retry completed. Already-sent events were skipped automatically.',
      results,
    });
  } catch (error) {
    console.error('ADMIN EMAIL RETRY ERROR:', error);
    return NextResponse.json({ ok: false, message: 'The email retry could not be completed.' }, { status: 500 });
  }
}
