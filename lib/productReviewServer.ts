import { adminDb } from '@/lib/firebaseAdmin';
import type { ProductReview, ProductReviewSummary } from '@/lib/productReviews';

function asIso(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  return new Date(0).toISOString();
}

export function serialiseReview(id: string, data: Record<string, unknown>): ProductReview {
  return {
    id,
    productId: String(data.productId || ''),
    userId: String(data.userId || ''),
    customerName: String(data.customerName || 'JayLuxe Customer'),
    rating: Math.min(5, Math.max(1, Number(data.rating || 1))),
    review: String(data.review || ''),
    verifiedPurchase: data.verifiedPurchase === true,
    status: 'published',
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

export async function getPublishedReviews(productId: string) {
  const snapshot = await adminDb
    .collection('productReviews')
    .where('productId', '==', productId)
    .get();

  return snapshot.docs
    .map((document) => serialiseReview(document.id, document.data()))
    .filter((review) => review.status === 'published')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function reviewSummary(reviews: ProductReview[]): ProductReviewSummary {
  if (!reviews.length) return { averageRating: 0, reviewCount: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    averageRating: Number((total / reviews.length).toFixed(1)),
    reviewCount: reviews.length,
  };
}

export async function syncProductReviewSummary(productId: string) {
  const reviews = await getPublishedReviews(productId);
  const summary = reviewSummary(reviews);
  await adminDb.collection('products').doc(productId).set(
    {
      rating: summary.averageRating,
      reviewCount: summary.reviewCount,
      reviewsUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return summary;
}
