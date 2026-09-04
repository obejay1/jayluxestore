import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  InstallmentSettlementError,
  settleVerifiedInstallmentPayment,
} from '@/lib/installments/settlement';
import {
  sendInstallmentCompletedEmail,
  sendInstallmentPaymentReceivedEmail,
} from '@/lib/email/workflows';

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !signature) return false;
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expectedBuffer = createHmac('sha512', secret).update(rawBody).digest();
  const suppliedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function handlePaystackWebhook(rawBody: string, signature: string | null) {
  if (!verifySignature(rawBody, signature)) {
    return { status: 401, body: { error: 'Invalid webhook signature' } };
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid webhook payload' } };
  }

  if (payload?.event !== 'charge.success') {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const data = payload?.data || {};
  const reference = String(data.reference || '').trim();
  if (!reference) return { status: 200, body: { received: true } };

  const installmentPayment = await adminDb.collection('installmentPayments').doc(reference).get();
  if (installmentPayment.exists) {
    try {
      const settlement = await settleVerifiedInstallmentPayment({
        reference,
        status: String(data.status || ''),
        amountKobo: Number(data.amount || 0),
        currency: data.currency,
        email: data.customer?.email,
        metadata: data.metadata,
      });

      if (!settlement.duplicate && settlement.customerEmail) {
        const emailJobs: Promise<unknown>[] = [
          sendInstallmentPaymentReceivedEmail({
            email: settlement.customerEmail,
            customerName: settlement.customerName || 'JayLuxe Customer',
            amount: settlement.amount,
            remaining: settlement.remaining,
            paymentId: reference,
          }),
        ];
        if (settlement.completed) {
          emailJobs.push(sendInstallmentCompletedEmail({
            email: settlement.customerEmail,
            customerName: settlement.customerName || 'JayLuxe Customer',
            planId: settlement.planId,
          }));
        }
        await Promise.allSettled(emailJobs);
      }

      return {
        status: 200,
        body: { received: true, installment: true, duplicate: settlement.duplicate },
      };
    } catch (error) {
      if (error instanceof InstallmentSettlementError) {
        await adminDb.collection('installmentPayments').doc(reference).set({
          reconciliationRequired: true,
          reconciliationReason: error.message,
          lastWebhookAt: new Date().toISOString(),
        }, { merge: true });
        return { status: 200, body: { received: true, reconciliationRequired: true } };
      }
      throw error;
    }
  }

  // Standard checkout payments originate in Paystack's inline client flow.
  // Persist an independent provider event so a successful payment is never
  // invisible if the browser closes before /api/orders finishes.
  const paymentReferenceId = createHash('sha256').update(reference).digest('hex');
  const linkedPayment = await adminDb.collection('paymentReferences').doc(paymentReferenceId).get();
  const linkedOrderId = linkedPayment.exists ? String(linkedPayment.data()?.orderId || '') : '';

  await adminDb.collection('paymentRecoveries').doc(paymentReferenceId).set({
    provider: 'Paystack',
    reference,
    amountKobo: Number(data.amount || 0),
    currency: String(data.currency || ''),
    customerEmail: String(data.customer?.email || '').trim().toLowerCase() || null,
    providerStatus: String(data.status || ''),
    status: linkedOrderId ? 'linked' : 'unmatched',
    orderId: linkedOrderId || null,
    receivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { status: 200, body: { received: true, linked: Boolean(linkedOrderId) } };
}
