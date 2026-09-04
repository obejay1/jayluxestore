import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  sendInstallmentPaymentReceivedEmail,
  sendInstallmentPlanCreatedEmail,
  sendOrderCreatedEmails,
  sendPaymentConfirmedEmails,
} from '@/lib/email/workflows';
import { getBearerToken, getVerifiedCustomer } from '@/lib/requestAuth';
import { addInstallmentMonths, buildInstallmentAmounts } from '@/lib/installments/planMath';
import type { Order, Product } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrderRequestBody = {
  reference?: unknown;
  items?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  customerAddress?: unknown;
  couponCode?: unknown;
  paymentType?: unknown;
  installmentCount?: unknown;
};

type PaystackVerification = {
  status?: boolean;
  data?: {
    status?: string;
    amount?: number;
    reference?: string;
    customer?: { email?: string };
    currency?: string;
  };
};

type CouponData = {
  code?: string;
  discount?: number;
  type?: 'percentage' | 'fixed';
  minOrder?: number;
  expiryDate?: string;
  active?: boolean;
};

class OrderRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'OrderRequestError';
  }
}

async function getCouponDiscount(code: string, subtotal: number) {
  if (!code) return 0;

  const coupons = adminDb.collection('coupons');
  const directSnapshot = await coupons.doc(code).get();
  let coupon = directSnapshot.exists
    ? (directSnapshot.data() as CouponData)
    : undefined;

  if (!coupon) {
    const querySnapshot = await coupons.where('code', '==', code).limit(1).get();
    coupon = querySnapshot.empty
      ? undefined
      : (querySnapshot.docs[0].data() as CouponData);
  }

  if (!coupon || coupon.active === false) {
    throw new OrderRequestError('This coupon code is invalid.', 400);
  }

  if (coupon.expiryDate) {
    const expiry = Date.parse(coupon.expiryDate);
    if (Number.isFinite(expiry) && expiry < Date.now()) {
      throw new OrderRequestError('This coupon has expired.', 400);
    }
  }

  const minimumOrder = Number(coupon.minOrder || 0);
  if (subtotal < minimumOrder) {
    throw new OrderRequestError(
      `This coupon requires a minimum order of ₦${minimumOrder.toLocaleString('en-NG')}.`,
      400,
    );
  }

  const discountValue = Number(coupon.discount || 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new OrderRequestError('This coupon is not configured correctly.', 400);
  }

  const amount = coupon.type === 'fixed'
    ? discountValue
    : subtotal * (discountValue / 100);

  return Math.min(subtotal, Math.max(0, Math.round(amount)));
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null;
  return quantity;
}

function safeInstallmentCount(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && [2, 3, 4].includes(count) ? count : null;
}

