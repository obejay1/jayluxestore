'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Package,
  ReceiptText,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import { auth } from '@/lib/firebase';
import { getSafeImageSource } from '@/lib/images';
import { money } from '@/lib/store';
import type { Order } from '@/lib/types';

type ConfirmedOrder = Order & {
  customerName?: string;
  customerAddress?: string;
  shippingAddress?: string;
  address?: string;
  estimatedDeliveryDate?: string;
  deliveryDays?: string;
};

type OrderResponse = {
  order?: ConfirmedOrder;
  message?: string;
};

async function readJsonResponse(response: Response): Promise<OrderResponse> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as OrderResponse;
  } catch {
    throw new Error(
      `The order service returned an invalid response (${response.status}).`,
    );
  }
}

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const orderId = String(params?.id || '').trim();
  const accessToken = searchParams.get('token')?.trim() || '';

  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        setError('');

        if (!orderId) {
          throw new Error('The order number is missing.');
        }

        const idToken = user ? await user.getIdToken() : null;
        const query = accessToken
          ? `?token=${encodeURIComponent(accessToken)}`
          : '';

        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}${query}`,
          {
            headers: idToken
              ? { Authorization: `Bearer ${idToken}` }
              : undefined,
            cache: 'no-store',
          },
        );

        const data = await readJsonResponse(response);

        if (!response.ok || !data.order) {
          throw new Error(data.message || 'The order could not be found.');
        }

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (loadError) {
        console.error('Order confirmation load failed:', loadError);

        if (!cancelled) {
          setOrder(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'The order could not be loaded.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [accessToken, orderId]);

  if (loading) {
    return (
      <main className="jl-order-page">
        <section className="jl-order-hero">
          <PageHeroIcon icon={Package} label="Loading order" />
          <h1 className="font-serif">Loading your order</h1>
          <p>Please wait while we securely retrieve your order details.</p>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="jl-order-page">
        <section className="jl-order-hero">
          <PageHeroIcon icon={Package} label="Order unavailable" />
          <h1 className="font-serif">Order unavailable</h1>
          <p>{error || 'We could not find an order with that number.'}</p>
        </section>

        <div className="jl-order-not-found">
          <Link href="/shop" className="jl-order-btn">
            Continue Shopping
          </Link>
        </div>

        <Footer />
      </main>
    );
  }

  const items = order.items || [];
  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping || 0);
  const tax = Number(order.tax || 0);
  const total = Number(order.total || 0);
  const shippingAddress =
    order.shippingAddress ||
    order.customerAddress ||
    order.address ||
    'Address not available';
  const invoiceQuery = accessToken
    ? `?token=${encodeURIComponent(accessToken)}`
    : '';

  return (
    <main className="jl-order-page">
      <section className="jl-order-hero">
        <PageHeroIcon icon={CheckCircle2} label="Order confirmed" />
        <span className="jl-page-eyebrow">Order confirmed</span>
        <h1 className="font-serif">Thank you for your order</h1>
        <p>
          Order <strong>#{order.id}</strong> was placed successfully. Its status
          will update in your customer account as it moves through fulfilment.
        </p>
      </section>

      <div className="jl-order-container">
        <div className="jl-order-details-grid">
          <section className="jl-order-summary" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="font-serif">
              Order Summary
            </h2>

            <div className="jl-order-items">
              {items.length > 0 ? (
                items.map((item, index) => {
                  const quantity = Number(item.qty || item.quantity || 1);
                  const price = Number(item.price || 0);

                  return (
                    <article className="jl-order-item" key={`${item.id || item.name}-${index}`}>
                      <Image
                        src={getSafeImageSource(item.image)}
                        alt={item.name || 'JayLuxe product'}
                        width={64}
                        height={64}
                        sizes="64px"
                      />
                      <div className="jl-order-item-info">
                        <strong>{item.name || 'Product'}</strong>
                        <span>Quantity: {quantity}</span>
                      </div>
                      <strong>{money(price * quantity)}</strong>
                    </article>
                  );
                })
              ) : (
                <p>No product details were saved with this order.</p>
              )}
            </div>

            <div className="jl-order-totals">
              <div className="jl-order-total-line">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="jl-order-total-line">
                <span>Shipping</span>
                <span>{money(shipping)}</span>
              </div>
              <div className="jl-order-total-line">
                <span>Tax</span>
                <span>{money(tax)}</span>
              </div>
              <div className="jl-order-total-line grand-total">
                <strong>Total</strong>
                <strong>{money(total)}</strong>
              </div>
            </div>
          </section>

          <aside className="jl-order-shipping-info">
            <div className="jl-order-info-card">
              <MapPin aria-hidden="true" />
              <div>
                <h2>Shipping Address</h2>
                <p>{order.customerName || 'Customer'}</p>
                <p>{shippingAddress}</p>
              </div>
            </div>

            <div className="jl-order-info-card">
              <CalendarDays aria-hidden="true" />
              <div>
                <h2>Estimated Delivery</h2>
                <p>
                  {order.deliveryDays ||
                    (order.estimatedDeliveryDate
                      ? new Date(order.estimatedDeliveryDate).toLocaleDateString(
                          'en-NG',
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )
                      : 'Delivery date will be confirmed soon')}
                </p>
              </div>
            </div>

            <div className="jl-order-actions">
              <Link href="/account" className="jl-order-btn">
                Track in My Account
              </Link>
              <Link
                href={`/invoice/${encodeURIComponent(order.id)}${invoiceQuery}`}
                className="jl-order-btn outline"
              >
                <ReceiptText size={17} aria-hidden="true" /> View Invoice
              </Link>
              <Link href="/shop" className="jl-order-btn outline">
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  );
}
