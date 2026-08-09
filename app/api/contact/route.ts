import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

import { sendContactEmails } from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

const ALLOWED_SUBJECTS = new Set([
  'Product enquiry',
  'Order support',
  'Delivery',
  'Service booking',
  'Bridal package',
  'Other enquiry',
]);

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createDuplicateKey(email: string, subject: string, message: string) {
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256')
    .update(`${email}|${subject.toLowerCase()}|${normalizedMessage}`)
    .digest('hex');
}

function requestIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, message: 'Please submit a valid contact request.' }, { status: 400 });
  }

  // Honeypot: acknowledge silently so bots do not learn the trap.
  if (cleanText(body.website, 200)) {
    return NextResponse.json({ ok: true, message: 'Thank you. Your message has been received.' });
  }

  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 160).toLowerCase();
  const phone = cleanText(body.phone, 40);
  const requestedSubject = cleanText(body.subject, 80);
  const subject = ALLOWED_SUBJECTS.has(requestedSubject) ? requestedSubject : 'Other enquiry';
  const message = cleanText(body.message, 5000);

  if (name.length < 2) {
    return NextResponse.json({ ok: false, message: 'Please enter your full name.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ ok: false, message: 'Please enter a message with at least 10 characters.' }, { status: 400 });
  }

  const nowMs = Date.now();
  const duplicateKey = createDuplicateKey(email, subject, message);
  const duplicateReference = adminDb.collection('contactMessageDedup').doc(duplicateKey);
  const rateKey = createHash('sha256').update(requestIp(request)).digest('hex');
  const rateReference = adminDb.collection('contactRateLimits').doc(rateKey);
  const messageReference = adminDb.collection('contactMessages').doc();

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const [duplicateSnapshot, rateSnapshot] = await Promise.all([
        transaction.get(duplicateReference),
        transaction.get(rateReference),
      ]);

      const previousCreatedAtMs = Number(duplicateSnapshot.data()?.createdAtMs || 0);
      if (duplicateSnapshot.exists && previousCreatedAtMs > 0 && nowMs - previousCreatedAtMs < DUPLICATE_WINDOW_MS) {
        return 'duplicate' as const;
      }

      const rateData = rateSnapshot.data() || {};
      const windowStartedAtMs = Number(rateData.windowStartedAtMs || 0);
      const inCurrentWindow = windowStartedAtMs > 0 && nowMs - windowStartedAtMs < RATE_WINDOW_MS;
      const count = inCurrentWindow ? Number(rateData.count || 0) : 0;
      if (count >= RATE_LIMIT) return 'rate_limited' as const;

      transaction.set(messageReference, {
        name,
        email,
        phone,
        subject,
        message,
        status: 'new',
        source: 'website-contact-form',
        emailStatus: 'pending',
        duplicateKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(duplicateReference, {
        messageId: messageReference.id,
        createdAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(rateReference, {
        count: count + 1,
        windowStartedAtMs: inCurrentWindow ? windowStartedAtMs : nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return 'saved' as const;
    });

    if (result === 'duplicate') {
      return NextResponse.json({ ok: false, duplicate: true, message: 'This message was already submitted recently. Please wait a few minutes before sending it again.' }, { status: 409 });
    }
    if (result === 'rate_limited') {
      return NextResponse.json({ ok: false, message: 'Too many messages were submitted from this connection. Please wait a few minutes and try again.' }, { status: 429 });
    }

    const { adminResult, customerResult } = await sendContactEmails({
      id: messageReference.id,
      name,
      email,
      phone,
      subject,
      message,
    });

    const emailSent = adminResult.ok && customerResult.ok;
    await messageReference.set({
      emailStatus: emailSent ? 'sent' : 'partial_or_failed',
      adminEmailStatus: adminResult.status,
      adminResendEmailId: adminResult.resendId || null,
      adminEmailError: adminResult.error || null,
      acknowledgementEmailStatus: customerResult.status,
      acknowledgementResendEmailId: customerResult.resendId || null,
      acknowledgementEmailError: customerResult.error || null,
      emailedAt: emailSent ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      saved: true,
      emailSent,
      message: emailSent
        ? 'Thank you. We received your message and sent a confirmation to your email.'
        : 'Thank you. Your message was saved successfully. Our email notification service is temporarily unavailable.',
    });
  } catch (error) {
    console.error('CONTACT FORM ERROR:', error);
    return NextResponse.json({ ok: false, message: 'Your message could not be saved. Please try again.' }, { status: 500 });
  }
}
