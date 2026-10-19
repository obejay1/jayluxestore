import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { dispatchOrderPushEvent } from '@/lib/orderPushServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function hasValidCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET || '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const snapshot = await adminDb.collection('orderPushEvents')
      .where('state', 'in', ['pending', 'failed', 'sending'])
      .limit(40)
      .get();
    const dueEvents = snapshot.docs
      .filter((document) => {
        const event = document.data();
        return Number(event.nextAttemptAtMs || 0) <= now &&
          (event.state !== 'sending' || Number(event.leaseUntilMs || 0) <= now);
      })
      .slice(0, 20);

    const results = [];
    for (const document of dueEvents) {
      results.push(await dispatchOrderPushEvent(document.id));
    }

    return NextResponse.json(
      { ok: true, checked: dueEvents.length, results },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('ORDER PUSH CRON ERROR:', error);
    return NextResponse.json({ message: 'Order notifications could not be processed.' }, { status: 500 });
  }
}
