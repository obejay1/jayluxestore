import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.OPAY_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'OPay is not enabled for this store.' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      amount?: unknown;
      email?: unknown;
      name?: unknown;
      phone?: unknown;
      orderId?: unknown;
    };
    const amount = Number(body.amount);
    const email = String(body.email ?? '').trim();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const orderId = String(body.orderId ?? '').trim();

    if (!Number.isFinite(amount) || amount <= 0 || !email || !name || !phone || !orderId) {
      return NextResponse.json({ error: 'Invalid OPay request.' }, { status: 400 });
    }

    const merchantId = process.env.OPAY_MERCHANT_ID?.trim();
    const privateKey = process.env.OPAY_PRIVATE_KEY?.trim();
    if (!merchantId || !privateKey) {
      return NextResponse.json(
        { error: 'OPay merchant credentials are not configured.' },
        { status: 503 },
      );
    }

    const baseUrl = (process.env.OPAY_BASE_URL || 'https://liveapi.opayweb.com').replace(/\/$/, '');
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '');
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    const payload = {
      reference: orderId,
      mchShortName: name,
      productName: 'JayLuxe Order',
      productDesc: 'JayLuxe ecommerce order',
      userPhone: phone,
      userRequestIp: forwardedFor || '127.0.0.1',
      amount: {
        total: Math.round(amount * 100).toString(),
        currency: 'NGN',
      },
      returnUrl: `${appUrl}/opay/callback?orderId=${encodeURIComponent(orderId)}`,
      callbackUrl: `${appUrl}/api/opay/webhook`,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
    };

    const signature = crypto
      .createHmac('sha512', privateKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await fetch(`${baseUrl}/api/v3/cashier/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signature}`,
        MerchantId: merchantId,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = (await response.json()) as { data?: { cashierUrl?: string } };

    if (!response.ok || !data.data?.cashierUrl) {
      return NextResponse.json(
        { error: 'Failed to initialize OPay.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ url: data.data.cashierUrl });
  } catch (error) {
    console.error('OPay initialization error:', error);
    return NextResponse.json({ error: 'OPay initialization failed.' }, { status: 500 });
  }
}
