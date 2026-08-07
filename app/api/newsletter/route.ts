import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NewsletterPayload = {
  email?: unknown;
  website?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getNewsletterEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from:
      process.env.NEWSLETTER_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.CONTACT_FROM_EMAIL?.trim(),
    replyTo:
      process.env.NEWSLETTER_REPLY_TO_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim(),
    adminRecipient:
      process.env.NEWSLETTER_ADMIN_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim(),
  };
}

function confirmationHtml() {
  return `
    <div style="margin:0;background:#f6f1e8;padding:28px;font-family:Arial,sans-serif;color:#1c1813">
      <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #e5dac7;border-radius:20px;background:#ffffff;box-shadow:0 18px 50px rgba(35,28,19,.08)">
        <div style="padding:30px;background:#17130f;text-align:center">
          <p style="margin:0 0 7px;color:#d3ad52;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">The JayLuxe Edit</p>
          <h1 style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:32px;font-weight:500;line-height:1.15">Welcome to JayLuxe</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 18px;font-size:17px;line-height:1.7">Your subscription is confirmed.</p>
          <p style="margin:0 0 18px;color:#625b51;line-height:1.75">You will receive curated luxury arrivals, beauty notes, bridal inspiration and private offers from JayLuxe.</p>
          <div style="margin:26px 0;padding:18px;border-radius:14px;background:#faf7f1;border:1px solid #eee5d7">
            <p style="margin:0;color:#5e554a;font-size:14px;line-height:1.65">Keep this email in your inbox so future JayLuxe updates are easy to find.</p>
          </div>
          <p style="margin:26px 0 0;color:#8a8176;font-size:13px;line-height:1.6">Thank you for joining the JayLuxe community.</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  let body: NewsletterPayload;

  try {
    body = (await request.json()) as NewsletterPayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Please submit a valid newsletter request.' },
      { status: 400 },
    );
  }

  if (clean(body.website, 200)) {
    return NextResponse.json({
      ok: true,
      message: 'Thank you for joining JayLuxe.',
    });
  }

  const email = clean(body.email, 160).toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }

  const subscriberId = createHash('sha256').update(email).digest('hex');
  const subscriber = adminDb.collection('newsletterSubscribers').doc(subscriberId);

  try {
    const existingSubscriber = await subscriber.get();
    const subscriberData: Record<string, unknown> = {
      email,
      emailLower: email,
      status: 'subscribed',
      source: 'website-footer',
      confirmationEmailStatus: 'pending',
      updatedAt: FieldValue.serverTimestamp(),
      lastSubscribedAt: FieldValue.serverTimestamp(),
    };

    if (!existingSubscriber.exists) {
      subscriberData.createdAt = FieldValue.serverTimestamp();
    }

    await subscriber.set(subscriberData, { merge: true });
  } catch (error) {
    console.error('NEWSLETTER FIRESTORE ERROR:', error);
    return NextResponse.json(
      {
        ok: false,
        saved: false,
        emailSent: false,
        message: 'We could not save your subscription. Please try again.',
      },
      { status: 500 },
    );
  }

  const emailConfig = getNewsletterEmailConfig();
  if (!emailConfig.apiKey || !emailConfig.from) {
    const missing = [
      !emailConfig.apiKey ? 'RESEND_API_KEY' : null,
      !emailConfig.from ? 'NEWSLETTER_FROM_EMAIL or RESEND_FROM_EMAIL' : null,
    ].filter(Boolean);

    console.error(
      `NEWSLETTER EMAIL CONFIGURATION ERROR: Missing ${missing.join(', ')}.`,
    );

    await subscriber.set(
      {
        confirmationEmailStatus: 'configuration_error',
        confirmationEmailError: `Missing ${missing.join(', ')}`,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json(
      {
        ok: false,
        saved: true,
        emailSent: false,
        message:
          'Your subscription was saved, but the confirmation email service is not configured yet.',
      },
      { status: 503 },
    );
  }

  const resend = new Resend(emailConfig.apiKey);
  const idempotencyDate = new Date().toISOString().slice(0, 10);

  try {
    const { data, error } = await resend.emails.send(
      {
        from: emailConfig.from,
        to: [email],
        replyTo: emailConfig.replyTo || undefined,
        subject: 'Welcome to the JayLuxe Edit',
        text: [
          'Welcome to JayLuxe.',
          '',
          'Your newsletter subscription is confirmed.',
          'You will receive curated luxury arrivals, beauty notes, bridal inspiration and private offers.',
          '',
          'Thank you for joining the JayLuxe community.',
        ].join('\n'),
        html: confirmationHtml(),
      },
      {
        idempotencyKey: `newsletter-confirmation/${subscriberId}/${idempotencyDate}`,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    await subscriber.set(
      {
        confirmationEmailStatus: 'sent',
        confirmationEmailId: data?.id || null,
        confirmationEmailError: null,
        confirmationEmailSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (
      emailConfig.adminRecipient &&
      emailConfig.adminRecipient.toLowerCase() !== email
    ) {
      const adminResult = await resend.emails.send(
        {
          from: emailConfig.from,
          to: [emailConfig.adminRecipient],
          replyTo: email,
          subject: 'New JayLuxe newsletter subscriber',
          text: `A new subscriber joined the JayLuxe newsletter: ${email}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;color:#17130f">
              <h1 style="font-family:Georgia,serif">New newsletter subscriber</h1>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Source:</strong> website footer</p>
            </div>
          `,
        },
        {
          idempotencyKey: `newsletter-admin/${subscriberId}/${idempotencyDate}`,
        },
      );

      await subscriber.set(
        {
          adminNotificationStatus: adminResult.error ? 'failed' : 'sent',
          adminNotificationId: adminResult.data?.id || null,
          adminNotificationError: adminResult.error?.message || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (adminResult.error) {
        console.error('NEWSLETTER ADMIN EMAIL ERROR:', adminResult.error);
      }
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      emailSent: true,
      message: 'You are subscribed. Check your inbox for a JayLuxe confirmation email.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Resend error';
    console.error('NEWSLETTER CONFIRMATION EMAIL ERROR:', error);

    await subscriber.set(
      {
        confirmationEmailStatus: 'failed',
        confirmationEmailError: message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json(
      {
        ok: false,
        saved: true,
        emailSent: false,
        message:
          'Your subscription was saved, but the confirmation email could not be sent. Please verify the Resend sender domain and try again.',
      },
      { status: 502 },
    );
  }
}
