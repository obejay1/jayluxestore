import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getSiteUrlString } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function unsubscribe(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  const token = (request.nextUrl.searchParams.get('token') || '').trim();
  if (!email || !validEmail(email) || !token) return false;

  const subscriberId = createHash('sha256').update(email).digest('hex');
  const reference = adminDb.collection('newsletterSubscribers').doc(subscriberId);
  const snapshot = await reference.get();
  if (!snapshot.exists) return true;

  const data = snapshot.data() || {};
  if (String(data.unsubscribeToken || '') !== token) return false;

  await reference.set({
    status: 'unsubscribed',
    marketingConsent: false,
    unsubscribedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
}

export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request);
  const siteUrl = getSiteUrlString();
  return NextResponse.redirect(`${siteUrl}/newsletter-unsubscribed?status=${ok ? 'success' : 'invalid'}`, 303);
}

export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request);
  return new NextResponse(null, { status: ok ? 200 : 400 });
}
