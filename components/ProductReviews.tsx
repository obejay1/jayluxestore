'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CheckCircle2, LoaderCircle, Star } from 'lucide-react';

import { auth } from '@/lib/firebase';
import type { ProductReview, ProductReviewSummary } from '@/lib/productReviews';
import { showToast } from '@/lib/toast';

type ReviewsResponse = {
  ok?: boolean;
  message?: string;
  reviews?: ProductReview[];
  review?: ProductReview;
  summary?: ProductReviewSummary;
};

async function parseResponse(response: Response): Promise<ReviewsResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ReviewsResponse;
  } catch {
    throw new Error('The review service returned an invalid response.');
  }
}

export default function ProductReviews({
  productId,
  productName,
  onSummaryChange,
}: {
  productId: string;
  productName: string;
  onSummaryChange?: (summary: ProductReviewSummary) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary>({ averageRating: 0, reviewCount: 0 });
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await parseResponse(response);
      if (!response.ok || data.ok !== true) throw new Error(data.message || 'Reviews could not be loaded.');
      const nextReviews = Array.isArray(data.reviews) ? data.reviews : [];
      const nextSummary = data.summary || { averageRating: 0, reviewCount: nextReviews.length };
      setReviews(nextReviews);
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
    } catch (loadError) {
      console.error('Product reviews failed to load:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Reviews could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [onSummaryChange, productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const hasReviewed = useMemo(
    () => Boolean(user && reviews.some((item) => item.userId === user.uid)),
    [reviews, user],
  );

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const trimmed = review.trim();
    if (trimmed.length < 10) {
      setError('Please write at least 10 characters about your experience.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ rating, review: trimmed }),
      });
      const data = await parseResponse(response);
      if (!response.ok || data.ok !== true) throw new Error(data.message || 'Your review could not be submitted.');
      setReview('');
      showToast('Review submitted successfully', 'success');
      await loadReviews();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Your review could not be submitted.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="jl-reviews-panel">
      <section className="jl-review-summary" aria-label={`${productName} review summary`}>
        <div>
          <strong>{summary.averageRating ? summary.averageRating.toFixed(1) : '—'}</strong>
          <span>out of 5</span>
        </div>
        <div>
          <div className="jl-review-stars" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={20} fill={index < Math.round(summary.averageRating) ? 'currentColor' : 'none'} />
            ))}
          </div>
          <p>{summary.reviewCount ? `Based on ${summary.reviewCount} review${summary.reviewCount === 1 ? '' : 's'}` : 'Be the first to review this product.'}</p>
        </div>
      </section>

      <section className="jl-review-compose" aria-labelledby="write-product-review">
        <div>
          <p className="jl-product-kicker">Customer feedback</p>
          <h2 id="write-product-review">Review {productName}</h2>
          <p>Share a useful, respectful review to help other JayLuxe customers shop confidently.</p>
        </div>

        {!user ? (
          <div className="jl-review-auth-note">
            <p>Please sign in before submitting a product review.</p>
            <Link href={`/account?next=${encodeURIComponent(`/product/${productId}`)}`}>Sign in to review</Link>
          </div>
        ) : hasReviewed ? (
          <div className="jl-review-auth-note success"><CheckCircle2 size={20} aria-hidden="true" /><p>You have already reviewed this product. Thank you.</p></div>
        ) : (
          <form onSubmit={submitReview}>
            <fieldset disabled={submitting}>
              <legend>Your rating</legend>
              <div className="jl-review-rating-input" role="radiogroup" aria-label="Product rating">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      type="button"
                      key={value}
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      className={value <= rating ? 'active' : ''}
                      onClick={() => setRating(value)}
                    >
                      <Star size={25} fill={value <= rating ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <label htmlFor="product-review-text">Your review</label>
              <textarea
                id="product-review-text"
                value={review}
                onChange={(event) => setReview(event.target.value)}
                minLength={10}
                maxLength={1200}
                rows={5}
                placeholder="Tell us what you liked, how you used it, and anything another customer should know."
                required
              />
              <div className="jl-review-form-footer"><span>{review.trim().length}/1200</span><button type="submit">{submitting ? 'Submitting…' : 'Submit Review'}</button></div>
            </fieldset>
          </form>
        )}
      </section>

      <section className="jl-review-list" aria-label="Published product reviews">
        <div className="jl-review-list-head"><h2>Customer Reviews</h2><span>{summary.reviewCount}</span></div>
        {error ? <p className="jl-review-error" role="alert">{error}</p> : null}
        {loading ? (
          <div className="jl-review-loading" role="status"><LoaderCircle className="jl-spin" size={24} aria-hidden="true" /> Loading reviews…</div>
        ) : reviews.length ? (
          reviews.map((item) => (
            <article className="jl-review-card" key={item.id}>
              <div className="jl-review-card-head">
                <div><strong>{item.customerName}</strong><small>{new Date(item.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}</small></div>
                {item.verifiedPurchase ? <span className="jl-verified-review"><CheckCircle2 size={15} aria-hidden="true" /> Verified Purchase</span> : null}
              </div>
              <div className="jl-review-stars" aria-label={`${item.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} fill={index < item.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}
              </div>
              <p>{item.review}</p>
            </article>
          ))
        ) : (
          <div className="jl-review-empty"><p>No reviews yet. Share the first review after signing in.</p></div>
        )}
      </section>
    </div>
  );
}
