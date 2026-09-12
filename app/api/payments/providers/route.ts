import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const paystack = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
  const opay = Boolean(
    process.env.OPAY_PUBLIC_KEY?.trim()
    && process.env.OPAY_MERCHANT_ID?.trim()
    && process.env.OPAY_SECRET_KEY?.trim(),
  );

  return NextResponse.json({ paystack, opay }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
