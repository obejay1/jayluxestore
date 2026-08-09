import { createHash, randomUUID } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

import {
  sendNewsletterAdminNotification,
  sendNewsletterWelcome,
} from '@/lib/email/workflows';
import { adminDb } from '@/lib/firebaseAdmin';
import { getSiteUrlString } from '@/lib/site';

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

export async function POST(request: Request) {
  let body: NewsletterPayload;
  try {
    body = (await request.json()) as NewsletterPayload;
  } catch {
    return NextResponse.json({ ok: false, message: 'Please submit a valid newsletter request.' }, { status: 400 });
  }

  if (clean(body.website, 200)) {
    return NextResponse.json({ ok: true, message: 'Thank you for joining JayLuxe.' });
  }

  const email = clean(body.email, 160).toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
  }

  const subscriberId = createHash('sha256').update(email).digest('hex');
  const subscriber = adminDb.collection('newsletterSubscribers').doc(subscriberId);

  try {
    const subscription = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(subscriber);
      const data = snapshot.data() || {};
      const existingStatus = String(data.status || '');
      const alreadySubscribed = snapshot.exists && existingStatus === 'subscribed';
      const unsubscribeToken = String(data.unsubscribeToken || randomUUID().replaceAll('-', ''));
      const previousVersion = Number(data.subscriptionVersion || 0);
      const subscriptionVersion = alreadySubscribed ? Math.max(previousVersion, 1) : previousVersion + 1;

      transaction.set(subscriber, {
        email,
        emailLower: email,
        status: 'subscribed',
        source: 'website-footer',
        unsubscribeToken,
        subscriptionVersion,
        marketingConsent: true,
        updatedAt: FieldValue.serverTimestamp(),
        lastSubscribedAt: FieldValue.serverTimestamp(),
        ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });

      return { alreadySubscribed, unsubscribeToken, subscriptionVersion };
    });

    if (subscription.alreadySubscribed) {
      return NextResponse.json({
        ok: true,
        saved: true,
        alreadySubscribed: true,
        message: 'You are already subscribed to The JayLuxe Edit.',
      });
    }

    const siteUrl = getSiteUrlString();
    const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(subscription.unsubscribeToken)}`;

    const [customerResult, adminResult] = await Promise.all([
      sendNewsletterWelcome({
        subscriberId,
        email,
        unsubscribeUrl,
        subscriptionVersion: subscription.subscriptionVersion,
      }),
      sendNewsletterAdminNotification({
        subscriberId,
        email,
        subscriptionVersion: subscription.subscriptionVersion,
      }),
    ]);

    await subscriber.set({
      confirmationEmailStatus: customerResult.status,
      confirmationEmailId: customerResult.resendId || null,
      confirmationEmailError: customerResult.error || null,
      adminNotificationStatus: adminResult.status,
      adminNotificationId: adminResult.resendId || null,
      adminNotificationError: adminResult.error || null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      saved: true,
      emailSent: customerResult.ok,
      message: customerResult.ok
        ? 'You are subscribed. Check your inbox for a JayLuxe confirmation email.'
        : 'Your subscription is active, but the confirmation email could not be sent right now.',
    });
  } catch (error) {
    console.error('NEWSLETTER ERROR:', error);
    return NextResponse.json({ ok: false, saved: false, message: 'We could not save your subscription. Please try again.' }, { status: 500 });
  }
}
