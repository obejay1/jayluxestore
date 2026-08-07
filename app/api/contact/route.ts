import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import { OFFICIAL_EMAIL } from '@/lib/contact';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

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
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createDuplicateKey(email: string, subject: string, message: string) {
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256')
    .update(`${email}|${subject.toLowerCase()}|${normalizedMessage}`)
    .digest('hex');
}

export async function POST(request: Request) {
  let messageDocumentId = '';

  try {
    const body = (await request.json()) as ContactPayload;

    // Hidden honeypot field. Return a normal success response to bots.
    if (cleanText(body.website, 200)) {
      return NextResponse.json({
        ok: true,
        message: 'Thank you. Your message has been received.',
      });
    }

    const name = cleanText(body.name, 100);
    const email = cleanText(body.email, 160).toLowerCase();
    const phone = cleanText(body.phone, 40);
    const requestedSubject = cleanText(body.subject, 80);
    const subject = ALLOWED_SUBJECTS.has(requestedSubject)
      ? requestedSubject
      : 'Other enquiry';
    const message = cleanText(body.message, 5000);

    if (name.length < 2) {
      return NextResponse.json(
        { ok: false, message: 'Please enter your full name.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: 'Please enter a valid email address.' },
        { status: 400 },
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { ok: false, message: 'Please enter a message with at least 10 characters.' },
        { status: 400 },
      );
    }

    const nowMs = Date.now();
    const duplicateKey = createDuplicateKey(email, subject, message);
    const duplicateReference = adminDb.collection('contactMessageDedup').doc(duplicateKey);
    const messageReference = adminDb.collection('contactMessages').doc();
    messageDocumentId = messageReference.id;

    const duplicateDetected = await adminDb.runTransaction(async (transaction) => {
      const duplicateSnapshot = await transaction.get(duplicateReference);
      const previousCreatedAtMs = Number(duplicateSnapshot.data()?.createdAtMs || 0);

      if (
        duplicateSnapshot.exists &&
        previousCreatedAtMs > 0 &&
        nowMs - previousCreatedAtMs < DUPLICATE_WINDOW_MS
      ) {
        return true;
      }

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
        messageId: messageDocumentId,
        createdAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return false;
    });

    if (duplicateDetected) {
      messageDocumentId = '';
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          message:
            'This message was already submitted recently. Please wait a few minutes before sending it again.',
        },
        { status: 409 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL || OFFICIAL_EMAIL;
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim();

    if (!resendApiKey || !fromEmail) {
      await messageReference.update({
        emailStatus: 'failed',
        emailError: !resendApiKey
          ? 'RESEND_API_KEY is missing.'
          : 'A verified Resend sender address is missing.',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          ok: false,
          saved: true,
          message:
            'Your message was saved, but the email service has not been configured.',
        },
        { status: 500 },
      );
    }

    const submittedAt = new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos',
    }).format(new Date());

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || 'Not supplied');
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `JayLuxe contact: ${subject} — ${name}`,
      text: [
        'New JayLuxe website enquiry',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || 'Not supplied'}`,
        `Enquiry type: ${subject}`,
        `Submitted: ${submittedAt}`,
        `Message ID: ${messageDocumentId}`,
        '',
        'Message:',
        message,
      ].join('\n'),
      html: `
        <div style="background:#f5f1e9;padding:32px;font-family:Arial,sans-serif;color:#171717">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e8dfcf;border-radius:18px;overflow:hidden">
            <div style="background:#111111;padding:26px 30px">
              <p style="margin:0 0 6px;color:#d8b968;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">JayLuxe Website</p>
              <h1 style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:30px;font-weight:500">New customer message</h1>
            </div>
            <div style="padding:30px">
              <table style="width:100%;border-collapse:collapse;margin-bottom:26px">
                <tr><td style="padding:8px 0;color:#777777;width:150px">Name</td><td style="padding:8px 0;font-weight:700">${safeName}</td></tr>
                <tr><td style="padding:8px 0;color:#777777">Email</td><td style="padding:8px 0"><a href="mailto:${safeEmail}" style="color:#9b711c">${safeEmail}</a></td></tr>
                <tr><td style="padding:8px 0;color:#777777">Phone</td><td style="padding:8px 0">${safePhone}</td></tr>
                <tr><td style="padding:8px 0;color:#777777">Enquiry</td><td style="padding:8px 0">${safeSubject}</td></tr>
                <tr><td style="padding:8px 0;color:#777777">Submitted</td><td style="padding:8px 0">${escapeHtml(submittedAt)}</td></tr>
              </table>
              <div style="padding:20px;border-radius:12px;background:#faf8f3;line-height:1.7">${safeMessage}</div>
              <p style="margin:24px 0 0;color:#777777;font-size:12px">Firestore message ID: ${escapeHtml(messageDocumentId)}</p>
            </div>
          </div>
        </div>
      `,
    }, {
      idempotencyKey: `contact-message/${messageDocumentId}`,
    });

    if (error) {
      await messageReference.update({
        emailStatus: 'failed',
        emailError: cleanText(error.message, 500),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          ok: false,
          saved: true,
          message:
            'Your message was saved, but the email notification could not be sent. Please contact JayLuxe directly if the matter is urgent.',
        },
        { status: 502 },
      );
    }

    await messageReference.update({
      emailStatus: 'sent',
      resendEmailId: data?.id || null,
      emailedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      saved: true,
      message: 'Thank you. Your message has been saved and emailed to the JayLuxe team.',
    });
  } catch (error) {
    console.error('Contact form error:', error);

    return NextResponse.json(
      {
        ok: false,
        saved: Boolean(messageDocumentId),
        message: messageDocumentId
          ? 'Your message was saved, but the email notification failed.'
          : 'Your message could not be saved or sent. Please try again.',
      },
      { status: 500 },
    );
  }
}
