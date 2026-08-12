import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getPublishedReviews, reviewSummary, serialiseReview, syncProductReviewSummary } from '@/lib/productReviewServer';
import { getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reviewDocumentId(productId: string, userId: string) {
  return `${Buffer.from(productId).toString('base64url')}_${userId}`;
}

function validReviewText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

async function hasPurchasedProduct(userId: string, email: string, productId: string) {
  const orders = adminDb.collection('orders');
  const requests = [orders.where('userId', '==', userId).get()];
  if (email) requests.push(orders.where('customerEmailLower', '==', email).get());
  const snapshots = await Promise.all(requests);
  const seen = new Set<string>();

  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      if (seen.has(document.id)) continue;
      seen.add(document.id);
      const data = document.data() as { status?: string; items?: Array<{ id?: string }> };
      const status = String(data.status || '').toLowerCase();
      if (status.includes('cancel') || status.includes('refund')) continue;
      if (data.items?.some((item) => String(item.id || '') === productId)) return true;
    }
  }
  return false;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = decodeURIComponent(params.id);
    const reviews = await getPublishedReviews(productId);
    return NextResponse.json(
      { ok: true, reviews, summary: reviewSummary(reviews) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('PRODUCT REVIEWS GET ERROR:', error);
    return NextResponse.json({ ok: false, message: 'Reviews could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const customer = await getVerifiedCustomer(request);
  if (!customer) {
    return NextResponse.json({ ok: false, message: 'Please sign in to review this product.' }, { status: 401 });
  }

  try {
    const productId = decodeURIComponent(params.id);
    const body = (await request.json().catch(() => ({}))) as { rating?: unknown; review?: unknown };
    const rating = Number(body.rating);
    const review = validReviewText(body.review);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, message: 'Choose a rating from 1 to 5 stars.' }, { status: 400 });
    }
    if (review.length < 10 || review.length > 1200) {
      return NextResponse.json({ ok: false, message: 'Write a review between 10 and 1,200 characters.' }, { status: 400 });
    }

    const productSnapshot = await adminDb.collection('products').doc(productId).get();
    if (!productSnapshot.exists || productSnapshot.data()?.active === false || productSnapshot.data()?.type === 'service') {
      return NextResponse.json({ ok: false, message: 'This product is not available for reviews.' }, { status: 404 });
    }

    const reference = adminDb.collection('productReviews').doc(reviewDocumentId(productId, customer.uid));
    const email = customer.email?.trim().toLowerCase() || '';
    const [userSnapshot, verifiedPurchase] = await Promise.all([
      adminDb.collection('users').doc(customer.uid).get(),
      hasPurchasedProduct(customer.uid, email, productId),
    ]);
    const profile = userSnapshot.data() as { name?: string; fullName?: string } | undefined;
    const tokenNameValue = (customer as { name?: unknown }).name;
    const tokenName = typeof tokenNameValue === 'string' ? tokenNameValue : '';
    const customerName = profile?.name?.trim() || profile?.fullName?.trim() || tokenName || 'JayLuxe Customer';
    const now = new Date().toISOString();

    let duplicate = false;
    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists) {
        duplicate = true;
        return;
      }
      transaction.create(reference, {
        productId,
        userId: customer.uid,
        customerName,
        rating,
        review,
        verifiedPurchase,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      });
    });
    if (duplicate) {
      return NextResponse.json({ ok: false, message: 'You have already reviewed this product.' }, { status: 409 });
    }

    const summary = await syncProductReviewSummary(productId);
    const created = await reference.get();
    return NextResponse.json({ ok: true, review: serialiseReview(created.id, created.data() || {}), summary }, { status: 201 });
  } catch (error) {
    console.error('PRODUCT REVIEW POST ERROR:', error);
    return NextResponse.json({ ok: false, message: 'Your review could not be submitted. Please try again.' }, { status: 500 });
  }
}
