import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { buildInstallmentAmounts } from '@/lib/installments/planMath';
import { isSuccessfulPaymentStatus } from '@/lib/installments/status';

export class InstallmentSettlementError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'InstallmentSettlementError';
  }
}

type VerifiedPaystackPayment = {
  reference: string;
  status: string;
  amountKobo: number;
  currency?: string;
  email?: string;
  metadata?: Record<string, unknown> | null;
};

type SettlementResult = {
  duplicate: boolean;
  planId: string;
  amount: number;
  remaining: number;
  completed: boolean;
  customerEmail?: string;
  customerName?: string;
};

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function firestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      const date = toDate.call(value);
      return Number.isFinite(date.getTime()) ? date : null;
    }
  }
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function nextMonthlyDate(value: unknown): string | null {
  const current = firestoreDate(value);
  if (!current) return null;
  const next = new Date(current);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export async function settleVerifiedInstallmentPayment(
  verified: VerifiedPaystackPayment,
): Promise<SettlementResult> {
  if (!verified.reference || verified.status !== 'success') {
    throw new InstallmentSettlementError('The provider payment is not successful.', 402);
  }

  if (!Number.isInteger(verified.amountKobo) || verified.amountKobo <= 0) {
    throw new InstallmentSettlementError('The provider payment amount is invalid.');
  }

  const currency = String(verified.currency || 'NGN').toUpperCase();
  if (currency !== 'NGN') {
    throw new InstallmentSettlementError('Unexpected installment payment currency.');
  }

  const paymentRef = adminDb.collection('installmentPayments').doc(verified.reference);

  return adminDb.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    if (!paymentSnap.exists) {
      throw new InstallmentSettlementError('Installment payment record not found.', 404);
    }

    const payment = paymentSnap.data() as Record<string, unknown>;
    const planId = String(payment.planId || '').trim();
    if (!planId) {
      throw new InstallmentSettlementError('Installment payment is missing its plan reference.');
    }

    const planRef = adminDb.collection('installmentPlans').doc(planId);
    const planSnap = await transaction.get(planRef);
    if (!planSnap.exists) {
      throw new InstallmentSettlementError('Installment plan not found.', 404);
    }

    const plan = planSnap.data() as Record<string, unknown>;
    const expectedAmountKobo = Number(
      payment.expectedAmountKobo || Math.round(Number(payment.amount || 0) * 100),
    );

    if (!Number.isInteger(expectedAmountKobo) || expectedAmountKobo <= 0) {
      throw new InstallmentSettlementError('Stored installment amount is invalid.');
    }

    if (verified.amountKobo !== expectedAmountKobo) {
      throw new InstallmentSettlementError(
        'The verified payment amount does not match the installment due.',
      );
    }

    const storedCurrency = String(payment.currency || 'NGN').toUpperCase();
    if (storedCurrency !== currency) {
      throw new InstallmentSettlementError('The verified payment currency does not match the installment.');
    }

    const storedEmail = cleanEmail(payment.customerEmail || payment.email);
    const providerEmail = cleanEmail(verified.email);
    if (storedEmail && providerEmail && storedEmail !== providerEmail) {
      throw new InstallmentSettlementError('The verified payment email does not match the installment customer.');
    }

    const metadata = verified.metadata || {};
    const metadataPlanId = String(metadata.planId || '').trim();
    const metadataOrderId = String(metadata.orderId || '').trim();
    const metadataUserId = String(metadata.userId || '').trim();

    if (metadataPlanId && metadataPlanId !== planId) {
      throw new InstallmentSettlementError('The payment metadata does not match the installment plan.');
    }
    if (metadataOrderId && payment.orderId && metadataOrderId !== String(payment.orderId)) {
      throw new InstallmentSettlementError('The payment metadata does not match the installment order.');
    }
    if (metadataUserId && payment.userId && metadataUserId !== String(payment.userId)) {
      throw new InstallmentSettlementError('The payment metadata does not match the installment customer.');
    }
    if (plan.userId && payment.userId && String(plan.userId) !== String(payment.userId)) {
      throw new InstallmentSettlementError('The installment customer does not match the payment record.');
    }

    const totalAmount = Number(plan.totalAmount || plan.totalInstallmentAmount || 0);
    const paidAmount = Number(plan.paidAmount || plan.amountPaid || 0);
    const paymentAmount = expectedAmountKobo / 100;
    const remainingBefore = Math.max(0, totalAmount - paidAmount);

    if (isSuccessfulPaymentStatus(payment.status)) {
      return {
        duplicate: true,
        planId,
        amount: Number(payment.amount || paymentAmount),
        remaining: Number(payment.remainingBalance ?? remainingBefore),
        completed: Number(payment.remainingBalance ?? remainingBefore) === 0,
        customerEmail: storedEmail || undefined,
        customerName: String(payment.customerName || plan.customerName || '').trim() || undefined,
      };
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new InstallmentSettlementError('Installment financial state is invalid.');
    }

    // Never silently clamp an overpayment. Preserve the plan balance and flag
    // the payment for explicit reconciliation/refund instead.
    if (paymentAmount > remainingBefore) {
      throw new InstallmentSettlementError(
        'The verified payment exceeds the remaining installment balance.',
      );
    }

    const newPaid = paidAmount + paymentAmount;
    const remaining = Math.max(0, totalAmount - newPaid);
    const completedBefore = Math.max(0, Math.trunc(Number(plan.completedInstallments || 0)));
    const installmentCount = Math.max(1, Math.trunc(Number(plan.installmentCount || 1)));
    const completedAfter = Math.min(installmentCount, completedBefore + 1);
    const amounts = buildInstallmentAmounts(totalAmount, installmentCount);
    const nextPaymentAmount = remaining > 0
      ? Number(amounts[completedAfter] || Math.min(remaining, Math.ceil(remaining / Math.max(1, installmentCount - completedAfter))))
      : 0;
    const nextPaymentDate = remaining > 0 ? nextMonthlyDate(plan.nextPaymentDate) : null;

    const transactionRef = adminDb
      .collection('paymentTransactions')
      .doc(`Paystack_${verified.reference}`);
    const transactionSnap = await transaction.get(transactionRef);

    transaction.set(paymentRef, {
      status: 'successful',
      provider: 'Paystack',
      providerReference: verified.reference,
      providerAmountKobo: verified.amountKobo,
      currency,
      verifiedAt: FieldValue.serverTimestamp(),
      paidAmountAfter: newPaid,
      remainingBalance: remaining,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(planRef, {
      paidAmount: newPaid,
      amountPaid: newPaid,
      remainingBalance: remaining,
      completedInstallments: completedAfter,
      nextPaymentAmount,
      nextPaymentDate,
      nextInstallmentNumber: remaining > 0 ? completedAfter + 1 : null,
      status: remaining === 0 ? 'completed' : 'active',
      pendingPaymentReference: FieldValue.delete(),
      pendingPaymentCreatedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const scheduleRef = adminDb.collection('installmentSchedules').doc(`${planId}_${completedAfter}`);
    transaction.set(scheduleRef, {
      status: 'paid',
      paymentReference: verified.reference,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (!transactionSnap.exists) {
      transaction.create(transactionRef, {
        planId,
        paymentId: paymentRef.id,
        provider: 'Paystack',
        reference: verified.reference,
        amount: paymentAmount,
        status: 'successful',
        currency,
        idempotencyKey: `Paystack_${verified.reference}`,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      duplicate: false,
      planId,
      amount: paymentAmount,
      remaining,
      completed: remaining === 0,
      customerEmail: storedEmail || undefined,
      customerName: String(payment.customerName || plan.customerName || '').trim() || undefined,
    };
  });
}
