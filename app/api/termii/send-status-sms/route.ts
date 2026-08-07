import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminSessionCookieValue } from '@/lib/adminServerAuth';
import { hasAdminPermission } from '@/lib/adminPermissions';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import { adminDb } from '@/lib/firebaseAdmin';
import {
  deliveredSMS,
  processingSMS,
  sendSMS,
  shippedSMS,
} from '@/lib/termii';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED_STATUSES = [
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
] as const;

type SupportedStatus = (typeof SUPPORTED_STATUSES)[number];

function formatPhone(value: string) {
  const phone = value.replace(/[^\d+]/g, '');
  if (phone.startsWith('+234')) return phone.slice(1);
  if (phone.startsWith('0')) return `234${phone.slice(1)}`;
  return phone.replace(/^\+/, '');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown SMS error');
}

function createStatusMessage(status: SupportedStatus, customerName: string, orderId: string) {
  if (status === 'Processing') return processingSMS(customerName, orderId);
  if (status === 'Shipped') return shippedSMS(customerName, orderId);
  if (status === 'Delivered') return deliveredSMS(customerName, orderId);
  if (status === 'Packed') {
    return `Hi ${customerName}, your JayLuxe order ${orderId} has been packed and is being prepared for dispatch.`;
  }
  return `Hi ${customerName}, your JayLuxe order ${orderId} is out for delivery. Please keep your phone available.`;
}

export async function POST(request: NextRequest) {
  let authenticated = false;
  try {
    const session = await verifyAdminSessionCookieValue(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
      true,
    );
    authenticated = hasAdminPermission(session.user, 'orders');
  } catch {
    authenticated = false;
  }

  if (!authenticated) {
    return NextResponse.json(
      { success: false, message: 'Admin authentication required.' },
      { status: 401 },
    );
  }

  let orderId = '';
  let status = '';
  let phone = '';
  let message = '';

  try {
    const body = (await request.json()) as {
      orderId?: unknown;
      status?: unknown;
    };
    orderId = String(body.orderId ?? '').trim();
    status = String(body.status ?? '').trim();

    if (!orderId || !SUPPORTED_STATUSES.includes(status as SupportedStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid order status request.' },
        { status: 400 },
      );
    }

    const snapshot = await adminDb.collection('orders').doc(orderId).get();
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404 },
      );
    }

    const order = snapshot.data() as Order & {
      statusSmsLastStatus?: string;
      statusSmsStatus?: string;
    };

    if (
      order.statusSmsLastStatus === status &&
      order.statusSmsStatus === 'sent'
    ) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
      });
    }

    if (!order.customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Order phone number is missing.' },
        { status: 400 },
      );
    }

    const typedStatus = status as SupportedStatus;
    const customerName = order.customerName || 'Customer';
    phone = formatPhone(order.customerPhone);
    message = createStatusMessage(typedStatus, customerName, orderId);

    const data = await sendSMS({ phone, message });

    await Promise.all([
      snapshot.ref.set(
        {
          statusSmsLastStatus: typedStatus,
          statusSmsStatus: 'sent',
          statusSmsSentAt: new Date().toISOString(),
        },
        { merge: true },
      ),
      adminDb.collection('smsLogs').add({
        provider: 'Termii',
        orderId,
        recipientType: 'customer',
        phone,
        event: `order-status-${typedStatus.toLowerCase().replace(/\s+/g, '-')}`,
        orderStatus: typedStatus,
        message,
        status: 'sent',
        providerResponse: data || null,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Termii status SMS error:', error);

    if (orderId) {
      await Promise.allSettled([
        adminDb.collection('orders').doc(orderId).set(
          {
            statusSmsLastStatus: status || null,
            statusSmsStatus: 'failed',
            statusSmsError: errorMessage(error).slice(0, 800),
            statusSmsFailedAt: new Date().toISOString(),
          },
          { merge: true },
        ),
        adminDb.collection('smsLogs').add({
          provider: 'Termii',
          orderId,
          recipientType: 'customer',
          phone: phone || null,
          event: status
            ? `order-status-${status.toLowerCase().replace(/\s+/g, '-')}`
            : 'order-status-unknown',
          orderStatus: status || null,
          message: message || null,
          status: 'failed',
          error: errorMessage(error).slice(0, 800),
          createdAt: FieldValue.serverTimestamp(),
        }),
      ]);
    }

    return NextResponse.json(
      {
        success: false,
        message: 'The order was updated, but the status SMS could not be sent.',
      },
      { status: 502 },
    );
  }
}
