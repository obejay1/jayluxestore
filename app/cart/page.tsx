'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import { trackEvent } from '@/lib/analytics';
import { getSafeImageSource, isLegacyDataImageSource } from '@/lib/images';
import { getCart, getProducts, setCart } from '@/lib/store';
import type { Product } from '@/lib/types';

function formatMoney(value: number) {
  return `₦${Math.round(Number(value || 0)).toLocaleString('en-NG')}`;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<{ id: string; qty: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const syncCart = () => setCartItems(getCart());
    syncCart();

    getProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        console.error('Cart products failed to load:', error);
        if (!cancelled) {
          setLoadError('Your cart could not be loaded. Please refresh and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    window.addEventListener('cart', syncCart);

    return () => {
      cancelled = true;
      window.removeEventListener('cart', syncCart);
    };
  }, []);

  const cartDetails = useMemo(
    () =>
      cartItems.flatMap((cartItem) => {
        const product = products.find((item) => item.id === cartItem.id);
        if (!product) return [];

        return [
          {
            ...product,
            quantity: Math.max(1, Number(cartItem.qty || 1)),
          },
        ];
      }),
    [cartItems, products],
  );

  const cartTotal = useMemo(
    () =>
      cartDetails.reduce(
        (total, item) => total + Number(item.price || 0) * item.quantity,
        0,
      ),
    [cartDetails],
  );

  function updateQuantity(id: string, nextQuantity: number) {
    const quantity = Math.max(1, nextQuantity);
    setCart(
      cartItems.map((item) =>
        item.id === id ? { ...item, qty: quantity } : item,
      ),
    );
  }

  function removeFromCart(id: string) {
    setCart(cartItems.filter((item) => item.id !== id));
  }

  function proceedToCheckout() {
    if (!cartDetails.length) return;

    trackEvent('begin_checkout', {
      currency: 'NGN',
      value: cartTotal,
      items: cartDetails.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || 'Beauty',
        price: item.price,
        quantity: item.quantity,
      })),
    });

    router.push('/checkout');
  }

  return (
    <main className="jl-cart-page">
      <section className="jl-cart-hero" aria-labelledby="cart-page-title">
        <PageHeroIcon icon={ShoppingBag} label="Shopping bag" />
        <span className="jl-page-eyebrow">Your Bag</span>
        <h1 id="cart-page-title" className="font-serif">
          Review Your Cart
        </h1>
        <p>
          {cartDetails.length} {cartDetails.length === 1 ? 'item' : 'items'} in
          your bag
        </p>
      </section>

      <section className="jl-cart-layout">
        <div className="jl-cart-items-card">
          <div className="jl-cart-card-heading">
            <div>
              <span>Selected pieces</span>
              <h2 className="font-serif">Cart Items</h2>
            </div>
            {cartDetails.length > 0 ? (
              <strong>{formatMoney(cartTotal)}</strong>
            ) : null}
          </div>

          {loading ? (
            <div className="jl-cart-state" role="status">
              Loading your cart…
            </div>
          ) : loadError ? (
            <div className="jl-cart-state error" role="alert">
              {loadError}
            </div>
          ) : cartDetails.length === 0 ? (
            <div className="jl-cart-empty">
              <span>
                <ShoppingBag size={36} aria-hidden="true" />
              </span>
              <h3 className="font-serif">Your cart is empty</h3>
              <p>Explore the collection and add something you love.</p>
              <Link href="/shop">Browse Products</Link>
            </div>
          ) : (
            <div className="jl-cart-items-list">
              <AnimatePresence mode="popLayout">
                {cartDetails.map((item) => (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.22 }}
                    className="jl-cart-item"
                  >
                    <Link
                      href={`/product/${item.id}`}
                      className="jl-cart-item-image"
                      aria-label={`View ${item.name}`}
                    >
                      <Image
                        src={getSafeImageSource(item.image)}
                        unoptimized={isLegacyDataImageSource(item.image)}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 84px, 112px"
                      />
                    </Link>

                    <div className="jl-cart-item-copy">
                      <span>{item.category || 'JayLuxe Collection'}</span>
                      <Link href={`/product/${item.id}`}>{item.name}</Link>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" /> Remove
                      </button>
                    </div>

                    <div className="jl-cart-quantity" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>

                    <strong className="jl-cart-item-total">
                      {formatMoney(item.price * item.quantity)}
                    </strong>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <aside className="jl-cart-summary-card">
          <span className="jl-page-eyebrow">Order overview</span>
          <h2 className="font-serif">Order Summary</h2>

          <div className="jl-cart-summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(cartTotal)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <small>Calculated at checkout</small>
            </div>
            <div>
              <span>Tax</span>
              <small>Calculated at checkout</small>
            </div>
          </div>

          <div className="jl-cart-summary-total">
            <span>Total</span>
            <strong>{formatMoney(cartTotal)}</strong>
          </div>

          <button
            type="button"
            className="jl-cart-checkout-button"
            disabled={cartDetails.length === 0 || loading}
            onClick={proceedToCheckout}
          >
            Proceed to Checkout
          </button>

          <p className="jl-cart-security-note">Secure checkout powered by Paystack.</p>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
