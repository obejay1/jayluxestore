'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getCart, getProducts, money, setCart as persistCart } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';
import { getCheckoutSettings } from '@/lib/settings';
import { validateCoupon } from '@/lib/coupons';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import Footer from '@/components/Footer';
import ResponsiveImage from '@/components/ResponsiveImage';
import PageHeroIcon from '@/components/PageHeroIcon';
import { CreditCard, Lock } from 'lucide-react';
import { auth, db } from '@/lib/firebase';

const PaystackButton = dynamic(
  () => import('react-paystack').then((mod) => mod.PaystackButton),
  { ssr: false }
);

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The server returned an invalid response with status ${response.status}.`,
    );
  }
}

export default function Checkout() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ id: string; qty: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [taxRate, setTaxRate] = useState(7.5);
  const [shippingFee, setShippingFee] = useState(1500);
  const [deliveryDaysText, setDeliveryDaysText] = useState('2–5 business days');
  const [deliveryDaysCount, setDeliveryDaysCount] = useState(5);

  const [paymentMethod, setPaymentMethod] = useState<'Paystack' | 'OPay' | 'Installment'>(
    'Paystack'
  );
  const [installmentCount, setInstallmentCount] = useState(4);
  const [isProcessingOPay, setIsProcessingOPay] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [checkoutError, setCheckoutError] = useState('');

  const r = useRouter();
  const opayEnabled = process.env.NEXT_PUBLIC_OPAY_ENABLED === 'true';
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
  const paystackEnabled = Boolean(paystackPublicKey);
  const safeInstallmentCount = Number(installmentCount || 1);

  useEffect(() => {
    setMounted(true);
    setCart(getCart());

    getProducts()
      .then(setProducts)
      .catch((error) => {
        console.error('Checkout products failed to load:', error);
        setCheckoutError('Your cart details could not be loaded. Please refresh and try again.');
      });

    getCheckoutSettings()
      .then((s) => {
        setTaxRate(s.taxRate ?? 7.5);
        setShippingFee(s.shippingFee ?? 1500);
        setDeliveryDaysText(s.deliveryDaysText ?? '2–5 business days');
        setDeliveryDaysCount(s.deliveryDaysCount ?? 5);
      })
      .catch((error) => {
        console.error('Checkout settings failed to load:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (activeUser) => {
      if (!activeUser) return;

      setUserId(activeUser.uid);
      setEmail((current) => current || activeUser.email || '');
      setFullName((current) => current || activeUser.displayName || '');

      try {
        const profileSnapshot = await getDoc(doc(db, 'users', activeUser.uid));
        const profile = profileSnapshot.data() as { name?: string; phone?: string } | undefined;
        setFullName((current) => current || profile?.name || '');
        setPhone((current) => current || profile?.phone || '');
      } catch (error) {
        console.error('Checkout profile prefill failed:', error);
      }
    });

    return unsubscribe;
  }, []);

  const items = cart
    .map((c) => {
      const p = products.find((p) => p.id === c.id);

      return p
        ? {
            id: p.id,
            name: p.name,
            price: p.price,
            qty: c.qty,
            image: p.image,
            category: p.category,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
    category?: string;
  }>;

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 0 ? shippingFee : 0;
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = Math.max(0, subtotal + shipping + tax - discountAmount);

  const safeTotal = Number(total || 0);

  const installmentInitialAmount = Math.ceil(
    safeTotal / safeInstallmentCount
  );

  async function applyCoupon() {
    if (couponLoading) return;

    setCouponLoading(true);
    setCheckoutError('');

    try {
      const result = await validateCoupon(couponCode, subtotal);
      if (!result.valid) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        showToast(result.message, 'error');
        return;
      }

      const validatedCode = result.coupon?.code || couponCode.trim().toUpperCase();
      setCouponCode(validatedCode);
      setAppliedCouponCode(validatedCode);
      setDiscountAmount(Math.min(subtotal, Math.max(0, result.discount)));
      showToast(result.message, 'success');
    } catch (error) {
      console.error('Coupon validation failed:', error);
      setAppliedCouponCode('');
      setDiscountAmount(0);
      setCheckoutError('The coupon could not be validated. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleOPayPayment() {
    if (!opayEnabled) {
      setCheckoutError('OPay is not currently available. Please use Paystack.');
      return;
    }

    try {
      setIsProcessingOPay(true);

      setCheckoutError('');
      const orderId = crypto.randomUUID();
      const accessToken = crypto.randomUUID().replaceAll('-', '');
      
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + deliveryDaysCount);
      const estimatedDeliveryDate = estDate.toISOString();

      sessionStorage.setItem(
        'opay_checkout_data',
        JSON.stringify({
          id: orderId,
          userId,
          accessToken,
          items,
          subtotal,
          shipping,
          tax,
          total,
          taxRate,
          shippingFee,
          discountAmount,
          paymentMethod: 'OPay',
          customerEmail: email.trim(),
          customerEmailLower: email.trim().toLowerCase(),
          customerName: fullName,
          customerPhone: phone,
          customerAddress: address,
          status: 'Processing',
          paymentStatus: 'Pending',
          createdAt: new Date().toISOString(),
          deliveryDays: deliveryDaysText,
          estimatedDeliveryDate,
        })
      );

      const response = await fetch('/api/opay/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          email,
          name: fullName,
          phone,
          orderId,
        }),
      });

      const data = await readJsonResponse<{
        url?: string;
        error?: string;
        message?: string;
      }>(response);

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      const paymentError =
        data.error ||
        data.message ||
        'Could not initialize OPay payment';
      setCheckoutError(paymentError);
      showToast(paymentError, 'error');
      setIsProcessingOPay(false);
    } catch (error) {
      console.error(error);
      setCheckoutError('OPay payment initialization failed. Please try again.');
      showToast('OPay payment initialization failed', 'error');
      setIsProcessingOPay(false);
    }
  }

  async function saveOrder(reference: string) {
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setCheckoutError('');

    try {
      const idToken = auth.currentUser
        ? await auth.currentUser.getIdToken()
        : null;
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          reference,
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone,
          customerAddress: address,
          couponCode: appliedCouponCode,
          paymentType: paymentMethod,
          installmentCount: paymentMethod === 'Installment' ? installmentCount : null,
          installmentAmount: paymentMethod === 'Installment' ? installmentInitialAmount : null,
        }),
      });
      const data = await readJsonResponse<{
        orderId?: string;
        accessToken?: string;
        order?: { total?: number };
        message?: string;
      }>(response);

      if (!response.ok || !data.orderId || !data.accessToken) {
        throw new Error(data.message || 'The payment could not be verified.');
      }

      persistCart([]);
      setCart([]);

      void fetch('/api/termii/send-order-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderId,
          accessToken: data.accessToken,
        }),
      }).catch((error) => console.error('Order SMS failed:', error));

      trackEvent('purchase', {
        transaction_id: reference,
        currency: 'NGN',
        value: Number(data.order?.total ?? total),
        items: items.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          item_category: item.category || 'Beauty',
          price: item.price,
          quantity: item.qty,
        })),
      });

      showToast('Payment verified. Your order has been placed!', 'success');
      r.push(
        `/order/${data.orderId}?token=${encodeURIComponent(data.accessToken)}`,
      );
      r.refresh();
    } catch (error) {
      console.error('ORDER_CREATION_FAILED', {
        message: error instanceof Error ? error.message : String(error),
        reference,
        timestamp: new Date().toISOString(),
      });
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'The order could not be created. Please contact support.',
      );
    } finally {
      setIsPlacingOrder(false);
    }
  }

  const formComplete = Boolean(
    email.trim() &&
    fullName.trim() &&
    phone.trim() &&
    address.trim() &&
    items.length > 0 &&
    total > 0
  );

  const selectedPaymentEnabled =
    paymentMethod === 'Paystack' || paymentMethod === 'Installment' ? paystackEnabled : opayEnabled;
  const canPay = formComplete && selectedPaymentEnabled;

  const paystackConfig = {
    email: email.trim(),
    amount: Math.round((paymentMethod === 'Installment' ? installmentInitialAmount : total) * 100),
    publicKey: paystackPublicKey,
    text: paymentMethod === 'Installment' ? `Pay ${money(installmentInitialAmount)} & Start Plan` : `Pay ${money(total)}`,
    onSuccess: (response: unknown) =>
      void saveOrder((response as { reference: string }).reference),
    onClose: () => {
      setCheckoutError('Payment was cancelled. Your cart is still saved.');
    },
  };

  return (
    <main className="jl-checkout-page">

      <section className="jl-checkout-hero">
        <PageHeroIcon icon={CreditCard} label="Secure checkout" />
        <h1 className="font-serif">Secure Checkout</h1>
        <p>Please enter your details below to complete your purchase. All payments are securely processed.</p>
      </section>

      <section className="jl-checkout-layout">
        <div className="jl-checkout-main">
          <div className="jl-form-card">
            <h2>Shipping Information</h2>
            <div className="jl-form-grid">
              <div className="jl-form-group full-width">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="jl-form-group">
                <label htmlFor="email">Email Address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
              </div>
              <div className="jl-form-group">
                <label htmlFor="phone">Phone Number</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" inputMode="tel" />
              </div>
              <div className="jl-form-group full-width">
                <label htmlFor="address">Delivery Address</label>
                <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required autoComplete="street-address" />
              </div>
            </div>
          </div>

          <div className="jl-form-card">
            <h2>Payment Method</h2>
            <div
              className="jl-payment-option-group"
              role="radiogroup"
              aria-label="Choose a payment method"
            >
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'Paystack'}
                className={`jl-payment-option jl-payment-paystack ${
                  paymentMethod === 'Paystack' ? 'active' : ''
                }`}
                onClick={() => {
                  setCheckoutError('');
                  setPaymentMethod('Paystack');
                }}
              >
                <span className="jl-payment-option-header">
                  <strong className="jl-payment-option-title">Paystack</strong>
                  {paymentMethod === 'Paystack' ? (
                    <span className="jl-payment-selected">Selected</span>
                  ) : null}
                </span>
                <span className="jl-payment-option-description">
                  Card, bank transfer and USSD
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'Installment'}
                className={`jl-payment-option ${paymentMethod === 'Installment' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('Installment')}
              >
                <span className="jl-payment-option-header">
                  <strong className="jl-payment-option-title">Pay in Installments</strong>
                </span>
                <span className="jl-payment-option-description">Split your payment into manageable installments.</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'OPay'}
                aria-disabled={!opayEnabled}
                disabled={!opayEnabled}
                className={`jl-payment-option jl-payment-opay ${
                  paymentMethod === 'OPay' ? 'active' : ''
                }`}
                onClick={() => {
                  if (!opayEnabled) return;
                  setCheckoutError('');
                  setPaymentMethod('OPay');
                }}
              >
                <span className="jl-payment-option-header">
                  <strong className="jl-payment-option-title">OPay</strong>
                  {opayEnabled ? (
                    paymentMethod === 'OPay' ? (
                      <span className="jl-payment-selected">Selected</span>
                    ) : null
                  ) : (
                    <span className="jl-payment-unavailable">Setup required</span>
                  )}
                </span>
                <span className="jl-payment-option-description">
                  OPay wallet and bank transfer
                </span>
              </button>
            </div>
            {paymentMethod === 'Installment' ? (
              <div className="jl-payment-notice">
                <strong>Choose installment plan</strong>
                <div>
                  {[2,3,4].map((count) => (
                    <button key={count} type="button" onClick={() => setInstallmentCount(count)} className={installmentCount === count ? 'active' : ''}>
                      {count} payments
                    </button>
                  ))}
                </div>
                <p>Pay today {money(installmentInitialAmount)}. Remaining balance will be scheduled.</p>
              </div>
            ) : null}
            {!opayEnabled ? (
              <p className="jl-payment-notice">
                OPay remains disabled until the merchant callback and webhook
                configuration is complete.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="jl-checkout-summary">
          <h2 className="font-serif">Order Summary</h2>

          <div className="jl-summary-items">
            {items.length > 0 ? items.map(item => (
              <div className="jl-summary-item" key={String(item.id)}>
                <ResponsiveImage src={item.image} alt={item.name} width={64} height={64} sizes="64px" />
                <div className="jl-summary-item-info">
                  <p style={{fontWeight: 600}}>{item.name}</p>
                  <p style={{fontSize: '14px'}}>Qty: {item.qty}</p>
                </div>
                <strong style={{fontSize: '15px'}}>{money(item.price * item.qty)}</strong>
              </div>
            )) : <p>Your cart is empty.</p>}
          </div>

          <div className="jl-checkout-coupon">
            <label htmlFor="checkout-coupon">Coupon code</label>
            <div>
              <input
                id="checkout-coupon"
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase());
                  setAppliedCouponCode('');
                  setDiscountAmount(0);
                }}
                autoComplete="off"
                placeholder="Enter coupon"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading || subtotal <= 0 || !couponCode.trim()}
              >
                {couponLoading ? 'Checking…' : 'Apply'}
              </button>
            </div>
          </div>

          <div className="jl-summary-line">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>

          {discountAmount > 0 && (
            <div className="jl-summary-line">
              <span>Discount</span>
              <strong style={{ color: '#16a34a' }}>-{money(discountAmount)}</strong>
            </div>
          )}

          <div className="jl-summary-line">
            <span>Tax ({taxRate}%)</span>
            <strong>{money(tax)}</strong>
          </div>

          <div className="jl-summary-line">
            <span>Shipping</span>
            <strong>{money(shipping)}</strong>
          </div>

          <div className="jl-summary-total">
            <span>Total</span>
            <strong style={{color: 'var(--gold-primary)'}}>{money(total)}</strong>
          </div>

          {checkoutError ? <p className="jl-checkout-error" role="alert">{checkoutError}</p> : null}

          {mounted && canPay ? (
            paymentMethod === 'Paystack' ? (
              <PaystackButton
                className="jl-place-order-btn"
                {...paystackConfig}
                disabled={isPlacingOrder}
              />
            ) : (
              <button
                type="button"
                className="jl-place-order-btn jl-opay-pay-button"
                onClick={() => void handleOPayPayment()}
                disabled={isProcessingOPay || isPlacingOrder}
              >
                {isProcessingOPay
                  ? 'Connecting to OPay…'
                  : `Pay ${money(total)} with OPay`}
              </button>
            )
          ) : (
            <button type="button" className="jl-place-order-btn" disabled>
              {!formComplete
                ? 'Fill all details to pay'
                : paymentMethod === 'Paystack' && !paystackEnabled
                  ? 'Paystack setup required'
                  : 'OPay setup required'}
            </button>
          )}

          <p className="jl-payment-security">
            <Lock size={14} aria-hidden="true" />
            Secure payment via {paymentMethod}
          </p>
        </aside>
      </section>
      <Footer />
    </main>
  );
}