import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TermiiWebhookPayload = {
  message_id?: unknown;
  messageId?: unknown;
  status?: unknown;
  phone_number?: unknown;
  to?: unknown;
};

function normalizeStatus(value: unknown): 'delivered' | 'failed' | 'sent' | 'pending' {
  const status = String(value ?? '').toLowerCase();

  if (status.includes('deliver')) return 'delivered';
  if (status.includes('fail') || status.includes('reject')) return 'failed';
  if (status.includes('send')) return 'sent';

  return 'pending';
}

function getMessageId(payload: TermiiWebhookPayload) {
  return String(payload.message_id ?? payload.messageId ?? '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TermiiWebhookPayload;
    const messageId = getMessageId(payload);
    const status = normalizeStatus(payload.status);

    if (!messageId) {
      return NextResponse.json(
        { success: false, message: 'Missing Termii message id.' },
        { status: 400 },
      );
    }

    const logs = await adminDb
      .collection('smsLogs')
      .where('provider', '==', 'Termii')
      .where('messageId', '==', messageId)
      .limit(1)
      .get();

    if (logs.empty) {
      return NextResponse.json({
        success: true,
        message: 'No matching SMS log found.',
      });
    }

    const log = logs.docs[0];

    await log.ref.set(
      {
        status,
        deliveryStatus: status,
        termiiWebhookPayload: payload,
        updatedAt: FieldValue.serverTimestamp(),
        ...(status === 'delivered'
          ? { deliveredAt: FieldValue.serverTimestamp() }
          : {}),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'Termii webhook error:',
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { success: false, message: 'Webhook processing failed.' },
      { status: 500 },
    );
  }
}
