import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { verifyResendWebhook } from '@/lib/email/service';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    subject?: string;
  };
};

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const id = request.headers.get('svix-id') || '';
  const timestamp = request.headers.get('svix-timestamp') || '';
  const signature = request.headers.get('svix-signature') || '';

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const verified = await verifyResendWebhook({ payload, id, timestamp, signature });
    const event = verified as ResendWebhookEvent;
    const emailId = String(event.data?.email_id || '').trim();
    const eventType = String(event.type || '').trim();

    const webhookRef = adminDb.collection('resendWebhookEvents').doc(createHash('sha256').update(id).digest('hex'));
    const existing = await webhookRef.get();
    if (existing.exists) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await webhookRef.set({
      svixId: id,
      type: eventType,
      resendMessageId: emailId || null,
      createdAt: event.created_at || null,
      receivedAt: FieldValue.serverTimestamp(),
    });

    if (emailId) {
      const matches = await adminDb.collection('emailEvents').where('resendMessageId', '==', emailId).limit(5).get();
      await Promise.all(matches.docs.map((doc) => doc.ref.set({
        providerStatus: eventType.replace(/^email\./, '') || 'unknown',
        providerEventAt: event.created_at || new Date().toISOString(),
        providerUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })));
    }

    if (eventType === 'email.bounced' || eventType === 'email.complained') {
      const recipients = Array.isArray(event.data?.to) ? event.data?.to : [];
      await Promise.all(recipients.map(async (recipient) => {
        const email = recipient.trim().toLowerCase();
        if (!email) return;
        const subscriberId = createHash('sha256').update(email).digest('hex');
        const ref = adminDb.collection('newsletterSubscribers').doc(subscriberId);
        const snapshot = await ref.get();
        if (!snapshot.exists) return;
        await ref.set({
          status: eventType === 'email.complained' ? 'complained' : 'bounced',
          marketingConsent: false,
          suppressionReason: eventType,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('RESEND WEBHOOK ERROR:', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
