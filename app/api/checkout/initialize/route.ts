import { NextRequest, NextResponse } from 'next/server';
import {
  CHECKOUT_COMPLETION_MAX_AGE_SECONDS,
  checkoutCompletionCookieName,
  CheckoutError,
  markCheckoutInitializationFailed,
  prepareCheckoutIntent,
} from '@/lib/checkout/server';
import { getBearerToken, getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!paystackSecret) return NextResponse.json({ message: 'Paystack is not configured.' }, { status: 503 });

  try {
    const body = await request.json();
    const suppliedBearer = getBearerToken(request);
    const customer = await getVerifiedCustomer(request);
    if (suppliedBearer && !customer) return NextResponse.json({ message: 'Your session has expired. Sign in again and retry.' }, { status: 401 });

    const requestedEmail = String(body?.customerEmail || '').trim().toLowerCase();
    if (customer?.email && customer.email.trim().toLowerCase() !== requestedEmail) {
      return NextResponse.json({ message: 'Use the email address connected to your signed-in account.' }, { status: 400 });
    }

    const { intent, browserSecret } = await prepareCheckoutIntent({ ...body, userId: customer?.uid });
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin).replace(/\/$/, '');

    let providerResponse: Response;
    try {
      providerResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: intent.customerEmail,
          amount: intent.expectedAmountKobo,
          currency: 'NGN',
          reference: intent.reference,
          callback_url: `${siteUrl}/checkout/complete?reference=${encodeURIComponent(intent.reference)}`,
          metadata: {
            type: 'checkout',
            paymentType: intent.paymentType,
            ...(intent.userId ? { userId: intent.userId } : {}),
          },
        }),
        cache: 'no-store',
      });
    } catch (error) {
      await markCheckoutInitializationFailed(intent.reference);
      throw error;
    }

    const providerData = await providerResponse.json() as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!providerResponse.ok || !providerData.status || !providerData.data?.authorization_url) {
      await markCheckoutInitializationFailed(intent.reference);
      return NextResponse.json({ message: providerData.message || 'Unable to initialize payment.' }, { status: 502 });
    }

    const response = NextResponse.json({ authorizationUrl: providerData.data.authorization_url, reference: intent.reference, amount: intent.expectedPaymentAmount });
    response.cookies.set(checkoutCompletionCookieName(intent.reference), `${intent.reference}.${browserSecret}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CHECKOUT_COMPLETION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error('CHECKOUT_INITIALIZE_ERROR', error);
    return NextResponse.json({ message: 'Checkout could not be initialized. Please try again.' }, { status: 500 });
  }
}
