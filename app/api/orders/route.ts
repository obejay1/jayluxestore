import { NextRequest, NextResponse } from 'next/server';

import {
  checkoutCompletionCookieName,
  CheckoutError,
  type CheckoutIntent,
  finalizeCheckoutIntent,
  safeSecretMatch,
} from '@/lib/checkout/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanReference(value: unknown) {
  return String(value ?? '').trim().slice(0, 180);
}

function parseCompletionCookie(value?: string) {
  const raw = String(value || '');
  const separator = raw.indexOf('.');
  if (separator <= 0) return null;
  return { reference: raw.slice(0, separator), secret: raw.slice(separator + 1) };
}

export async function POST(request: NextRequest) {
  let body: { reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid order request.' }, { status: 400 });
  }

  const reference = cleanReference(body.reference);
  if (!reference) return NextResponse.json({ message: 'Missing checkout reference.' }, { status: 400 });

  try {
    const intentSnapshot = await adminDb.collection('checkoutIntents').doc(reference).get();
    if (!intentSnapshot.exists) return NextResponse.json({ message: 'This checkout session could not be found.' }, { status: 404 });
    const intent = intentSnapshot.data() as CheckoutIntent;

    const customer = await getVerifiedCustomer(request);
    const customerOwnsIntent = Boolean(customer?.uid && intent.userId && customer.uid === intent.userId);
    const cookie = parseCompletionCookie(request.cookies.get(checkoutCompletionCookieName(reference))?.value);
    const cookieAuthorizes = Boolean(cookie && cookie.reference === reference && safeSecretMatch(cookie.secret, intent.browserSecretHash));

    if (!customerOwnsIntent && !cookieAuthorizes) {
      return NextResponse.json({ message: 'This checkout confirmation is no longer authorized in this browser.' }, { status: 403 });
    }

    const result = await finalizeCheckoutIntent(reference);
    const { accessToken, ...safeOrder } = result.order;
    if (!accessToken) throw new CheckoutError('The order access credential is unavailable.', 500);

    const response = NextResponse.json({
      ok: true,
      orderId: result.order.id,
      accessToken,
      order: safeOrder,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 201 });
    response.cookies.set(checkoutCompletionCookieName(reference), '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    console.error('CREATE_ORDER_ERROR', { message: error instanceof Error ? error.message : String(error), reference, timestamp: new Date().toISOString() });
    if (error instanceof CheckoutError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'The order could not be created. Please try again.' }, { status: 500 });
  }
}
