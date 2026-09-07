'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getCart, getProducts, money, setCart as persistCart } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';
import { getCheckoutSettings } from '@/lib/settings';
import { validateCoupon } from '@/lib/coupons';
import type { Product } from '@/lib/types';
import { showToast } from '@/lib/toast';
import Footer from '@/components/Footer';
import ResponsiveImage from '@/components/ResponsiveImage';
import PageHeroIcon from '@/components/PageHeroIcon';
import { CreditCard, Lock } from 'lucide-react';
import { auth, db } from '@/lib/firebase';

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

type OpayCheckoutResponse = {
  success?: boolean;
  code?: string | null;
  error?: string | null;
  message?: string | null;
  notifyLanguage?: string | null;
  reference?: string | null;
  amount?: number | null;
  url?: string | null;
  paymentUrl?: string | null;
  cashierUrl?: string | null;
  data?: {
    url?: string | null;
    paymentUrl?: string | null;
    cashierUrl?: string | null;
    reference?: string | null;
    orderNo?: string | null;
    status?: string | null;
    referenceCode?: string | null;
  } | null;
};

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
    'OPay'
  );
  const [installmentCount, setInstallmentCount] = useState(4);
  const [isProcessingOPay, setIsProcessingOPay] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [checkoutError, setCheckoutError] = useState('');
  const [opayReferenceCode, setOpayReferenceCode] = useState('');

  const opayEnabled = process.env.NEXT_PUBLIC_OPAY_ENABLED === 'true';
  const paystackEnabled = false;
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

  const installmentPlans = [2, 3, 4].map((count) => {
    const firstPayment = Math.ceil(safeTotal / count);
    const remainingBalance = Math.max(0, safeTotal - firstPayment);
    const remainingPayments = count - 1;

    return {
      count,
      firstPayment,
      remainingBalance,
      remainingPayments,
      nextPayment: remainingPayments > 0
        ? Math.ceil(remainingBalance / remainingPayments)
        : 0,
    };
  });

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

    if (isProcessingOPay) return;

    try {
      setIsProcessingOPay(true);
      setCheckoutError('');
      setOpayReferenceCode('');

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const response = await fetch('/api/opay/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          couponCode: appliedCouponCode,
          // JayLuxe keeps the compact locale code internally. The API route
          // maps this safely to OPay's provider-specific enum.
          notifyLanguage: 'en',
        }),
      });

      const data = await readJsonResponse<OpayCheckoutResponse>(response);
      const notifyLanguage = data?.notifyLanguage ?? 'en';
      void notifyLanguage;

      if (!response.ok || data?.success === false) {
        const paymentError =
          data?.error?.trim() ||
          data?.message?.trim() ||
          'Could not initialize OPay payment. Please try again.';
        setCheckoutError(paymentError);
        showToast(paymentError, 'error');
        return;
      }

      const opayUrl =
        data?.url ??
        data?.paymentUrl ??
        data?.cashierUrl ??
        data?.data?.url ??
        data?.data?.paymentUrl ??
        data?.data?.cashierUrl ??
        null;

      if (opayUrl) {
        window.location.assign(opayUrl);
        return;
      }

      // Cashier flow requires cashierUrl. A missing URL is not a successful payment.
      const referenceCode = data?.data?.referenceCode?.trim() || '';
      if (referenceCode) {
        setOpayReferenceCode(referenceCode);
        showToast('OPay did not return a checkout page. Please try again.', 'success');
        return;
      }

      const unexpectedResponse =
        'OPay responded successfully but did not return a payment link or reference code.';
      setCheckoutError(unexpectedResponse);
      showToast(unexpectedResponse, 'error');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'OPay payment initialization failed. Please try again.';
      setCheckoutError(message);
      showToast(message, 'error');
    } finally {
      setIsProcessingOPay(false);
    }
  }


  async function initializePaystackCheckout() {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);
    setCheckoutError('');

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const response = await fetch('/api/checkout/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
          customerName: fullName,
          customerEmail: email,
          customerPhone: phone,
          customerAddress: address,
          couponCode: appliedCouponCode,
          paymentType: paymentMethod,
          installmentCount: paymentMethod === 'Installment' ? installmentCount : null,
        }),
      });
      const data = await readJsonResponse<{ authorizationUrl?: string; message?: string; amount?: number }>(response);
      if (!response.ok || !data.authorizationUrl) {
        throw new Error(data.message || 'Secure payment could not be initialized.');
      }

      trackEvent('begin_checkout', {
        currency: 'NGN',
        value: Number(data.amount ?? (paymentMethod === 'Installment' ? installmentInitialAmount : total)),
        items: items.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          item_category: item.category || 'Beauty',
          price: item.price,
          quantity: item.qty,
        })),
      });

      window.location.assign(data.authorizationUrl);
    } catch (error) {
      console.error('CHECKOUT_INITIALIZATION_FAILED', error);
      const message = error instanceof Error ? error.message : 'Payment initialization failed. Please try again.';
      setCheckoutError(message);
      showToast(message, 'error');
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
    paymentMethod === 'Paystack' ? paystackEnabled : opayEnabled;
  const installmentAccountReady = paymentMethod !== 'Installment' || Boolean(userId);
  const canPay = formComplete && selectedPaymentEnabled && installmentAccountReady;


  
  const installmentInfo = installmentCount > 1 ? (
    <div className="jl-installment-summary-card">
      <h3>Pay in Installments</h3>
      <p>Split your purchase into manageable payments.</p>
      <div className="jl-installment-grid">
        <div>
          <span>Total order</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Payments</span>
          <strong>{installmentCount}</strong>
        </div>
      </div>
      <p className="jl-installment-opay">
        Payments securely processed with OPay Wallet
      </p>
    </div>
  ) : null;

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
                  setCheckoutError('Paystack is currently unavailable.');
                }}
                disabled
                aria-disabled="true"
              >
                <span className="jl-payment-option-header">
                  <strong className="jl-payment-option-title">Paystack</strong>
                  {paymentMethod === 'Paystack' ? (
                    <span className="jl-payment-selected">Selected</span>
                  ) : null}
                </span>
                <span className="jl-payment-option-description">
                  Currently unavailable
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'Installment'}
                className={`jl-payment-option ${paymentMethod === 'Installment' ? 'active' : ''}`}
                onClick={() => {
                  setCheckoutError('');
                  setOpayReferenceCode('');
                  setPaymentMethod('Installment');
                }}
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
                aria-disabled={false}
                disabled={false}
                className={`jl-payment-option jl-payment-opay ${
                  paymentMethod === 'OPay' ? 'active' : ''
                }`}
                onClick={() => {
                  setCheckoutError('');
                  setOpayReferenceCode('');
                  setPaymentMethod('OPay');
                }}
              >
                <span className="jl-payment-option-header">
                  <strong className="jl-payment-option-title">OPay Wallet</strong>
                  {opayEnabled ? (
                    paymentMethod === 'OPay' ? (
                      <span className="jl-payment-selected">Selected</span>
                    ) : null
                  ) : (
                    <span className="jl-payment-unavailable">Setup required</span>
                  )}
                </span>
                <span className="jl-payment-option-description">
                  Pay securely using your OPay Wallet account
                </span>
              </button>
            </div>
            {paymentMethod === 'Installment' && !userId ? (
              <p className="jl-payment-notice">Sign in to your JayLuxe account before starting an installment plan so your balance and future payments can be tracked securely.</p>
            ) : null}
            {paymentMethod === 'Installment' ? (
              <div className="jl-installment-plan-section">
                <div className="jl-installment-plan-header">
                  <span>Choose installment plan</span>
                  <h3>Select your preferred payment schedule</h3>
                  <p>
                    Pay your first installment today with OPay Wallet.
                    Remaining balance will be scheduled automatically.
                  </p>
                </div>

                <div className="jl-installment-plan-cards">
                  {installmentPlans.map((plan) => (
                    <button
                      key={plan.count}
                      type="button"
                      className={`jl-installment-plan-card ${installmentCount === plan.count ? 'active' : ''}`}
                      onClick={() => setInstallmentCount(plan.count)}
                    >
                      <strong>{plan.count} Payments</strong>

                      <div>
                        <small>Pay today</small>
                        <h4>{money(plan.firstPayment)}</h4>
                      </div>

                      <p>
                        Remaining: {money(plan.remainingBalance)}
                      </p>

                      <p>
                        {plan.remainingPayments > 0
                          ? `${plan.remainingPayments} future payments of about ${money(plan.nextPayment)}`
                          : 'Complete payment today'}
                      </p>

                      {installmentCount === plan.count && (
                        <span>Selected</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
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
            paymentMethod === 'OPay' ? (
              <button
                type="button"
                className="jl-place-order-btn jl-opay-pay-button"
                onClick={() => void handleOPayPayment()}
                disabled={isProcessingOPay || isPlacingOrder}
              >
                {isProcessingOPay ? 'Connecting to OPay…' : `Pay ${money(total)} with OPay`}
              </button>
            ) : (
              <button
                type="button"
                className="jl-place-order-btn"
                onClick={() => void handleOPayPayment()}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder
                  ? 'Preparing secure payment…'
                  : paymentMethod === 'Installment'
                    ? `Pay ${money(installmentInitialAmount)} with OPay`
                    : `Pay ${money(total)} with OPay`}
              </button>
            )
          ) : (
            <button type="button" className="jl-place-order-btn" disabled>
              {!formComplete
                ? 'Fill all details to pay'
                : 'Payment setup required'}
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