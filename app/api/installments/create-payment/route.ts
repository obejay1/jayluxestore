import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';
import { normalizeInstallmentStatus } from '@/lib/installments/status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAYMENT_LOCK_MS = 30 * 60 * 1000;

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

async function releasePaymentLock(planId: string, reference: string, status: string) {
  const planRef = adminDb.collection('installmentPlans').doc(planId);
  const paymentRef = adminDb.collection('installmentPayments').doc(reference);

  await adminDb.runTransaction(async (transaction) => {
    const planSnap = await transaction.get(planRef);
    const plan = planSnap.data() || {};

    transaction.set(paymentRef, {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (plan.pendingPaymentReference === reference) {
      transaction.set(planRef, {
        pendingPaymentReference: FieldValue.delete(),
        pendingPaymentCreatedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
}

export async function POST(request: NextRequest) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!paystackSecret) {
    return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 });
  }

  try {
    const customer = await getVerifiedCustomer(request);
    if (!customer?.uid || !customer.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const planId = cleanText(body?.planId, 160);
    const suppliedOrderId = cleanText(body?.orderId, 160);

    if (!planId) {
      return NextResponse.json({ error: 'Invalid installment request' }, { status: 400 });
    }

    const reference = `JL-INSTALL-${randomUUID()}`;
    const planRef = adminDb.collection('installmentPlans').doc(planId);
    const paymentRef = adminDb.collection('installmentPayments').doc(reference);

    const prepared = await adminDb.runTransaction(async (transaction) => {
      const planSnap = await transaction.get(planRef);
      if (!planSnap.exists) {
        throw Object.assign(new Error('Installment plan not found'), { status: 404 });
      }

      const plan = planSnap.data() as Record<string, unknown>;
      if (String(plan.userId || '') !== customer.uid) {
        throw Object.assign(new Error('Unauthorized'), { status: 403 });
      }

      const orderId = String(plan.orderId || '').trim();
      if (!orderId || (suppliedOrderId && suppliedOrderId !== orderId)) {
        throw Object.assign(new Error('Installment order does not match this plan'), { status: 400 });
      }

      const status = normalizeInstallmentStatus(plan.status);
      if (['completed', 'cancelled', 'failed'].includes(status)) {
        throw Object.assign(new Error('This installment plan cannot accept another payment'), { status: 409 });
      }

      const remainingBalance = Math.max(
        0,
        Number(plan.remainingBalance ?? Number(plan.totalAmount || 0) - Number(plan.paidAmount || 0)),
      );
      const requestedAmount = Number(plan.nextPaymentAmount || remainingBalance);
      const amount = Math.min(remainingBalance, requestedAmount);

      if (!Number.isFinite(amount) || amount <= 0 || remainingBalance <= 0) {
        throw Object.assign(new Error('No payment due'), { status: 400 });
      }

      const pendingReference = String(plan.pendingPaymentReference || '').trim();
      const pendingCreatedAt = Date.parse(String(plan.pendingPaymentCreatedAt || ''));
      const pendingIsFresh = pendingReference
        && Number.isFinite(pendingCreatedAt)
        && Date.now() - pendingCreatedAt < PAYMENT_LOCK_MS;

      if (pendingIsFresh) {
        throw Object.assign(
          new Error('A payment is already in progress for this installment. Complete or retry it shortly.'),
          { status: 409 },
        );
      }

      const amountKobo = Math.round(amount * 100);
      const createdAt = new Date().toISOString();
      const customerName = String(plan.customerName || customer.name || 'JayLuxe Customer').trim();
      const customerEmail = customer.email?.trim().toLowerCase();

      if (!customerEmail) {
        return NextResponse.json(
          { error: "Customer email is required for installment payment" },
          { status: 400 },
        );
      }

      transaction.create(paymentRef, {
        reference,
        planId,
        orderId,
        userId: customer.uid,
        customerName,
        customerEmail,
        amount,
        expectedAmountKobo: amountKobo,
        currency: 'NGN',
        provider: 'Paystack',
        status: 'pending',
        createdAt,
      });

      transaction.set(planRef, {
        pendingPaymentReference: reference,
        pendingPaymentCreatedAt: createdAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { amount, amountKobo, orderId, customerName, customerEmail };
    });

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL?.trim()
      || process.env.NEXT_PUBLIC_APP_URL?.trim()
      || new URL(request.url).origin
    ).replace(/\/$/, '');

    let response: Response;
    try {
      response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: prepared.customerEmail,
          amount: prepared.amountKobo,
          currency: 'NGN',
          reference,
          callback_url: `${siteUrl}/account/installments`,
          metadata: {
            type: 'installment',
            planId,
            orderId: prepared.orderId,
            userId: customer.uid,
          },
        }),
        cache: 'no-store',
      });
    } catch (error) {
      await releasePaymentLock(planId, reference, 'initialization_failed');
      throw error;
    }

    const data = await response.json() as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      await releasePaymentLock(planId, reference, 'initialization_failed');
      return NextResponse.json(
        { error: data.message || 'Unable to initialize payment' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference,
    });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment error' },
      { status },
    );
  }
}
