import { NextRequest, NextResponse } from 'next/server';

import { sendOrderCreatedEmails } from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Backward-compatible order-email endpoint.
 * New checkouts trigger email workflows server-side in /api/orders, but this
 * route remains for older clients and safely reuses the same idempotent events.
 */
export async function POST(request: NextRequest) {
  let body: { orderId?: unknown; accessToken?: unknown };
  try {
    body = (await request.json()) as { orderId?: unknown; accessToken?: unknown };
  } catch {
    return NextResponse.json({ message: 'Invalid email request.' }, { status: 400 });
  }

  const orderId = String(body.orderId ?? '').trim();
  const accessToken = String(body.accessToken ?? '').trim();
  if (!orderId || !accessToken) {
    return NextResponse.json({ message: 'Order verification is required.' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb.collection('orders').doc(orderId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    const order = { ...(snapshot.data() as Order), id: snapshot.id };
    if (!order.accessToken || order.accessToken !== accessToken) {
      return NextResponse.json({ message: 'Invalid order access token.' }, { status: 403 });
    }

    const results = await sendOrderCreatedEmails(order);
    return NextResponse.json({ ok: true, results: results.map((result) => result.status) });
  } catch (error) {
    console.error('ORDER EMAIL RETRY ERROR:', error);
    return NextResponse.json({ message: 'The order is safe, but the email could not be sent right now.' }, { status: 502 });
  }
}
