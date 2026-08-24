import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getBearerToken, getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    const customer = await getVerifiedCustomer(token);

    if (!customer?.uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { planId, orderId } = await request.json();

    if (!planId || !orderId) {
      return NextResponse.json({ error: 'Invalid installment request' }, { status: 400 });
    }

    const planSnap = await adminDb.collection('installmentPlans').doc(planId).get();

    if (!planSnap.exists) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 });
    }

    const plan = planSnap.data() || {};

    if (plan.userId !== customer.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const amount = Number(plan.nextPaymentAmount || plan.remainingBalance || 0);

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'No payment due' }, { status: 400 });
    }

    const reference = `JL-INSTALL-${randomUUID()}`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customer.email,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account/installments`,
        metadata: {
          type: 'installment',
          planId,
          orderId,
          userId: customer.uid,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 400 });
    }

    await adminDb.collection('installmentPayments').doc(reference).set({
      reference,
      planId,
      orderId,
      userId: customer.uid,
      amount,
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment error' },
      { status: 500 }
    );
  }
}
