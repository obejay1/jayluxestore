import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { sendPasswordResetEmailWithResend } from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 60 * 1000;

function cleanEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase().slice(0, 160);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
  }

  const email = cleanEmail(body.email);
  if (!validEmail(email)) {
    return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
  }

  const rateId = createHash('sha256').update(`${requestIp(request)}|${email}`).digest('hex');
  const rateRef = adminDb.collection('passwordResetRateLimits').doc(rateId);
  const nowMs = Date.now();

  try {
    const allowed = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(rateRef);
      const lastRequestedAtMs = Number(snapshot.data()?.lastRequestedAtMs || 0);
      if (lastRequestedAtMs && nowMs - lastRequestedAtMs < WINDOW_MS) return false;
      transaction.set(rateRef, {
        lastRequestedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });

    if (!allowed) {
      return NextResponse.json({
        ok: true,
        message: 'A reset link will be sent your gmail shortly.',
      });
    }

    try {
      await sendPasswordResetEmailWithResend(email);
    } catch (error) {
      // Do not disclose whether the email exists in Firebase Authentication.
      console.error('PASSWORD RESET EMAIL ERROR:', error);
    }

    return NextResponse.json({
      ok: true,
      message: 'A reset link will be sent to your gmail shortly.',
    });
  } catch (error) {
    console.error('PASSWORD RESET REQUEST ERROR:', error);
    return NextResponse.json({
      ok: true,
      message: 'A reset link will be sent to your gmail shortly.',
    });
  }
}
