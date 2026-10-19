import { FieldValue } from 'firebase-admin/firestore';

import { adminDb, adminMessaging } from '@/lib/firebaseAdmin';
import {
  buildOrderPushNotification,
  classifyFcmDelivery,
  splitPushTokenBatches,
} from '@/lib/orderPush';

const CLAIM_LEASE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type OrderPushEvent = {
  userId: string;
  orderNumber: string;
  status: string;
  statusRevision: number;
  url: string;
  state?: string;
  attempts?: number;
  leaseUntilMs?: number;
  nextAttemptAtMs?: number;
};

function retryAt(attempt: number) {
  const delay = Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.min(attempt, 8));
  return Date.now() + delay;
}

function errorText(error: unknown) {
  return (error instanceof Error ? error.message : String(error || 'Unknown FCM error')).slice(0, 500);
}

export async function dispatchOrderPushEvent(eventId: string) {
  const eventRef = adminDb.collection('orderPushEvents').doc(eventId);
  const now = Date.now();

  const claim = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists) return { state: 'missing' as const };

    const event = snapshot.data() as OrderPushEvent;
    if (event.state === 'sent' || event.state === 'no_tokens' || event.state === 'exhausted') {
      return { state: event.state as 'sent' | 'no_tokens' | 'exhausted' };
    }
    if (event.state === 'sending' && Number(event.leaseUntilMs || 0) > now) {
      return { state: 'in_progress' as const };
    }
    if (Number(event.attempts || 0) >= MAX_ATTEMPTS) {
      transaction.update(eventRef, { state: 'exhausted', leaseUntilMs: 0, updatedAt: FieldValue.serverTimestamp() });
      return { state: 'exhausted' as const };
    }
    if (
      event.state === 'failed' &&
      Number(event.nextAttemptAtMs || 0) > now
    ) {
      return { state: 'deferred' as const };
    }

    const attempts = Number(event.attempts || 0) + 1;
    transaction.update(eventRef, {
      state: 'sending',
      attempts,
      leaseUntilMs: now + CLAIM_LEASE_MS,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { state: 'claimed' as const, event: { ...event, attempts } };
  });

  if (claim.state !== 'claimed') return { status: claim.state };

  const event = claim.event;
  try {
    const tokenSnapshot = await adminDb.collection('pushNotificationTokens')
      .where('userId', '==', event.userId)
      .get();
    if (tokenSnapshot.empty) {
      await eventRef.update({
        state: 'no_tokens',
        leaseUntilMs: 0,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { status: 'no_tokens' as const };
    }

    const notification = buildOrderPushNotification(event.status, event.orderNumber);
    if (!notification) {
      await eventRef.update({
        state: 'exhausted',
        leaseUntilMs: 0,
        error: 'The event does not contain a supported status or public order number.',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { status: 'invalid_event' as const };
    }

    const deliveries = await Promise.all(tokenSnapshot.docs.map(async (tokenDocument) => {
      const deliveryRef = eventRef.collection('deliveries').doc(tokenDocument.id);
      const deliverySnapshot = await deliveryRef.get();
      if (!deliverySnapshot.exists) {
        await deliveryRef.create({
          tokenDocumentId: tokenDocument.id,
          state: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });
        return { tokenDocument, deliveryRef, state: 'pending' };
      }
      return { tokenDocument, deliveryRef, state: String(deliverySnapshot.data()?.state || 'pending') };
    }));

    const pending = deliveries.filter((delivery) => delivery.state !== 'sent' && delivery.state !== 'invalid');
    for (const batch of splitPushTokenBatches(pending)) {
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch.map((delivery) => String(delivery.tokenDocument.data().token || '')),
        data: {
          title: notification.title,
          body: notification.body,
          orderNumber: notification.orderNumber,
          status: notification.status,
          url: notification.url,
          eventId,
        },
        webpush: {
          headers: { Urgency: 'high', TTL: '86400' },
        },
      });

      await Promise.all(batch.map(async (delivery, itemIndex) => {
        const result = response.responses[itemIndex];
        const deliveryState = classifyFcmDelivery(result);
        if (deliveryState === 'sent') {
          await delivery.deliveryRef.set({
            state: 'sent',
            sentAt: FieldValue.serverTimestamp(),
            error: FieldValue.delete(),
          }, { merge: true });
          return;
        }

        const code = result.error?.code;
        if (deliveryState === 'invalid') {
          await Promise.all([
            delivery.tokenDocument.ref.delete(),
            delivery.deliveryRef.set({
              state: 'invalid',
              invalidatedAt: FieldValue.serverTimestamp(),
              errorCode: code,
            }, { merge: true }),
          ]);
          return;
        }

        await delivery.deliveryRef.set({
          state: 'failed',
          errorCode: code || 'messaging/unknown-error',
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }));
    }

    const deliveryStates = await eventRef.collection('deliveries').get();
    const failed = deliveryStates.docs.some((delivery) => delivery.data().state === 'failed');
    const remaining = deliveryStates.docs.some(
      (delivery) => delivery.data().state !== 'sent' && delivery.data().state !== 'invalid',
    );
    const finalState = failed || remaining ? 'failed' : 'sent';
    await eventRef.update({
      state: finalState,
      leaseUntilMs: 0,
      nextAttemptAtMs: finalState === 'failed' ? retryAt(event.attempts || 1) : null,
      completedAt: finalState === 'sent' ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      status: finalState,
      sent: deliveryStates.docs.filter((delivery) => delivery.data().state === 'sent').length,
      invalid: deliveryStates.docs.filter((delivery) => delivery.data().state === 'invalid').length,
    };
  } catch (error) {
    console.error('ORDER PUSH DELIVERY ERROR:', { eventId, error });
    await eventRef.set({
      state: 'failed',
      leaseUntilMs: 0,
      nextAttemptAtMs: retryAt(event.attempts || 1),
      lastError: errorText(error),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: 'failed' as const };
  }
}
