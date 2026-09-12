import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';
import {
  InstallmentSettlementError,
  settleVerifiedInstallmentPayment,
} from '@/lib/installments/settlement';
import {
  sendInstallmentCompletedEmail,
  sendInstallmentPaymentReceivedEmail,
} from '@/lib/email/workflows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let attemptedReference = '';
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!paystackSecret) {
    return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 });
  }

  try {
    const customer = await getVerifiedCustomer(request);
    if (!customer?.uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reference } = await request.json() as { reference?: unknown };
    const paymentReference = String(reference || '').trim();
    attemptedReference = paymentReference;
    if (!paymentReference) {
      return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
    }

    const paymentSnap = await adminDb.collection('installmentPayments').doc(paymentReference).get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const payment = paymentSnap.data() || {};
    if (String(payment.userId || '') !== customer.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (String(payment.provider || '') !== 'Paystack') {
      return NextResponse.json({ error: 'This payment reference is not a Paystack payment.' }, { status: 400 });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        cache: 'no-store',
      },
    );

    const result = await response.json() as {
      status?: boolean;
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        reference?: string;
        customer?: { email?: string };
        metadata?: Record<string, unknown>;
      };
    };

    if (!response.ok || !result.status || result.data?.status !== 'success') {
      return NextResponse.json({ verified: false }, { status: 402 });
    }

    if (result.data.reference && result.data.reference !== paymentReference) {
      return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 400 });
    }

    const settlement = await settleVerifiedInstallmentPayment({
      provider: 'Paystack',
      reference: paymentReference,
      status: result.data.status,
      amountKobo: Number(result.data.amount || 0),
      currency: result.data.currency,
      email: result.data.customer?.email,
      metadata: result.data.metadata,
    });

    if (!settlement.duplicate && settlement.customerEmail) {
      try {
        await sendInstallmentPaymentReceivedEmail({
          email: settlement.customerEmail,
          customerName: settlement.customerName || 'JayLuxe Customer',
          amount: settlement.amount,
          remaining: settlement.remaining,
          paymentId: paymentReference,
        });

        if (settlement.completed) {
          await sendInstallmentCompletedEmail({
            email: settlement.customerEmail,
            customerName: settlement.customerName || 'JayLuxe Customer',
            planId: settlement.planId,
          });
        }
      } catch (emailError) {
        console.error('Installment email notification failed', emailError);
      }
    }

    return NextResponse.json({
      verified: true,
      duplicate: settlement.duplicate,
      remainingBalance: settlement.remaining,
      completed: settlement.completed,
    });
  } catch (error) {
    if (error instanceof InstallmentSettlementError) {
      if (attemptedReference) {
        await adminDb.collection('installmentPayments').doc(attemptedReference).set({
          reconciliationRequired: true,
          reconciliationReason: error.message,
          lastVerificationAttemptAt: new Date().toISOString(),
        }, { merge: true }).catch(() => undefined);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('INSTALLMENT_VERIFICATION_ERROR', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
