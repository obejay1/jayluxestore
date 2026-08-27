import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

function verifyPaystackSignature(rawBody: string, signature: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) return false;

  const hash = createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!signature || !verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  const payload = JSON.parse(rawBody);
  const reference = payload?.data?.reference;

  if (!reference) {
    return NextResponse.json({ received: true });
  }

  const paymentRef = adminDb.collection('installmentPayments').doc(reference);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    return NextResponse.json({ received: true });
  }

  const existing:any = paymentSnap.data();
  if (existing.webhookProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await paymentRef.set(
    {
      webhookReceivedAt: new Date(),
      webhookEvent: payload?.event || null,
      webhookProcessed: true,
      provider: 'Paystack',
      providerReference: reference,
    },
    { merge: true }
  );

  return NextResponse.json({ received: true });
}
