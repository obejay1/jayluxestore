import { NextResponse } from 'next/server';
import { handlePaystackWebhook } from '@/lib/payments/paystackWebhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await handlePaystackWebhook(rawBody, request.headers.get('x-paystack-signature'));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('PAYSTACK_WEBHOOK_ERROR', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
