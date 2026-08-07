import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/lib/termii';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (process.env.TERMII_OTP_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Phone OTP is not enabled.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { phone?: unknown };
    const phone = String(body.phone ?? '').replace(/\s+/g, '');
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return NextResponse.json({ message: 'Enter a valid phone number.' }, { status: 400 });
    }

    const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `${address}:${phone}`;
    const now = Date.now();
    const current = attempts.get(key);
    const record = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + WINDOW_MS };

    if (record.count >= 4) {
      return NextResponse.json({ message: 'Too many OTP requests. Try again later.' }, { status: 429 });
    }

    attempts.set(key, { ...record, count: record.count + 1 });
    const data = await sendOTP({ phone });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ message: 'Failed to send OTP.' }, { status: 502 });
  }
}
