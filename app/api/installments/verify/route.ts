import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendInstallmentPaymentReceivedEmail, sendInstallmentCompletedEmail } from '@/lib/email/workflows';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
    }

    const paymentRef = adminDb.collection('installmentPayments').doc(reference);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const payment = paymentSnap.data()!;

    if (payment.status === 'success') {
      return NextResponse.json({ verified: true, duplicate: true });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const result = await response.json();

    if (!result.status || result.data?.status !== 'success') {
      await paymentRef.set({
        status: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return NextResponse.json({ verified: false });
    }

    await adminDb.runTransaction(async (transaction) => {
      const planRef = adminDb.collection('installmentPlans').doc(payment.planId);
      const planSnap = await transaction.get(planRef);

      if (!planSnap.exists) {
        throw new Error('Installment plan not found');
      }

      const plan = planSnap.data()!;
      const newPaid = Math.min(
        Number(plan.totalAmount || 0),
        Number(plan.paidAmount || 0) + Number(payment.amount || 0)
      );

      const remaining = Math.max(
        Number(plan.totalAmount || 0) - newPaid,
        0
      );

      transaction.set(paymentRef, {
        status: 'success',
        verifiedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(planRef, {
        paidAmount: newPaid,
        remainingBalance: remaining,
        status: remaining === 0 ? 'completed' : 'active',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    try {
      const customer = payment.email || payment.customerEmail;
      if (customer) {
        await sendInstallmentPaymentReceivedEmail({
          email: customer,
          customerName: payment.customerName || 'JayLuxe Customer',
          amount: Number(payment.amount || 0),
          remaining: Number(payment.remainingBalance || 0),
          paymentId: reference,
        });

        if (Number(payment.remainingBalance || 0) === 0) {
          await sendInstallmentCompletedEmail({
            email: customer,
            customerName: payment.customerName || 'JayLuxe Customer',
            planId: payment.planId,
          });
        }
      }
    } catch (emailError) {
      console.error('Installment email notification failed', emailError);
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
