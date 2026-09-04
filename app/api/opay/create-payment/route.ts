import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OPay is intentionally hard-disabled until a complete server-verified
// callback/webhook/order-reconciliation flow is implemented and sandbox-tested.
// Keeping this endpoint closed prevents a deployment flag from accidentally
// exposing the older client-trusting payment path.
export async function POST() {
  return NextResponse.json(
    { error: 'OPay is temporarily unavailable. Please use Paystack.' },
    { status: 503 },
  );
}
