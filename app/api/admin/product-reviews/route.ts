import { NextRequest, NextResponse } from 'next/server';

import { adminAuthErrorResponse, requireAdminSession } from '@/lib/adminServerAuth';
import { adminDb } from '@/lib/firebaseAdmin';
import { serialiseReview, syncProductReviewSummary } from '@/lib/productReviewServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession({ permission: 'products' });
    const snapshot = await adminDb.collection('productReviews').get();
    const reviews = snapshot.docs
      .map((document) => serialiseReview(document.id, document.data()))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return NextResponse.json({ ok: true, reviews }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ADMIN PRODUCT REVIEWS GET ERROR:', error);
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession({ permission: 'products' });
    const id = new URL(request.url).searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ ok: false, message: 'Review ID is required.' }, { status: 400 });

    const reference = adminDb.collection('productReviews').doc(id);
    const snapshot = await reference.get();
    if (!snapshot.exists) return NextResponse.json({ ok: false, message: 'Review not found.' }, { status: 404 });
    const productId = String(snapshot.data()?.productId || '');
    await reference.delete();
    if (productId) await syncProductReviewSummary(productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ADMIN PRODUCT REVIEWS DELETE ERROR:', error);
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
