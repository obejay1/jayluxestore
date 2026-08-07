import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(request: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.ORDER_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.CONTACT_FROM_EMAIL?.trim();

  if (!resendKey || !fromEmail) {
    return NextResponse.json(
      { message: 'Order email delivery is not configured.' },
      { status: 503 },
    );
  }

  let body: { orderId?: unknown; accessToken?: unknown };
  try {
    body = (await request.json()) as { orderId?: unknown; accessToken?: unknown };
  } catch {
    return NextResponse.json({ message: 'Invalid email request.' }, { status: 400 });
  }

  const orderId = String(body.orderId ?? '').trim();
  const accessToken = String(body.accessToken ?? '').trim();
  if (!orderId || !accessToken) {
    return NextResponse.json({ message: 'Order verification is required.' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb.collection('orders').doc(orderId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    const order = {
      ...(snapshot.data() as Order),
      id: snapshot.id,
    } as Order & { confirmationEmailStatus?: string };
    if (!order.accessToken || order.accessToken !== accessToken) {
      return NextResponse.json({ message: 'Invalid order access token.' }, { status: 403 });
    }

    if (order.confirmationEmailStatus === 'sent') {
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    const recipient = order.customerEmail?.trim().toLowerCase();
    if (!recipient) {
      return NextResponse.json({ message: 'Order email is missing.' }, { status: 400 });
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin
    ).replace(/\/$/, '');
    const orderUrl = `${siteUrl}/order/${encodeURIComponent(order.id)}?token=${encodeURIComponent(accessToken)}`;
    const itemRows = (order.items || [])
      .map((item) => {
        const quantity = Number(item.qty || item.quantity || 1);
        const price = Number(item.price || 0);
        return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #ececec">${escapeHtml(item.name || 'Product')}</td>
            <td style="padding:12px 0;border-bottom:1px solid #ececec;text-align:center">${quantity}</td>
            <td style="padding:12px 0;border-bottom:1px solid #ececec;text-align:right">${escapeHtml(money(price * quantity))}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <div style="margin:0;background:#f4f1eb;padding:28px;font-family:Arial,sans-serif;color:#171717">
        <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8e0d2">
          <div style="background:#111111;padding:28px;text-align:center">
            <p style="margin:0 0 6px;color:#d2ae54;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">JayLuxe</p>
            <h1 style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:30px;font-weight:500">Order confirmed</h1>
          </div>
          <div style="padding:30px">
            <p style="font-size:16px;line-height:1.65">Hello <strong>${escapeHtml(order.customerName || 'Customer')}</strong>, your payment was verified and order <strong>#${escapeHtml(order.id)}</strong> is being prepared.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0">
              <thead><tr><th style="text-align:left;padding-bottom:10px">Item</th><th style="padding-bottom:10px">Qty</th><th style="text-align:right;padding-bottom:10px">Total</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="border-top:2px solid #171717;padding-top:16px;display:flex;justify-content:space-between;font-size:20px;font-weight:700">
              <span>Order total</span><span>${escapeHtml(money(order.total))}</span>
            </div>
            <p style="margin:22px 0;color:#666;line-height:1.6">Estimated delivery: ${escapeHtml(order.deliveryDays || '2–5 business days')}</p>
            <p style="text-align:center;margin:28px 0 8px">
              <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#c8a24b;color:#111;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">View your order</a>
            </p>
          </div>
        </div>
      </div>`;

    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject: `JayLuxe order confirmation #${order.id}`,
      html,
    }, {
      idempotencyKey: `order-confirmation/${order.id}`,
    });

    if (error) {
      throw new Error(error.message);
    }

    await snapshot.ref.set(
      {
        confirmationEmailStatus: 'sent',
        confirmationEmailId: data?.id || null,
        confirmationEmailSentAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ORDER EMAIL ERROR:', error);
    return NextResponse.json(
      { message: 'The order was saved, but the confirmation email could not be sent.' },
      { status: 502 },
    );
  }
}
