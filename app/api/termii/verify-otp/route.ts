import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/termii';

export async function POST(request: NextRequest) {
  if (process.env.TERMII_OTP_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Phone OTP is not enabled.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { pinId?: unknown; pin?: unknown };
    const pinId = String(body.pinId ?? '').trim();
    const pin = String(body.pin ?? '').trim();

    if (!pinId || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ message: 'Invalid verification details.' }, { status: 400 });
    }

    const data = await verifyOTP({ pinId, pin });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ message: 'OTP verification failed.' }, { status: 502 });
  }
}
