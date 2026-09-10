import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { adminDb } from '@/lib/firebaseAdmin';
import { CartInputError, normalizeRequestedCartItems } from '@/lib/checkout/cart';
import {
  sendInstallmentPaymentReceivedEmail,
  sendInstallmentPlanCreatedEmail,
  sendOrderCreatedEmails,
  sendPaymentConfirmedEmails,
} from '@/lib/email/workflows';
import { addInstallmentMonths, buildInstallmentAmounts, calculateInitialInstallmentAmount } from '@/lib/installments/planMath';
import type { Order, Product } from '@/lib/types';

const CHECKOUT_COMPLETION_COOKIE_PREFIX = 'jl_checkout_';
export const CHECKOUT_COMPLETION_MAX_AGE_SECONDS = 2 * 60 * 60;
const CHECKOUT_TTL_MS = CHECKOUT_COMPLETION_MAX_AGE_SECONDS * 1000;

export function checkoutCompletionCookieName(reference: string) {
  return `${CHECKOUT_COMPLETION_COOKIE_PREFIX}${createHash('sha256').update(reference).digest('hex').slice(0, 20)}`;
}

type CouponData = {
  code?: string;
  discount?: number;
  type?: 'percentage' | 'fixed';
  minOrder?: number;
  expiryDate?: string;
  active?: boolean;
};

export type CheckoutPaymentType = 'Paystack' | 'Installment' | 'OPay';

export type CheckoutIntent = {
  reference: string;
  browserSecretHash: string;
  status: 'pending' | 'completed' | 'expired' | 'initialization_failed';
  reservationStatus: 'reserved' | 'released' | 'consumed';
  createdAt: string;
  expiresAt: string;
  cleanupAt?: string | null;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  couponCode: string;
  paymentType: CheckoutPaymentType;
  installmentCount?: number;
  items: Array<{
    id: string;
    name?: string;
    category?: string;
    price: number;
    qty: number;
    image?: string;
    stockManaged: boolean;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  taxRate: number;
  shippingFee: number;
  discountAmount: number;
  deliveryDaysText: string;
  deliveryDaysCount: number;
  expectedPaymentAmount: number;
  expectedAmountKobo: number;
  currency: 'NGN';
  orderId?: string;
  updatedAt?: string;
};

export class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CheckoutError';
  }
}

