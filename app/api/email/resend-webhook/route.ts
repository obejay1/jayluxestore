import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { verifyResendWebhook } from '@/lib/email/service';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEBHOOK_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const TRACKED_EMAIL_EVENTS = new Set([
  'email.sent',
  'email.scheduled',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.failed',
  'email.complained',
  'email.suppressed',
]);

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: Record<string, unknown> & {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
  };
};

function stringValue(value: unknown, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function jsonDetail(value: unknown) {
  if (value == null) return null;
  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return String(value).slice(0, 4000);
  }
}

function deliveryStatus(eventType: string) {
  return eventType.startsWith('email.')
    ? eventType.slice('email.'.length)
    : eventType || 'unknown';
}

export async function POST(request: NextRequest) {
  // Resend signatures are calculated over the raw request body. Do not call
  // request.json() before verification.
  const payload = await request.text();
  const id = request.headers.get('svix-id') || '';
  const timestamp = request.headers.get('svix-timestamp') || '';
  const signature = request.headers.get('svix-signature') || '';

  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { ok: false, message: 'Missing webhook signature headers.' },
      { status: 400 },
    );
  }

  let event: ResendWebhookEvent;
  try {
    const verified = await verifyResendWebhook({ payload, id, timestamp, signature });
    event = verified as ResendWebhookEvent;
  } catch (error) {
    console.error('RESEND WEBHOOK SIGNATURE ERROR:', error);
    return NextResponse.json(
      { ok: false, message: 'Invalid webhook signature.' },
      { status: 401 },
    );
  }

  const webhookDocId = createHash('sha256').update(id).digest('hex');
  const webhookRef = adminDb.collection('resendWebhookEvents').doc(webhookDocId);
  const nowMs = Date.now();

  try {
    const claim = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(webhookRef);
      const data = snapshot.data() || {};
      const status = String(data.status || '');
      const updatedAtMs = Number(data.updatedAtMs || 0);

      if (status === 'processed') return 'duplicate' as const;
      if (
        status === 'processing' &&
        updatedAtMs > 0 &&
        nowMs - updatedAtMs < WEBHOOK_CLAIM_TIMEOUT_MS
      ) {
        return 'in_progress' as const;
      }

      transaction.set(
        webhookRef,
        {
          svixId: id,
          status: 'processing',
          attempts: Number(data.attempts || 0) + 1,
          payloadHash: createHash('sha256').update(payload).digest('hex'),
          receivedAt: data.receivedAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMs: nowMs,
          error: null,
        },
        { merge: true },
      );

      return 'claimed' as const;
    });

    if (claim === 'duplicate' || claim === 'in_progress') {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const eventType = stringValue(event.type, 120);
    const emailId = stringValue(event.data?.email_id, 240);
    const recipients = Array.isArray(event.data?.to)
      ? event.data.to.map((value) => stringValue(value, 320).toLowerCase()).filter(Boolean)
      : [];
    const status = deliveryStatus(eventType);
    const eventAt = stringValue(event.created_at, 120) || new Date().toISOString();
    const bounceInfo = jsonDetail(event.data?.bounce);
    const providerError =
      jsonDetail(event.data?.failed) ||
      jsonDetail(event.data?.error) ||
      jsonDetail(event.data?.reason) ||
      jsonDetail(event.data?.response) ||
      jsonDetail(event.data?.suppressed);

    const matchingEvents = emailId
      ? await adminDb
          .collection('emailEvents')
          .where('resendMessageId', '==', emailId)
          .limit(10)
          .get()
      : null;

    if (matchingEvents && !matchingEvents.empty) {
      await Promise.all(
        matchingEvents.docs.map(async (emailEventDoc) => {
          const orderId = stringValue(emailEventDoc.data().orderId, 160);
          let acceptedProviderUpdate = false;

          // Resend does not guarantee webhook delivery order. Only let a newer
          // provider event replace the current delivery state for this email.
          await adminDb.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(emailEventDoc.ref);
            const current = currentSnapshot.data() || {};
            const previousAt = Date.parse(stringValue(current.providerEventAt, 120));
            const incomingAt = Date.parse(eventAt);
            const incomingIsNewer =
              !Number.isFinite(previousAt) ||
              !Number.isFinite(incomingAt) ||
              incomingAt >= previousAt;

            if (!incomingIsNewer) return;

            acceptedProviderUpdate = true;
            transaction.set(
              emailEventDoc.ref,
              {
                providerStatus: status,
                deliveryStatus: status,
                providerEventAt: eventAt,
                providerUpdatedAt: FieldValue.serverTimestamp(),
                lastWebhookEventId: id,
                lastWebhookEventType: eventType,
                bounceInfo,
                providerError,
              },
              { merge: true },
            );
          });

          if (orderId && acceptedProviderUpdate) {
            await adminDb.collection('orders').doc(orderId).set(
              {
                lastEmailDeliveryStatus: status,
                lastEmailProviderEvent: eventType,
                lastEmailProviderEventAt: eventAt,
                lastEmailProviderUpdatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }
        }),
      );
    }

    if (
      eventType === 'email.bounced' ||
      eventType === 'email.complained' ||
      eventType === 'email.suppressed'
    ) {
      await Promise.all(
        recipients.map(async (email) => {
          const subscriberId = createHash('sha256').update(email).digest('hex');
          const ref = adminDb.collection('newsletterSubscribers').doc(subscriberId);
          const snapshot = await ref.get();
          if (!snapshot.exists) return;
          await ref.set(
            {
              status: eventType === 'email.complained' ? 'complained' : eventType === 'email.suppressed' ? 'suppressed' : 'bounced',
              marketingConsent: false,
              suppressionReason: eventType,
              suppressedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }),
      );
    }

    await webhookRef.set(
      {
        status: 'processed',
        type: eventType || 'unknown',
        tracked: TRACKED_EMAIL_EVENTS.has(eventType),
        resendMessageId: emailId || null,
        recipients,
        sender: stringValue(event.data?.from, 320) || null,
        subject: stringValue(event.data?.subject, 500) || null,
        eventCreatedAt: event.created_at || null,
        deliveryStatus: status,
        bounceInfo,
        providerError,
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
        error: null,
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('RESEND WEBHOOK PROCESSING ERROR:', error);
    await webhookRef
      .set(
        {
          status: 'failed',
          error: error instanceof Error ? error.message.slice(0, 1000) : 'Webhook processing failed.',
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMs: Date.now(),
        },
        { merge: true },
      )
      .catch(() => undefined);

    // Non-2xx makes Resend retry the verified event instead of silently losing it.
    return NextResponse.json(
      { ok: false, message: 'Webhook processing failed.' },
      { status: 500 },
    );
  }
}
