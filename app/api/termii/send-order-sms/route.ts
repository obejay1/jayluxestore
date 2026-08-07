import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { orderConfirmationSMS, sendSMS } from '@/lib/termii';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatPhone(value: string) {
  const phone = value.replace(/[^\d+]/g, '');
  if (phone.startsWith('+234')) return phone.slice(1);
  if (phone.startsWith('0')) return `234${phone.slice(1)}`;
  return phone.replace(/^\+/, '');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown SMS error');
}

async function logSms(input: {
  orderId: string;
  recipientType: 'customer' | 'business';
  phone: string;
  event: string;
  message: string;
  status: 'sent' | 'failed';
  providerResponse?: unknown;
  error?: unknown;
}) {
  try {
    await adminDb.collection('smsLogs').add({
      provider: 'Termii',
      orderId: input.orderId,
      recipientType: input.recipientType,
      phone: input.phone,
      event: input.event,
      message: input.message,
      status: input.status,
      providerResponse: input.providerResponse || null,
      error: input.error ? errorMessage(input.error).slice(0, 800) : null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error('Termii SMS log write failed:', logError);
  }
}

async function sendAndLog(input: {
  orderId: string;
  recipientType: 'customer' | 'business';
  phone: string;
  event: string;
  message: string;
}) {
  try {
    const response = await sendSMS({
      phone: input.phone,
      message: input.message,
    });

    await logSms({
      ...input,
      status: 'sent',
      providerResponse: response,
    });

    return response;
  } catch (error) {
    await logSms({
      ...input,
      status: 'failed',
      error,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: unknown;
      accessToken?: unknown;
    };
    const orderId = String(body.orderId ?? '').trim();
    const accessToken = String(body.accessToken ?? '').trim();

    if (!orderId || !accessToken) {
      return NextResponse.json(
        { success: false, message: 'Order verification is required.' },
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
      confirmationSmsStatus?: string;
      businessSmsStatus?: string;
    };
    if (!order.accessToken || order.accessToken !== accessToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid order access token.' },
        { status: 403 },
      );
    }

    if (
      order.confirmationSmsStatus === 'sent' &&
      (order.businessSmsStatus === 'sent' ||
        order.businessSmsStatus === 'not-configured')
    ) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
        customerSmsSent: true,
        businessSmsSent: order.businessSmsStatus === 'sent',
      });
    }

    if (!order.customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Order phone number is missing.' },
        { status: 400 },
      );
    }

    const customerPhone = formatPhone(order.customerPhone);
    const customerMessage = orderConfirmationSMS(
      order.customerName || 'Customer',
      orderId,
    );

    const businessPhoneValue = process.env.TERMII_BUSINESS_PHONE?.trim();
    const businessPhone = businessPhoneValue ? formatPhone(businessPhoneValue) : '';
    const businessMessage = `New JayLuxe order ${orderId}. Customer: ${order.customerName || 'Customer'}. Total: NGN ${Number(order.total || 0).toLocaleString('en-NG')}. Open the admin dashboard to process it.`;

    const customerResult = await Promise.allSettled([
      sendAndLog({
        orderId,
        recipientType: 'customer',
        phone: customerPhone,
        event: 'order-placed',
        message: customerMessage,
      }),
    ]);

    const customerSent = customerResult[0].status === 'fulfilled';

    let businessSent: boolean | null = null;
    if (businessPhone) {
      const businessResult = await Promise.allSettled([
        sendAndLog({
          orderId,
          recipientType: 'business',
          phone: businessPhone,
          event: 'new-order-received',
          message: businessMessage,
        }),
      ]);
      businessSent = businessResult[0].status === 'fulfilled';
    }

    await snapshot.ref.set(
      {
        confirmationSmsStatus: customerSent ? 'sent' : 'failed',
        confirmationSmsSentAt: customerSent ? new Date().toISOString() : null,
        businessSmsStatus:
          businessSent === null ? 'not-configured' : businessSent ? 'sent' : 'failed',
        businessSmsSentAt: businessSent ? new Date().toISOString() : null,
        smsUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    if (!customerSent) {
      return NextResponse.json(
        {
          success: false,
          orderSaved: true,
          businessSmsSent: businessSent,
          message: 'Order saved, but the customer confirmation SMS could not be sent.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      customerSmsSent: true,
      businessSmsSent: businessSent,
      businessSmsConfigured: Boolean(businessPhone),
    });
  } catch (error) {
    console.error('Termii order SMS error:', error);
    return NextResponse.json(
      {
        success: false,
        orderSaved: true,
        message: 'Order saved, but the SMS notification service failed.',
      },
      { status: 502 },
    );
  }
}