export function hashCheckoutSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function safeSecretMatch(rawSecret: string, expectedHash: string) {
  const actual = Buffer.from(hashCheckoutSecret(rawSecret));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeInstallmentCount(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && [2, 3, 4].includes(count) ? count : null;
}

async function resolveCoupon(code: string) {
  if (!code) return null;
  const coupons = adminDb.collection('coupons');
  const direct = await coupons.doc(code).get();
  if (direct.exists) return direct.data() as CouponData;
  const query = await coupons.where('code', '==', code).limit(1).get();
  return query.empty ? null : (query.docs[0].data() as CouponData);
}

async function getCouponDiscount(code: string, subtotal: number) {
  if (!code) return 0;
  const coupon = await resolveCoupon(code);
  if (!coupon || coupon.active === false) throw new CheckoutError('This coupon code is invalid.', 400);
  if (coupon.expiryDate) {
    const expiry = Date.parse(coupon.expiryDate);
    if (Number.isFinite(expiry) && expiry < Date.now()) throw new CheckoutError('This coupon has expired.', 400);
  }
  const minimumOrder = Number(coupon.minOrder || 0);
  if (subtotal < minimumOrder) {
    throw new CheckoutError(`This coupon requires a minimum order of ₦${minimumOrder.toLocaleString('en-NG')}.`, 400);
  }
  const value = Number(coupon.discount || 0);
  if (!Number.isFinite(value) || value <= 0) throw new CheckoutError('This coupon is not configured correctly.', 400);
  const amount = coupon.type === 'fixed' ? value : subtotal * (value / 100);
  return Math.min(subtotal, Math.max(0, Math.round(amount)));
}

async function releaseIntentReservation(reference: string, terminalStatus: 'expired' | 'initialization_failed') {
  const intentRef = adminDb.collection('checkoutIntents').doc(reference);
  await adminDb.runTransaction(async (transaction) => {
    const intentSnap = await transaction.get(intentRef);
    if (!intentSnap.exists) return;
    const intent = intentSnap.data() as CheckoutIntent;
    if (intent.reservationStatus !== 'reserved' || intent.status === 'completed') return;

    const managedItems = intent.items.filter((item) => item.stockManaged);
    const productRefs = managedItems.map((item) => adminDb.collection('products').doc(item.id));
    const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    productSnaps.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const item = managedItems[index];
      const product = snapshot.data() as Product;
      if (typeof product.stock !== 'number') return;
      transaction.update(productRefs[index], {
        stock: Math.max(0, product.stock) + item.qty,
        updatedAt: new Date().toISOString(),
      });
    });
    transaction.set(intentRef, {
      status: terminalStatus,
      reservationStatus: 'released',
      cleanupAt: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function cleanupExpiredCheckoutIntents(limit = 12) {
  const snapshot = await adminDb.collection('checkoutIntents')
    .where('cleanupAt', '<=', new Date().toISOString())
    .limit(limit)
    .get();
  await Promise.all(snapshot.docs.map(async (doc) => {
    const intent = doc.data() as CheckoutIntent;
    if (intent.status === 'pending' && intent.reservationStatus === 'reserved') {
      await releaseIntentReservation(doc.id, 'expired');
    }
  }));
}

export async function prepareCheckoutIntent(input: {
  items: unknown;
  customerName: unknown;
  customerEmail: unknown;
  customerPhone: unknown;
  customerAddress: unknown;
  couponCode: unknown;
  paymentType: unknown;
  installmentCount?: unknown;
  installmentPlan?: Record<string, unknown> | null;
  userId?: string;
}) {
  const customerName = cleanText(input.customerName, 120);
  const customerEmail = cleanText(input.customerEmail, 160).toLowerCase();
  const customerPhone = cleanText(input.customerPhone, 50);
  const customerAddress = cleanText(input.customerAddress, 500);
  const couponCode = cleanText(input.couponCode, 40).toUpperCase();
  const rawPaymentType = cleanText(input.paymentType, 24);
  const paymentType: CheckoutPaymentType = rawPaymentType === 'Installment' ? 'Installment' : rawPaymentType === 'OPay' ? 'OPay' : 'Paystack';
  const installmentCount = paymentType === 'Installment' ? safeInstallmentCount(input.installmentCount) : null;
  const installmentPlan = paymentType === 'Installment' ? (input.installmentPlan || null) : null;

  if (!customerName || !validEmail(customerEmail) || !customerPhone || !customerAddress) {
    throw new CheckoutError('Complete all checkout details before placing the order.', 400);
  }
  if (paymentType === 'Installment' && !installmentCount) throw new CheckoutError('Choose a valid installment plan.', 400);
  if (paymentType === 'Installment' && !input.userId) throw new CheckoutError('Sign in before starting an installment plan.', 401);

  let cartItems;
  try {
    cartItems = normalizeRequestedCartItems(input.items);
  } catch (error) {
    if (error instanceof CartInputError) throw new CheckoutError(error.message, 400);
    throw error;
  }

  await cleanupExpiredCheckoutIntents().catch((error) => console.warn('CHECKOUT_RESERVATION_CLEANUP_FAILED', error));

  const productRefs = cartItems.map((item) => adminDb.collection('products').doc(item.id));
  const snapshots = await Promise.all(productRefs.map((ref) => ref.get()));
  const orderItems = snapshots.map((snapshot, index) => {
    if (!snapshot.exists) throw new CheckoutError(`Product ${cartItems[index].id} is no longer available.`, 409);
    const product = { ...(snapshot.data() as Product), id: snapshot.id };
    if (product.active === false || (product.type && product.type !== 'product')) throw new CheckoutError(`${product.name || 'A product'} is no longer available.`, 409);
    const price = Number(product.price || 0);
    if (!Number.isFinite(price) || price < 0) throw new CheckoutError(`${product.name || 'A product'} has an invalid price.`, 409);
    const qty = cartItems[index].qty;
    if (typeof product.stock === 'number' && product.stock < qty) throw new CheckoutError(`Only ${product.stock} of ${product.name} remain in stock.`, 409);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price,
      qty,
      image: product.image,
      stockManaged: typeof product.stock === 'number',
    };
  });

  const settingsSnapshot = await adminDb.collection('settings').doc('checkout').get();
  const settings = settingsSnapshot.data() as { taxRate?: number; shippingFee?: number; deliveryDaysText?: string; deliveryDaysCount?: number; storeMode?: string; maintenanceEndDate?: string } | undefined;
  const maintenanceActive = settings?.storeMode === 'Maintenance' && (!settings.maintenanceEndDate || Date.parse(settings.maintenanceEndDate) > Date.now());
  if (maintenanceActive) throw new CheckoutError('Checkout is temporarily unavailable while the store is under maintenance.', 503);

  const taxRate = typeof settings?.taxRate === 'number' ? settings.taxRate : 7.5;
  const shippingFee = typeof settings?.shippingFee === 'number' ? settings.shippingFee : 1500;
  const deliveryDaysText = settings?.deliveryDaysText?.trim() || '2–5 business days';
  const deliveryDaysCount = typeof settings?.deliveryDaysCount === 'number' ? settings.deliveryDaysCount : 5;
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = await getCouponDiscount(couponCode, subtotal);
  const tax = Math.round(subtotal * (taxRate / 100));
  const shipping = subtotal > 0 ? shippingFee : 0;
  const total = subtotal + shipping + tax - discountAmount;
  if (total <= 0) throw new CheckoutError('The order total must be greater than zero.', 400);
  const expectedPaymentAmount = paymentType === 'Installment'
    ? calculateInitialInstallmentAmount(total, installmentPlan, installmentCount)
    : total;

  const installmentAmounts = paymentType === 'Installment'
    ? buildInstallmentAmounts(total, installmentCount!, expectedPaymentAmount)
    : [total];

  const reference = `JL-CHECKOUT-${randomUUID()}`;
  const browserSecret = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  const now = new Date();
  const intent: CheckoutIntent = {
    reference,
    browserSecretHash: hashCheckoutSecret(browserSecret),
    status: 'pending',
    reservationStatus: 'reserved',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MS).toISOString(),
    cleanupAt: new Date(now.getTime() + CHECKOUT_TTL_MS).toISOString(),
    ...(input.userId ? { userId: input.userId } : {}),
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    couponCode,
    paymentType,
    ...(installmentCount ? { installmentCount } : {}),
    ...(installmentPlan ? { installmentPlan } : {}),
    items: orderItems,
    subtotal,
    shipping,
    tax,
    total,
    taxRate,
    shippingFee,
    discountAmount,
    deliveryDaysText,
    deliveryDaysCount,
    expectedPaymentAmount,
    expectedAmountKobo: expectedPaymentAmount * 100,
    currency: 'NGN',
  };

  const intentRef = adminDb.collection('checkoutIntents').doc(reference);
  await adminDb.runTransaction(async (transaction) => {
    const currentProducts = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    currentProducts.forEach((snapshot, index) => {
      if (!snapshot.exists) throw new CheckoutError(`${orderItems[index]?.name || 'A product'} is no longer available.`, 409);
      const latest = snapshot.data() as Product;
      const quoted = orderItems[index];
      if (latest.active === false || (latest.type && latest.type !== 'product')) throw new CheckoutError(`${latest.name || quoted.name || 'A product'} is no longer available.`, 409);
      if (Number(latest.price || 0) !== quoted.price) throw new CheckoutError(`${latest.name || quoted.name || 'A product'} changed price. Review your cart and retry.`, 409);
      if (quoted.stockManaged) {
        const stock = Number(latest.stock);
        if (!Number.isFinite(stock) || stock < quoted.qty) throw new CheckoutError(`Only ${Math.max(0, stock || 0)} of ${latest.name || quoted.name} remain in stock.`, 409);
        transaction.update(productRefs[index], { stock: stock - quoted.qty, updatedAt: now.toISOString() });
      }
    });
    transaction.create(intentRef, intent);
  });

  return { intent, browserSecret };
}

export async function markCheckoutInitializationFailed(reference: string) {
  await releaseIntentReservation(reference, 'initialization_failed');
}

export type VerifiedPayment = {
  status?: string;
  amount?: number;
  reference?: string;
  customer?: { email?: string };
  currency?: string;
};

async function verifyPayment(reference: string): Promise<VerifiedPayment> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) throw new CheckoutError('Payment verification is not configured.', 503);
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
  const payload = await response.json() as { status?: boolean; data?: VerifiedPayment };
  if (!response.ok || !payload.status || payload.data?.status !== 'success') throw new CheckoutError('Paystack could not verify this payment.', 402);
  return payload.data || {};
}