export async function POST(request: NextRequest) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!paystackSecret) {
    return NextResponse.json(
      { message: 'Payment verification is not configured.' },
      { status: 503 },
    );
  }

  let body: OrderRequestBody;
  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    return NextResponse.json({ message: 'Invalid order request.' }, { status: 400 });
  }

  const reference = cleanText(body.reference, 160);
  const customerName = cleanText(body.customerName, 120);
  const customerEmail = cleanText(body.customerEmail, 160).toLowerCase();
  const customerPhone = cleanText(body.customerPhone, 50);
  const customerAddress = cleanText(body.customerAddress, 500);
  const couponCode = cleanText(body.couponCode, 40).toUpperCase();
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const paymentType = cleanText(body.paymentType, 24) === 'Installment' ? 'Installment' : 'Paystack';
  const installmentCount = paymentType === 'Installment' ? safeInstallmentCount(body.installmentCount) : null;

  console.info('ORDER_CREATION_STARTED', { reference, paymentType, timestamp: new Date().toISOString() });

  if (!reference || !customerName || !validEmail(customerEmail) || !customerPhone || !customerAddress) {
    return NextResponse.json(
      { message: 'Complete all checkout details before placing the order.' },
      { status: 400 },
    );
  }

  if (paymentType === 'Installment' && !installmentCount) {
    return NextResponse.json({ message: 'Choose a valid installment plan.' }, { status: 400 });
  }

  const cartItems = requestedItems
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as { id?: unknown; qty?: unknown };
      const id = cleanText(candidate.id, 120);
      const qty = safeQuantity(candidate.qty);
      return id && qty ? { id, qty } : null;
    })
    .filter((item): item is { id: string; qty: number } => Boolean(item));

  if (cartItems.length === 0 || cartItems.length > 100) {
    return NextResponse.json({ message: 'Your cart is empty or invalid.' }, { status: 400 });
  }

  const suppliedBearerToken = getBearerToken(request);
  const customer = await getVerifiedCustomer(request);
  if (suppliedBearerToken && !customer) {
    return NextResponse.json(
      { message: 'Your customer session has expired. Sign in again and retry.' },
      { status: 401 },
    );
  }

  if (paymentType === 'Installment' && !customer?.uid) {
    return NextResponse.json(
      { message: 'Sign in to your JayLuxe account before starting an installment plan.' },
      { status: 401 },
    );
  }

  if (customer?.email && customer.email.trim().toLowerCase() !== customerEmail) {
    return NextResponse.json(
      { message: 'Use the email address connected to your signed-in account.' },
      { status: 400 },
    );
  }

  try {
    const productSnapshots = await Promise.all(
      cartItems.map((item) => adminDb.collection('products').doc(item.id).get()),
    );

    const orderItems = productSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) {
        throw new OrderRequestError(`Product ${cartItems[index].id} is no longer available.`, 409);
      }

      const product = { ...(snapshot.data() as Product), id: snapshot.id };
      if (product.active === false || (product.type && product.type !== 'product')) {
        throw new OrderRequestError(`${product.name || 'A product'} is no longer available.`, 409);
      }

      const quantity = cartItems[index].qty;
      const price = Number(product.price || 0);
      if (!Number.isFinite(price) || price < 0) {
        throw new OrderRequestError(`${product.name || 'A product'} has an invalid price.`, 409);
      }

      if (typeof product.stock === 'number' && product.stock < quantity) {
        throw new OrderRequestError(`Only ${product.stock} of ${product.name} remain in stock.`, 409);
      }

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        price,
        qty: quantity,
        image: product.image,
      };
    });

    const settingsSnapshot = await adminDb.collection('settings').doc('checkout').get();
    const settings = settingsSnapshot.data() as
      | { taxRate?: number; shippingFee?: number; deliveryDaysText?: string; deliveryDaysCount?: number }
      | undefined;
    const taxRate = typeof settings?.taxRate === 'number' ? settings.taxRate : 7.5;
    const shippingFee = typeof settings?.shippingFee === 'number' ? settings.shippingFee : 1500;
    const deliveryDaysText = settings?.deliveryDaysText?.trim() || '2–5 business days';
    const deliveryDaysCount = typeof settings?.deliveryDaysCount === 'number' ? settings.deliveryDaysCount : 5;

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = await getCouponDiscount(couponCode, subtotal);
    const tax = Math.round(subtotal * (taxRate / 100));
    const shipping = subtotal > 0 ? shippingFee : 0;
    const total = subtotal + shipping + tax - discountAmount;
    if (total <= 0) throw new OrderRequestError('The order total must be greater than zero.', 400);

    const installmentAmounts = paymentType === 'Installment'
      ? buildInstallmentAmounts(total, installmentCount!)
      : [total];
    const expectedPaymentAmount = installmentAmounts[0];

    const verificationResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        cache: 'no-store',
      },
    );
    const verification = (await verificationResponse.json()) as PaystackVerification;

    if (!verificationResponse.ok || !verification.status || verification.data?.status !== 'success') {
      return NextResponse.json({ message: 'Paystack could not verify this payment.' }, { status: 402 });
    }

    if (verification.data.currency && verification.data.currency !== 'NGN') {
      return NextResponse.json({ message: 'Unexpected payment currency.' }, { status: 400 });
    }

    if (verification.data.reference && verification.data.reference !== reference) {
      return NextResponse.json(
        { message: 'The verified payment reference does not match this checkout.' },
        { status: 400 },
      );
    }

    if (Number(verification.data.amount) !== expectedPaymentAmount * 100) {
      return NextResponse.json(
        { message: 'The verified payment amount does not match the amount due.' },
        { status: 400 },
      );
    }

    const paidEmail = verification.data.customer?.email?.trim().toLowerCase();
    if (paidEmail && paidEmail !== customerEmail) {
      return NextResponse.json(
        { message: 'The payment email does not match the checkout email.' },
        { status: 400 },
      );
    }

    const orderId = randomUUID();
    const accessToken = randomUUID().replaceAll('-', '');
    const createdAt = new Date();
    const estimatedDelivery = new Date(createdAt);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDaysCount);
    const installmentPlanId = paymentType === 'Installment' ? randomUUID() : undefined;
    const remainingBalance = Math.max(0, total - expectedPaymentAmount);

    const order: Order = {
      id: orderId,
      userId: customer?.uid,
      accessToken,
      items: orderItems,
      subtotal,
      shipping,
      tax,
      total,
      taxRate,
      shippingFee,
      discountAmount,
      paymentMethod: paymentType === 'Installment' ? 'Installment (Paystack)' : 'Paystack',
      paymentReference: verification.data.reference || reference,
      paymentStatus: paymentType === 'Installment' && remainingBalance > 0 ? 'Partially Paid' : 'Paid',
      status: 'Processing',
      createdAt: createdAt.toISOString(),
      customerName,
      customerEmail,
      customerEmailLower: customerEmail,
      customerPhone,
      customerAddress,
      deliveryDays: deliveryDaysText,
      deliveryDaysCount,
      estimatedDeliveryDate: estimatedDelivery.toISOString(),
      ...(installmentPlanId ? { installmentPlanId } : {}),
    };

    const paymentReferenceId = createHash('sha256').update(order.paymentReference || reference).digest('hex');
    const orderReference = adminDb.collection('orders').doc(orderId);
    const paymentReference = adminDb.collection('paymentReferences').doc(paymentReferenceId);
    const productReferences = cartItems.map((item) => adminDb.collection('products').doc(item.id));

    await adminDb.runTransaction(async (transaction) => {
      const [existingPayment, ...latestProductSnapshots] = await Promise.all([
        transaction.get(paymentReference),
        ...productReferences.map((productReference) => transaction.get(productReference)),
      ]);

      if (existingPayment.exists) {
        throw new OrderRequestError('This payment reference has already been used for an order.', 409);
      }

      latestProductSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) {
          throw new OrderRequestError(`${orderItems[index]?.name || 'A product'} is no longer available.`, 409);
        }
        const latestProduct = snapshot.data() as Product;
        const quantity = cartItems[index].qty;
        if (latestProduct.active === false || (latestProduct.type && latestProduct.type !== 'product')) {
          throw new OrderRequestError(`${latestProduct.name || 'A product'} is no longer available.`, 409);
        }
        if (typeof latestProduct.stock === 'number') {
          if (latestProduct.stock < quantity) {
            throw new OrderRequestError(`Only ${latestProduct.stock} of ${latestProduct.name || 'this product'} remain in stock.`, 409);
          }
          transaction.update(productReferences[index], {
            stock: latestProduct.stock - quantity,
            updatedAt: createdAt.toISOString(),
          });
        }
      });

      transaction.create(orderReference, order);
      transaction.create(paymentReference, {
        provider: 'Paystack',
        paymentReference: order.paymentReference || reference,
        orderId,
        installmentPlanId: installmentPlanId || null,
        createdAt: createdAt.toISOString(),
      });

      if (installmentPlanId) {
        const planRef = adminDb.collection('installmentPlans').doc(installmentPlanId);
        const nextPaymentDate = installmentAmounts.length > 1
          ? addInstallmentMonths(createdAt, 1).toISOString()
          : null;
        const productName = orderItems.length === 1 ? orderItems[0].name : `${orderItems.length} JayLuxe items`;

        transaction.create(planRef, {
          id: installmentPlanId,
          userId: customer!.uid,
          orderId,
          customerName,
          customerEmail,
          customerPhone,
          productName,
          totalAmount: total,
          paidAmount: expectedPaymentAmount,
          amountPaid: expectedPaymentAmount,
          remainingBalance,
          installmentCount: installmentCount!,
          completedInstallments: 1,
          nextInstallmentNumber: remainingBalance > 0 ? 2 : null,
          nextPaymentAmount: remainingBalance > 0 ? installmentAmounts[1] : 0,
          nextPaymentDate,
          planDuration: `${installmentCount} payments`,
          provider: 'Paystack',
          status: remainingBalance === 0 ? 'completed' : 'active',
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
        });

        installmentAmounts.forEach((amount, index) => {
          const installmentNumber = index + 1;
          const scheduleRef = adminDb.collection('installmentSchedules').doc(`${installmentPlanId}_${installmentNumber}`);
          transaction.create(scheduleRef, {
            planId: installmentPlanId,
            orderId,
            installmentNumber,
            amount,
            dueDate: addInstallmentMonths(createdAt, index).toISOString(),
            status: installmentNumber === 1 ? 'paid' : 'upcoming',
            ...(installmentNumber === 1 ? { paymentReference: reference, paidAt: createdAt.toISOString() } : {}),
            createdAt: createdAt.toISOString(),
          });
        });

        const installmentPaymentRef = adminDb.collection('installmentPayments').doc(reference);
        transaction.create(installmentPaymentRef, {
          reference,
          planId: installmentPlanId,
          orderId,
          userId: customer!.uid,
          customerName,
          customerEmail,
          amount: expectedPaymentAmount,
          expectedAmountKobo: expectedPaymentAmount * 100,
          currency: 'NGN',
          provider: 'Paystack',
          status: 'successful',
          verifiedAt: createdAt.toISOString(),
          remainingBalance,
          createdAt: createdAt.toISOString(),
        });

        transaction.create(adminDb.collection('paymentTransactions').doc(`Paystack_${reference}`), {
          planId: installmentPlanId,
          paymentId: reference,
          provider: 'Paystack',
          reference,
          amount: expectedPaymentAmount,
          status: 'successful',
          currency: 'NGN',
          idempotencyKey: `Paystack_${reference}`,
          createdAt: createdAt.toISOString(),
        });
      }
    });

    // Link a webhook recovery record if the provider event arrived before the browser request.
    await adminDb.collection('paymentRecoveries').doc(paymentReferenceId).set({
      status: 'linked',
      orderId,
      linkedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);

    const emailJobs: Promise<unknown>[] = [sendOrderCreatedEmails(order)];
    if (installmentPlanId) {
      emailJobs.push(
        sendInstallmentPlanCreatedEmail({ email: customerEmail, customerName, amount: total, planId: installmentPlanId }),
        sendInstallmentPaymentReceivedEmail({ email: customerEmail, customerName, amount: expectedPaymentAmount, remaining: remainingBalance, paymentId: reference }),
      );
    } else {
      emailJobs.push(sendPaymentConfirmedEmails(order));
    }

    const emailResults = await Promise.allSettled(emailJobs);
    emailResults.forEach((result) => {
      if (result.status === 'rejected') console.error('POST-ORDER EMAIL WORKFLOW ERROR:', result.reason);
    });

    return NextResponse.json(
      { ok: true, orderId, accessToken, order: { ...order, accessToken: undefined } },
      { status: 201 },
    );
  } catch (error) {
    console.error('CREATE_ORDER_ERROR', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    if (error instanceof OrderRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: 'The order could not be created. Please try again.' },
      { status: 500 },
    );
  }
}
