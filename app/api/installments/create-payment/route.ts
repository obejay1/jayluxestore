import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';
import { normalizeInstallmentStatus } from '@/lib/installments/status';
import { calculateInitialInstallmentAmount, getInitialInstallmentPercentage, buildInstallmentAmounts } from '@/lib/installments/planMath';
import { normalizeNigerianPhone, getOpayRedirectUrl, type OpayCreatePaymentResponse } from '@/lib/payments/opay';

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
  const opayPublicKey = process.env.OPAY_PUBLIC_KEY?.trim();
  const merchantId = process.env.OPAY_MERCHANT_ID?.trim();
  const baseUrl = (process.env.OPAY_BASE_URL?.replace(/\/+$/, '') || 'https://api.opaycheckout.com');
  if (!opayPublicKey || !merchantId) {
    return NextResponse.json({ error: 'OPay is not configured.' }, { status: 503 });
  }

  try {
    const customer = await getVerifiedCustomer(request);
    const customerEmail = customer?.email?.trim().toLowerCase();

    if (!customer?.uid || !customerEmail) {
      return NextResponse.json({ error: 'Customer email is required to make this payment.' }, { status: 400 });
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

      const totalAmount = Number(plan.totalAmount || plan.totalInstallmentAmount || 0);
      const paidAmount = Number(plan.paidAmount || plan.amountPaid || 0);
      const remainingBalance = Math.max(0, totalAmount - paidAmount);
      const completedInstallments = Math.max(0, Math.trunc(Number(plan.completedInstallments || 0)));
      const installmentCount = Math.max(1, Math.trunc(Number(plan.installmentCount || 1)));

      const initialAmount = calculateInitialInstallmentAmount(totalAmount, plan, installmentCount);
      const scheduleAmounts = buildInstallmentAmounts(totalAmount, installmentCount, initialAmount);
      const currentDueAmount = completedInstallments === 0
        ? initialAmount
        : Number(plan.nextPaymentAmount || scheduleAmounts[completedInstallments] || remainingBalance);

      const amount = Math.min(remainingBalance, Math.max(0, currentDueAmount));

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
        provider: 'OPay',
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

    if (prepared instanceof NextResponse) {
      return prepared;
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL?.trim()
      || process.env.NEXT_PUBLIC_APP_URL?.trim()
      || new URL(request.url).origin
    ).replace(/\/$/, '');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/international/cashier/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opayPublicKey}`,
          MerchantId: merchantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: 'NG',
          reference,
          amount: {
            total: prepared.amountKobo,
            currency: 'NGN',
          },
          returnUrl: `${siteUrl}/account/installments`,
          callbackUrl: process.env.OPAY_CALLBACK_URL || `${siteUrl}/api/opay/webhook`,
          cancelUrl: `${siteUrl}/account/installments`,
          payMethod: 'OpayWalletNg',
          userInfo: {
            userId: customer.uid,
            userName: prepared.customerName,
            userMobile: normalizeNigerianPhone(customer.phone || ''),
            userEmail: prepared.customerEmail,
          },
          product: {
            name: 'JayLuxe Installment Payment',
            description: `Installment payment for ${prepared.orderId}`,
          },
        }),
        cache: 'no-store',
      });
    } catch (error) {
      await releasePaymentLock(planId, reference, 'initialization_failed');
      throw error;
    }

    const data = await response.json() as OpayCreatePaymentResponse;

    const authorizationUrl = getOpayRedirectUrl(data);

    if (!response.ok || !authorizationUrl) {
      await releasePaymentLock(planId, reference, 'initialization_failed');
      return NextResponse.json(
        { error: data.message || 'Unable to initialize OPay Wallet payment' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      authorizationUrl,
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