function validatePayment(intent: CheckoutIntent, payment: VerifiedPayment) {
  if (payment.status && payment.status.toLowerCase() !== 'success') throw new CheckoutError('The payment is not successful.', 402);
  if (payment.reference && payment.reference !== intent.reference) throw new CheckoutError('The payment reference does not match this checkout.', 400);
  if (payment.currency && payment.currency !== 'NGN') throw new CheckoutError('Unexpected payment currency.', 400);
  if (Number(payment.amount) !== intent.expectedAmountKobo) throw new CheckoutError('The verified payment amount does not match the amount due.', 400);
  const paidEmail = payment.customer?.email?.trim().toLowerCase();
  if (paidEmail && paidEmail !== intent.customerEmail) throw new CheckoutError('The payment email does not match the checkout email.', 400);
}

export async function finalizeCheckoutIntent(
  reference: string,
  suppliedPayment?: VerifiedPayment,
  suppliedProvider?: 'Paystack' | 'OPay',
) {
  const intentRef = adminDb.collection('checkoutIntents').doc(reference);
  const initial = await intentRef.get();
  if (!initial.exists) throw new CheckoutError('This checkout session could not be found.', 404);
  let intent = initial.data() as CheckoutIntent;

  if (intent.status === 'completed' && intent.orderId) {
    const existingOrder = await adminDb.collection('orders').doc(intent.orderId).get();
    if (!existingOrder.exists) throw new CheckoutError('The completed order could not be loaded.', 500);
    const order = { ...(existingOrder.data() as Order), id: existingOrder.id };
    return { order, duplicate: true };
  }
  if (intent.status === 'expired' || intent.status === 'initialization_failed') throw new CheckoutError('This checkout session has expired. Please return to your cart and try again.', 410);

  const provider: 'Paystack' | 'OPay' = suppliedProvider || (intent.paymentType === 'OPay' ? 'OPay' : 'Paystack');

  // OPay returns customers through a browser redirect after Cashier checkout.
  // A redirect alone is never proof of payment. OPay orders must only be
  // finalized after the server has supplied a verified OPay payment result
  // (normally from the webhook/server verification flow).
  if (intent.paymentType === 'OPay' && !suppliedPayment) {
    throw new CheckoutError('OPay payment confirmation is still pending. The order cannot be finalized from the return page.', 409);
  }

  const payment = suppliedPayment || await verifyPayment(reference);
  validatePayment(intent, payment);

  const createdAt = new Date();
  const orderId = randomUUID();
  const accessToken = randomUUID().replaceAll('-', '');
  const estimatedDelivery = new Date(createdAt);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + intent.deliveryDaysCount);
  const installmentCount = intent.paymentType === 'Installment' ? intent.installmentCount! : null;
  const installmentAmounts = intent.paymentType === 'Installment' ? buildInstallmentAmounts(intent.total, installmentCount!, intent.expectedPaymentAmount) : [intent.total];
  const installmentPlanId = intent.paymentType === 'Installment' ? randomUUID() : undefined;
  const remainingBalance = Math.max(0, intent.total - intent.expectedPaymentAmount);

  const order: Order = {
    id: orderId,
    ...(intent.userId ? { userId: intent.userId } : {}),
    accessToken,
    items: intent.items.map(({ stockManaged: _stockManaged, ...item }) => item),
    subtotal: intent.subtotal,
    shipping: intent.shipping,
    tax: intent.tax,
    total: intent.total,
    taxRate: intent.taxRate,
    shippingFee: intent.shippingFee,
    discountAmount: intent.discountAmount,
    paymentMethod: intent.paymentType === 'Installment' ? 'Installment (OPay)' : intent.paymentType === 'OPay' ? 'OPay' : 'Paystack',
    paymentReference: reference,
    paymentStatus: intent.paymentType === 'Installment' && remainingBalance > 0 ? 'Partially Paid' : 'Paid',
    status: 'Processing',
    createdAt: createdAt.toISOString(),
    customerName: intent.customerName,
    customerEmail: intent.customerEmail,
    customerEmailLower: intent.customerEmail,
    customerPhone: intent.customerPhone,
    customerAddress: intent.customerAddress,
    deliveryDays: intent.deliveryDaysText,
    deliveryDaysCount: intent.deliveryDaysCount,
    estimatedDeliveryDate: estimatedDelivery.toISOString(),
    ...(installmentPlanId ? { installmentPlanId } : {}),
  };

  const paymentReferenceId = createHash('sha256').update(reference).digest('hex');
  let duplicateOrderId = '';

  await adminDb.runTransaction(async (transaction) => {
    const latestIntentSnap = await transaction.get(intentRef);
    if (!latestIntentSnap.exists) throw new CheckoutError('This checkout session could not be found.', 404);
    const latestIntent = latestIntentSnap.data() as CheckoutIntent;
    if (latestIntent.status === 'completed' && latestIntent.orderId) {
      duplicateOrderId = latestIntent.orderId;
      return;
    }
    if (latestIntent.reservationStatus !== 'reserved') throw new CheckoutError('This checkout inventory reservation is no longer active.', 409);

    const paymentRef = adminDb.collection('paymentReferences').doc(paymentReferenceId);
    const existingPayment = await transaction.get(paymentRef);
    if (existingPayment.exists) {
      duplicateOrderId = String(existingPayment.data()?.orderId || '');
      transaction.set(intentRef, { status: 'completed', reservationStatus: 'consumed', cleanupAt: null, orderId: duplicateOrderId, updatedAt: createdAt.toISOString() }, { merge: true });
      return;
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    transaction.create(orderRef, order);
    transaction.create(paymentRef, { provider, paymentReference: reference, orderId, installmentPlanId: installmentPlanId || null, createdAt: createdAt.toISOString() });
    transaction.set(intentRef, { status: 'completed', reservationStatus: 'consumed', cleanupAt: null, orderId, updatedAt: createdAt.toISOString() }, { merge: true });

    if (installmentPlanId) {
      const nextPaymentDate = installmentAmounts.length > 1 ? addInstallmentMonths(createdAt, 1).toISOString() : null;
      const productName = intent.items.length === 1 ? intent.items[0].name : `${intent.items.length} JayLuxe items`;
      transaction.create(adminDb.collection('installmentPlans').doc(installmentPlanId), {
        id: installmentPlanId,
        userId: intent.userId,
        orderId,
        customerName: intent.customerName,
        customerEmail: intent.customerEmail,
        customerPhone: intent.customerPhone,
        productName,
        totalAmount: intent.total,
        paidAmount: intent.expectedPaymentAmount,
        amountPaid: intent.expectedPaymentAmount,
        remainingBalance,
        installmentCount,
        completedInstallments: 1,
        nextInstallmentNumber: remainingBalance > 0 ? 2 : null,
        nextPaymentAmount: remainingBalance > 0 ? installmentAmounts[1] : 0,
        nextPaymentDate,
        planDuration: `${installmentCount} payments`,
        provider: 'OPay',
        status: remainingBalance === 0 ? 'completed' : 'active',
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
      installmentAmounts.forEach((amount, index) => {
        const number = index + 1;
        transaction.create(adminDb.collection('installmentSchedules').doc(`${installmentPlanId}_${number}`), {
          planId: installmentPlanId,
          orderId,
          installmentNumber: number,
          amount,
          dueDate: addInstallmentMonths(createdAt, index).toISOString(),
          status: number === 1 ? 'paid' : 'upcoming',
          ...(number === 1 ? { paymentReference: reference, paidAt: createdAt.toISOString() } : {}),
          createdAt: createdAt.toISOString(),
        });
      });
      transaction.create(adminDb.collection('installmentPayments').doc(reference), {
        reference,
        planId: installmentPlanId,
        orderId,
        userId: intent.userId,
        customerName: intent.customerName,
        customerEmail: intent.customerEmail,
        amount: intent.expectedPaymentAmount,
        expectedAmountKobo: intent.expectedAmountKobo,
        currency: 'NGN',
        provider: 'OPay',
        status: 'successful',
        verifiedAt: createdAt.toISOString(),
        remainingBalance,
        createdAt: createdAt.toISOString(),
      });
      transaction.create(adminDb.collection('paymentTransactions').doc(`OPay_${reference}`), {
        planId: installmentPlanId,
        paymentId: reference,
        provider: 'OPay',
        reference,
        amount: intent.expectedPaymentAmount,
        status: 'successful',
        currency: 'NGN',
        idempotencyKey: `OPay_${reference}`,
        createdAt: createdAt.toISOString(),
      });
    }
  });

  if (duplicateOrderId) {
    const existingOrder = await adminDb.collection('orders').doc(duplicateOrderId).get();
    if (!existingOrder.exists) throw new CheckoutError('The completed order could not be loaded.', 500);
    return { order: { ...(existingOrder.data() as Order), id: existingOrder.id }, duplicate: true };
  }

  await adminDb.collection('paymentRecoveries').doc(paymentReferenceId).set({ status: 'linked', orderId, linkedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  const emailJobs: Promise<unknown>[] = [sendOrderCreatedEmails(order)];
  if (installmentPlanId) {
    emailJobs.push(
      sendInstallmentPlanCreatedEmail({ email: intent.customerEmail, customerName: intent.customerName, amount: intent.total, planId: installmentPlanId }),
      sendInstallmentPaymentReceivedEmail({ email: intent.customerEmail, customerName: intent.customerName, amount: intent.expectedPaymentAmount, remaining: remainingBalance, paymentId: reference }),
    );
  } else {
    emailJobs.push(sendPaymentConfirmedEmails(order));
  }
  const emailResults = await Promise.allSettled(emailJobs);
  emailResults.forEach((result) => { if (result.status === 'rejected') console.error('POST-ORDER EMAIL WORKFLOW ERROR:', result.reason); });
  return { order, duplicate: false };
}
