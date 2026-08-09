'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Package,
  Printer,
  ShoppingCart,
  CheckCircle2,
  Circle,
  MapPin,
  Truck,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';

import Footer from '@/components/Footer';
import PageHeroIcon from '@/components/PageHeroIcon';
import { auth } from '@/lib/firebase';
import { getCart, getWishlist, money } from '@/lib/store';
import type { Order } from '@/lib/types';

type AuthMode = 'login' | 'register';


const ORDER_TRACKING_STEPS = [
  'Order Received',
  'Payment Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
] as const;

function trackingStepIndex(order: Order) {
  const normalizedStatus = String(order.status || 'Processing').trim().toLowerCase();
  const statusMap: Record<string, number> = {
    pending: 0,
    received: 0,
    'order received': 0,
    processing: 2,
    packed: 3,
    shipped: 4,
    'out for delivery': 5,
    delivered: 6,
  };

  const statusIndex = statusMap[normalizedStatus] ?? 0;
  const paid = String(order.paymentStatus || '').trim().toLowerCase() === 'paid';
  return Math.max(statusIndex, paid ? 1 : 0);
}

function getFirebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code || '')
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/weak-password':
      return 'Your password must contain at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled in Firebase.';
    default:
      return error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';
  }
}

function safeDate(value?: string): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function AccountPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [profileName, setProfileName] = useState('Valued Customer');

  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateWishlist = () => setWishlistCount(getWishlist().length);
    const updateCart = () =>
      setCartCount(
        getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0),
      );

    updateWishlist();
    updateCart();

    window.addEventListener('wishlist', updateWishlist);
    window.addEventListener('cart', updateCart);

    return () => {
      window.removeEventListener('wishlist', updateWishlist);
      window.removeEventListener('cart', updateCart);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      setAuthError('');
      setAuthMessage('');

      if (!user) {
        setProfileName('Valued Customer');
        setCustomerOrders([]);
        localStorage.removeItem('jj-user');
        return;
      }

      const name =
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        'Valued Customer';

      setProfileName(name);
      setEmail(user.email || '');

      localStorage.setItem(
        'jj-user',
        JSON.stringify({
          uid: user.uid,
          name,
          email: user.email || '',
        }),
      );

      if (user.email) {
        void loadCustomerOrders(user.email);
      }
    });

    return unsubscribe;
  }, []);

  async function loadCustomerOrders(_customerEmail: string) {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const activeUser = auth.currentUser;
      if (!activeUser) {
        throw new Error('Your customer session has expired. Please sign in again.');
      }

      const idToken = await activeUser.getIdToken();
      const response = await fetch('/api/account/orders', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        cache: 'no-store',
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!contentType.toLowerCase().includes('application/json')) {
        console.error('Account orders API returned a non-JSON response', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          preview: text.slice(0, 160),
        });
        throw new Error(
          'The order service is temporarily unavailable. Please refresh in a moment.',
        );
      }

      let data: { orders?: Order[]; message?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { orders?: Order[]; message?: string };
        } catch (parseError) {
          console.error('Account orders API returned invalid JSON', parseError);
          throw new Error(
            'The order service returned an invalid response. Please refresh in a moment.',
          );
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Your orders could not be loaded.');
      }

      const orders = Array.isArray(data.orders) ? data.orders : [];
      setCustomerOrders(
        orders.sort(
          (first, second) =>
            safeDate(second.createdAt) - safeDate(first.createdAt),
        ),
      );
    } catch (error) {
      console.error('Unable to load customer orders:', error);
      setCustomerOrders([]);
      setOrdersError(
        error instanceof Error
          ? error.message
          : 'We could not load your orders. Please refresh and try again.',
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  function clearAuthFeedback() {
    setAuthError('');
    setAuthMessage('');
  }

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setPassword('');
    setConfirmPassword('');
    clearAuthFeedback();
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAuthFeedback();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setAuthError('Please enter your email address and password.');
      return;
    }

    if (authMode === 'register') {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name.');
        return;
      }

      if (password.length < 6) {
        setAuthError('Your password must contain at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('The passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

        await updateProfile(credential.user, {
          displayName: fullName.trim(),
        });

        setProfileName(fullName.trim());
        localStorage.setItem(
          'jj-user',
          JSON.stringify({
            uid: credential.user.uid,
            name: fullName.trim(),
            email: normalizedEmail,
          }),
        );
        try {
          const idToken = await credential.user.getIdToken();
          await fetch('/api/email/registration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ name: fullName.trim() }),
          });
        } catch (emailError) {
          console.error('Registration email workflow failed:', emailError);
        }
        setAuthMessage('Your JayLuxe account has been created. Check your inbox for account emails.');
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
        setAuthMessage('You are now signed in.');
      }

      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordReset() {
    clearAuthFeedback();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setAuthError('Enter your email address first.');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/email/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'The password-reset request could not be completed.');
      }
      setAuthMessage(data.message || 'If the account exists, a password reset link will be sent shortly.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'The password-reset request could not be completed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    clearAuthFeedback();

    try {
      await signOut(auth);
      setAuthMode('login');
      setFullName('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  }

  function getStatusClass(status?: string) {
    switch (status?.toLowerCase()) {
      case 'shipped':
        return 'shipped';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
      case 'refunded':
        return 'cancelled';
      default:
        return 'processing';
    }
  }

  function exportOrderInvoicePDF(order: Order) {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow popups to print your invoice.');
      return;
    }

    const items = order.items || [];
    const subtotal = Number(order.subtotal ?? order.total ?? 0);
    const shipping = Number(order.shipping ?? 0);
    const tax = Number(order.tax ?? 0);
    const total = Number(order.total ?? 0);

    const rows = items
      .map((item) => {
        const price = Number(item.price || 0);
        const quantity = Number(item.qty || 1);

        return `
          <tr>
            <td>${escapeHtml(item.name || 'Product')}</td>
            <td>${escapeHtml(money(price))}</td>
            <td>${quantity}</td>
            <td style="text-align:right">${escapeHtml(money(price * quantity))}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice - Order #${escapeHtml(order.id)}</title>
          <style>
            body { max-width: 820px; margin: 0 auto; padding: 40px; color: #1a1a1a; font-family: Arial, sans-serif; }
            .header { display: flex; justify-content: space-between; gap: 30px; padding-bottom: 20px; margin-bottom: 30px; border-bottom: 2px solid #eaeaea; }
            .brand { margin: 0; color: #a57a1f; font-family: Georgia, serif; }
            .muted { color: #666; }
            .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 35px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
            th, td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background: #f8fafc; }
            .totals { width: 320px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { margin-top: 8px; padding-top: 12px; border-top: 2px solid #eaeaea; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand">JayLuxe</h1>
              <p class="muted">Luxury Beauty, Fashion & Lifestyle</p>
            </div>
            <div style="text-align:right">
              <h2 style="margin:0 0 8px">INVOICE</h2>
              <p><strong>Order ID:</strong> #${escapeHtml(order.id)}</p>
              <p><strong>Date:</strong> ${
                order.createdAt
                  ? escapeHtml(new Date(order.createdAt).toLocaleString())
                  : 'N/A'
              }</p>
            </div>
          </div>

          <div class="invoice-details">
            <div>
              <h3>Bill To</h3>
              <p><strong>${escapeHtml(order.customerName || profileName)}</strong></p>
              <p>${escapeHtml(order.customerEmail || firebaseUser?.email || 'N/A')}</p>
              <p>${escapeHtml(order.customerPhone || 'N/A')}</p>
              <p>${escapeHtml(order.customerAddress || 'N/A')}</p>
            </div>
          </div>

          <h3>Order Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>${escapeHtml(money(subtotal))}</span></div>
            <div class="total-row"><span>Shipping</span><span>${escapeHtml(money(shipping))}</span></div>
            <div class="total-row"><span>Tax</span><span>${escapeHtml(money(tax))}</span></div>
            <div class="total-row grand-total"><span>Total</span><span>${escapeHtml(money(total))}</span></div>
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <main className="jl-account-page">
      <section className="jl-account-hero">
        <PageHeroIcon icon={UserIcon} label="Customer account" />
        <h1 className="font-serif">
          {firebaseUser ? `Welcome, ${profileName}` : 'My Account'}
        </h1>
        <p>
          {firebaseUser
            ? 'View your orders, wishlist and shopping bag.'
            : 'Create an account or sign in to manage your JayLuxe purchases.'}
        </p>
      </section>

      {!authReady ? (
        <section className="jl-account-content">
          <div className="jl-auth-loading">
            <LoaderCircle className="jl-auth-spinner" size={30} />
            <p>Checking your account...</p>
          </div>
        </section>
      ) : !firebaseUser ? (
        <section className="jl-account-content jl-auth-content">
          <div className="jl-auth-layout">
            <aside className="jl-auth-intro">
              <span className="jl-auth-eyebrow">JayLuxe Membership</span>
              <h2 className="font-serif">Luxury shopping made personal.</h2>
              <p>
                Create your customer account to keep your order history in one
                place and return to your saved products.
              </p>

              <div className="jl-auth-benefits">
                <div>
                  <Package size={20} />
                  <span>
                    <strong>Order history</strong>
                    <small>Track purchases made with your account email.</small>
                  </span>
                </div>

                <div>
                  <Heart size={20} />
                  <span>
                    <strong>Saved wishlist</strong>
                    <small>Return to products you love.</small>
                  </span>
                </div>

                <div>
                  <LockKeyhole size={20} />
                  <span>
                    <strong>Secure sign-in</strong>
                    <small>Your password is handled by Firebase Authentication.</small>
                  </span>
                </div>
              </div>
            </aside>

            <div className="jl-auth-card">
              <div className="jl-auth-tabs" role="tablist" aria-label="Account access">
                <button
                  type="button"
                  className={authMode === 'login' ? 'active' : ''}
                  onClick={() => changeAuthMode('login')}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className={authMode === 'register' ? 'active' : ''}
                  onClick={() => changeAuthMode('register')}
                >
                  Create Account
                </button>
              </div>

              <div className="jl-auth-heading">
                {authMode === 'register' ? <UserPlus size={25} /> : <KeyRound size={25} />}
                <div>
                  <h2>{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
                  <p>
                    {authMode === 'register'
                      ? 'Enter your details to join JayLuxe.'
                      : 'Sign in with your customer email and password.'}
                  </p>
                </div>
              </div>

              <form className="jl-auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <label>
                    <span>Full name</span>
                    <div className="jl-auth-input">
                      <UserIcon size={18} />
                      <input
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </label>
                )}

                <label>
                  <span>Email address</span>
                  <div className="jl-auth-input">
                    <Mail size={18} />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </label>

                <label>
                  <span>Password</span>
                  <div className="jl-auth-input">
                    <LockKeyhole size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="jl-auth-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {authMode === 'register' && (
                  <label>
                    <span>Confirm password</span>
                    <div className="jl-auth-input">
                      <LockKeyhole size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Enter the password again"
                        minLength={6}
                        required
                      />
                    </div>
                  </label>
                )}

                {authError && <p className="jl-auth-alert error" role="alert">{authError}</p>}
                {authMessage && <p className="jl-auth-alert success" role="status">{authMessage}</p>}

                <button type="submit" className="jl-auth-submit" disabled={authLoading}>
                  {authLoading ? (
                    <>
                      <LoaderCircle className="jl-auth-spinner" size={19} />
                      Please wait
                    </>
                  ) : authMode === 'register' ? (
                    <>
                      <UserPlus size={19} />
                      Create Account
                    </>
                  ) : (
                    <>
                      <KeyRound size={19} />
                      Sign In
                    </>
                  )}
                </button>

                {authMode === 'login' && (
                  <button
                    type="button"
                    className="jl-auth-reset"
                    onClick={handlePasswordReset}
                    disabled={authLoading}
                  >
                    Forgot your password?
                  </button>
                )}
              </form>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="jl-account-overview">
            <article>
              <UserIcon size={22} />
              <span><small>Welcome</small><strong>{profileName}</strong></span>
            </article>

            <article>
              <Package size={22} />
              <span><small>Your orders</small><strong>{customerOrders.length}</strong></span>
            </article>

            <Link href="/wishlist">
              <Heart size={22} />
              <span><small>Wishlist</small><strong>{wishlistCount} saved</strong></span>
            </Link>

            <Link href="/cart">
              <ShoppingCart size={22} />
              <span><small>Shopping bag</small><strong>{cartCount} items</strong></span>
            </Link>
          </section>

          <section className="jl-account-content">
            <div className="jl-account-profile-bar">
              <div>
                <small>Signed in as</small>
                <strong>{firebaseUser.email}</strong>
              </div>

              <button type="button" onClick={handleLogout} disabled={authLoading}>
                <LogOut size={17} />
                Sign Out
              </button>
            </div>

            <div className="jl-order-history">
              <div className="jl-order-history-header">
                <div>
                  <small>Customer dashboard</small>
                  <h2>Order History</h2>
                </div>

                <button
                  type="button"
                  onClick={() => firebaseUser.email && void loadCustomerOrders(firebaseUser.email)}
                  disabled={ordersLoading}
                >
                  Refresh orders
                </button>
              </div>

              {ordersLoading ? (
                <div className="jl-auth-loading compact">
                  <LoaderCircle className="jl-auth-spinner" size={25} />
                  <p>Loading your orders...</p>
                </div>
              ) : ordersError ? (
                <p className="jl-auth-alert error">{ordersError}</p>
              ) : customerOrders.length === 0 ? (
                <div className="jl-account-empty-orders">
                  <Package size={34} />
                  <h3>No orders yet</h3>
                  <p>
                    Orders placed with <strong>{firebaseUser.email}</strong> will appear here.
                  </p>
                  <Link href="/shop">Start Shopping</Link>
                </div>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="jl-order-history-item">
                    <div>
                      <strong>Order ID</strong>
                      <span>#{order.id}</span>
                    </div>

                    <div>
                      <strong>Date</strong>
                      <span>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <div>
                      <strong>Total</strong>
                      <span>{money(Number(order.total || 0))}</span>
                    </div>

                    <div>
                      <strong>Status</strong>
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status || 'Processing'}
                      </span>
                    </div>

                    <div className="jl-order-history-actions">
                      <Link href={`/order/${order.id}`}>
                        View Order <ChevronRight size={18} />
                      </Link>

                      <button type="button" onClick={() => exportOrderInvoicePDF(order)}>
                        <Printer size={16} />
                        Print Invoice
                      </button>
                    </div>

                    <div className="jl-account-tracking">
                      <div className="jl-account-tracking-meta">
                        <span>
                          <Truck size={17} aria-hidden="true" />
                          <strong>Order tracking</strong>
                        </span>
                        <span>
                          Estimated delivery:{' '}
                          <strong>
                            {order.estimatedDeliveryDate
                              ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
                              : order.deliveryDays || 'To be confirmed'}
                          </strong>
                        </span>
                        <span>
                          <MapPin size={17} aria-hidden="true" />
                          {order.customerAddress || 'Shipping address not available'}
                        </span>
                      </div>

                      <ol className="jl-account-tracking-steps">
                        {ORDER_TRACKING_STEPS.map((step, index) => {
                          const complete = index <= trackingStepIndex(order);
                          return (
                            <li key={step} className={complete ? 'complete' : ''}>
                              {complete ? (
                                <CheckCircle2 size={18} aria-hidden="true" />
                              ) : (
                                <Circle size={18} aria-hidden="true" />
                              )}
                              <span>{step}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      <Footer />
    </main>
  );
}
