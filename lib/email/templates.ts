import { getSiteUrlString } from '@/lib/site';
import type { Order } from '@/lib/types';

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value: unknown): string {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function date(value: unknown): string {
  if (!value) return 'N/A';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return esc(value);
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(parsed);
}

function button(label: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px auto">
      <tr><td style="border-radius:999px;background:#c99f37">
        <a href="${esc(href)}" style="display:inline-block;padding:14px 24px;color:#17130f;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:.02em">${esc(label)}</a>
      </td></tr>
    </table>`;
}

function shell(title: string, body: string, options?: { eyebrow?: string; footerNote?: string }): string {
  const siteUrl = getSiteUrlString();
  const supportEmail =
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    'officialjayluxe.ng@gmail.com';
  const logoUrl = `${siteUrl}/jayluxe-logo.png`;

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    @media only screen and (max-width:640px){
      .jl-card{width:100%!important;border-radius:0!important}.jl-pad{padding:24px 18px!important}.jl-title{font-size:28px!important}.jl-table td,.jl-table th{font-size:13px!important}.jl-hide-mobile{display:none!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f0e7;font-family:Arial,Helvetica,sans-serif;color:#1c1813">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f0e7;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" class="jl-card" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #e7dcc9;border-radius:22px;overflow:hidden">
        <tr><td style="background:#17130f;padding:28px 24px;text-align:center">
          <img src="${esc(logoUrl)}" width="150" alt="JayLuxe" style="display:block;max-width:150px;height:auto;margin:0 auto 16px">
          <div style="color:#d4af55;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${esc(options?.eyebrow || 'JayLuxe')}</div>
          <h1 class="jl-title" style="margin:9px 0 0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.18;font-weight:500">${esc(title)}</h1>
        </td></tr>
        <tr><td class="jl-pad" style="padding:32px">${body}</td></tr>
        <tr><td style="padding:24px 30px;background:#faf7f1;border-top:1px solid #eee4d5;text-align:center;color:#756b5d;font-size:12px;line-height:1.7">
          <div>${esc(options?.footerNote || 'Luxury beauty, fashion and lifestyle — thoughtfully curated by JayLuxe.')}</div>
          <div style="margin-top:8px"><a href="${esc(siteUrl)}" style="color:#8b681c;text-decoration:none">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a> · <a href="mailto:${esc(supportEmail)}" style="color:#8b681c;text-decoration:none">${esc(supportEmail)}</a></div>
          <div style="margin-top:8px">© ${new Date().getFullYear()} JayLuxe. All rights reserved.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderItems(order: Order): string {
  const rows = (order.items || []).map((item) => {
    const qty = Number(item.qty || item.quantity || 1);
    const lineTotal = Number(item.price || 0) * qty;
    const image = item.image
      ? `<img src="${esc(item.image)}" alt="" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:cover;border-radius:10px;border:1px solid #eee4d5">`
      : '';
    return `<tr>
      <td style="padding:12px 8px 12px 0;border-bottom:1px solid #eee7dc;width:60px">${image}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #eee7dc"><strong>${esc(item.name || 'Product')}</strong><div style="margin-top:4px;color:#847a6d;font-size:12px">Qty: ${qty}</div></td>
      <td style="padding:12px 0 12px 8px;border-bottom:1px solid #eee7dc;text-align:right;font-weight:700">${esc(money(lineTotal))}</td>
    </tr>`;
  }).join('');

  return `<table role="presentation" class="jl-table" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">${rows}</table>`;
}

function totals(order: Order): string {
  const discount = Number(order.discountAmount || 0);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#746b60">Subtotal</td><td style="padding:6px 0;text-align:right">${esc(money(order.subtotal))}</td></tr>
    <tr><td style="padding:6px 0;color:#746b60">Shipping</td><td style="padding:6px 0;text-align:right">${esc(money(order.shipping ?? order.shippingFee ?? 0))}</td></tr>
    <tr><td style="padding:6px 0;color:#746b60">Tax</td><td style="padding:6px 0;text-align:right">${esc(money(order.tax))}</td></tr>
    ${discount > 0 ? `<tr><td style="padding:6px 0;color:#746b60">Discount</td><td style="padding:6px 0;text-align:right;color:#247243">−${esc(money(discount))}</td></tr>` : ''}
    <tr><td style="padding:13px 0 0;border-top:2px solid #17130f;font-size:18px;font-weight:800">Total</td><td style="padding:13px 0 0;border-top:2px solid #17130f;text-align:right;font-size:18px;font-weight:800">${esc(money(order.total))}</td></tr>
  </table>`;
}

export function orderConfirmationTemplate(order: Order) {
  const siteUrl = getSiteUrlString();
  const orderUrl = `${siteUrl}/order/${encodeURIComponent(order.id)}${order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : ''}`;
  const body = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7">Hello <strong>${esc(order.customerName || 'Customer')}</strong>, thank you for shopping with JayLuxe. Your order has been confirmed and is now being prepared.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:14px"><strong>Order</strong><br><span style="color:#746b60">#${esc(order.id)}</span></td><td style="padding:14px;text-align:right"><strong>Order date</strong><br><span style="color:#746b60">${esc(date(order.createdAt))}</span></td></tr>
    </table>
    ${orderItems(order)}
    ${totals(order)}
    <div style="margin-top:22px;padding:18px;background:#faf7f1;border-radius:14px;border:1px solid #eee4d5">
      <strong>Shipping address</strong><div style="margin-top:7px;color:#655d53;line-height:1.65">${esc(order.customerAddress || order.shippingAddress || order.address || 'Not supplied')}</div>
      <div style="margin-top:12px;color:#655d53"><strong>Payment:</strong> ${esc(order.paymentMethod || 'Payment')} · ${esc(order.paymentStatus || 'Confirmed')}</div>
      <div style="margin-top:7px;color:#655d53"><strong>Estimated delivery:</strong> ${esc(order.deliveryDays || (order.estimatedDeliveryDate ? date(order.estimatedDeliveryDate) : 'To be confirmed'))}</div>
    </div>
    ${button('View Your Order', orderUrl)}`;

  return {
    subject: `Your JayLuxe Order #${order.id} Has Been Confirmed`,
    html: shell('Order Confirmation', body, { eyebrow: 'Order confirmed' }),
    text: `Hello ${order.customerName || 'Customer'}, your JayLuxe order #${order.id} has been confirmed. Total: ${money(order.total)}. View your order: ${orderUrl}`,
  };
}

export function paymentConfirmationTemplate(order: Order) {
  const siteUrl = getSiteUrlString();
  const orderUrl = `${siteUrl}/order/${encodeURIComponent(order.id)}${order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : ''}`;
  const body = `
    <p style="font-size:16px;line-height:1.7">Hello <strong>${esc(order.customerName || 'Customer')}</strong>, we successfully verified your payment for JayLuxe order <strong>#${esc(order.id)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:10px 16px;color:#746b60">Amount</td><td style="padding:10px 16px;text-align:right;font-weight:800">${esc(money(order.total))}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Reference</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentReference || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Method</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentMethod || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Status</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentStatus || 'Paid')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Payment date</td><td style="padding:10px 16px;text-align:right">${esc(date(order.createdAt))}</td></tr>
    </table>
    ${button('View Order', orderUrl)}`;
  return {
    subject: `Payment Confirmed for JayLuxe Order #${order.id}`,
    html: shell('Payment Confirmed', body, { eyebrow: 'Secure payment verified' }),
    text: `Payment confirmed for JayLuxe order #${order.id}. Amount: ${money(order.total)}. Reference: ${order.paymentReference || 'N/A'}.`,
  };
}

export function adminNewOrderTemplate(order: Order) {
  const siteUrl = getSiteUrlString();
  const adminUrl = `${siteUrl}/admin#orders`;
  const body = `
    <p style="font-size:16px;line-height:1.7">A new JayLuxe order has been created successfully.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:9px 14px;color:#746b60">Order</td><td style="padding:9px 14px;text-align:right;font-weight:800">#${esc(order.id)}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Customer</td><td style="padding:9px 14px;text-align:right">${esc(order.customerName || 'N/A')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Email</td><td style="padding:9px 14px;text-align:right">${esc(order.customerEmail || 'N/A')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Phone</td><td style="padding:9px 14px;text-align:right">${esc(order.customerPhone || 'N/A')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Payment</td><td style="padding:9px 14px;text-align:right">${esc(order.paymentStatus || 'N/A')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Total</td><td style="padding:9px 14px;text-align:right;font-weight:800">${esc(money(order.total))}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Address</td><td style="padding:9px 14px;text-align:right">${esc(order.customerAddress || 'N/A')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Date</td><td style="padding:9px 14px;text-align:right">${esc(date(order.createdAt))}</td></tr>
    </table>
    <h2 style="margin:24px 0 8px;font-family:Georgia,serif;font-size:20px">Items</h2>
    ${orderItems(order)}
    ${button('View Order in Admin Dashboard', adminUrl)}`;
  return {
    subject: `New JayLuxe Order #${order.id}`,
    html: shell('New Order Alert', body, { eyebrow: 'Admin notification' }),
    text: `New order #${order.id} from ${order.customerName || 'Customer'} (${order.customerEmail || 'N/A'}). Total: ${money(order.total)}.`,
  };
}

export function adminPaymentTemplate(order: Order) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:16px;line-height:1.7">Payment has been verified for order <strong>#${esc(order.id)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:10px 16px;color:#746b60">Customer</td><td style="padding:10px 16px;text-align:right">${esc(order.customerName || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Reference</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentReference || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Amount</td><td style="padding:10px 16px;text-align:right;font-weight:800">${esc(money(order.total))}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Method</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentMethod || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Status</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentStatus || 'Paid')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Date</td><td style="padding:10px 16px;text-align:right">${esc(date(order.createdAt))}</td></tr>
    </table>${button('Open Admin Dashboard', `${siteUrl}/admin#orders`)}`;
  return {
    subject: `JayLuxe Payment Confirmed — Order #${order.id}`,
    html: shell('Payment Notification', body, { eyebrow: 'Admin notification' }),
    text: `Payment confirmed for order #${order.id}. Reference: ${order.paymentReference || 'N/A'}. Amount: ${money(order.total)}.`,
  };
}

export function orderStatusTemplate(order: Order, status: string) {
  const siteUrl = getSiteUrlString();
  const orderUrl = `${siteUrl}/order/${encodeURIComponent(order.id)}${order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : ''}`;
  const normalized = status.trim();
  const headingByStatus: Record<string, string> = {
    Pending: 'We Received Your Order',
    Confirmed: 'Your Order Is Confirmed',
    Processing: 'Your Order Is Being Processed',
    'Ready for Shipment': 'Your Order Is Ready for Shipment',
    Packed: 'Your Order Has Been Packed',
    Shipped: 'Your Order Has Been Shipped',
    'Out for Delivery': 'Your Order Is Out for Delivery',
    Delivered: 'Your JayLuxe Order Has Been Delivered',
    Cancelled: 'Your JayLuxe Order Has Been Cancelled',
    Refunded: 'Your JayLuxe Order Has Been Refunded',
  };
  const heading = headingByStatus[normalized] || `Order Update: ${normalized}`;

  const shippingDetails = normalized === 'Shipped' || normalized === 'Out for Delivery'
    ? `<div style="margin:20px 0;padding:18px;background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
        <strong>Shipping details</strong>
        <div style="margin-top:8px;color:#655d53;line-height:1.7">Courier: ${esc(order.courier || 'To be confirmed')}<br>Tracking number: ${esc(order.trackingNumber || 'To be confirmed')}<br>Estimated delivery: ${esc(order.estimatedDeliveryDate ? date(order.estimatedDeliveryDate) : order.deliveryDays || 'To be confirmed')}</div>
      </div>
      ${order.trackingUrl ? button('Track Your Order', order.trackingUrl) : ''}`
    : '';

  const deliveryDetails = normalized === 'Delivered'
    ? `<div style="margin:20px 0;padding:18px;background:#f3f8f1;border:1px solid #dbe9d7;border-radius:14px"><strong>Delivered</strong><div style="margin-top:8px;color:#52604c">Delivered on ${esc(date(order.deliveredAt || new Date().toISOString()))}.</div></div>`
    : '';

  const body = `<p style="font-size:16px;line-height:1.7">Hello <strong>${esc(order.customerName || 'Customer')}</strong>, here is the latest update for JayLuxe order <strong>#${esc(order.id)}</strong>.</p>
    <div style="margin:20px 0;padding:18px;background:#17130f;color:#fff;border-radius:14px;text-align:center"><div style="font-size:12px;color:#d4af55;text-transform:uppercase;letter-spacing:.14em">Current status</div><div style="margin-top:8px;font-size:22px;font-family:Georgia,serif">${esc(normalized)}</div></div>
    ${shippingDetails}${deliveryDetails}${orderItems(order)}
    ${button(normalized === 'Delivered' ? 'Shop Again' : 'View Your Order', normalized === 'Delivered' ? `${siteUrl}/shop` : orderUrl)}`;

  return {
    subject: normalized === 'Processing'
      ? `Your JayLuxe Order #${order.id} Is Being Processed`
      : normalized === 'Shipped'
        ? `Your JayLuxe Order #${order.id} Has Been Shipped`
        : normalized === 'Delivered'
          ? `Your JayLuxe Order #${order.id} Has Been Delivered`
          : normalized === 'Cancelled'
            ? `Your JayLuxe Order #${order.id} Has Been Cancelled`
            : normalized === 'Refunded'
              ? `Your JayLuxe Order #${order.id} Has Been Refunded`
              : `JayLuxe Order #${order.id} — ${normalized}`,
    html: shell(heading, body, { eyebrow: 'Order update' }),
    text: `Hello ${order.customerName || 'Customer'}, your JayLuxe order #${order.id} status is now ${normalized}. View your order: ${orderUrl}`,
  };
}


export function adminOrderStatusTemplate(order: Order, status: string) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:16px;line-height:1.7">Order <strong>#${esc(order.id)}</strong> has been updated to <strong>${esc(status)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:10px 16px;color:#746b60">Customer</td><td style="padding:10px 16px;text-align:right">${esc(order.customerName || 'Customer')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Email</td><td style="padding:10px 16px;text-align:right">${esc(order.customerEmail || 'N/A')}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Status</td><td style="padding:10px 16px;text-align:right">${esc(status)}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Total</td><td style="padding:10px 16px;text-align:right">${esc(money(order.total))}</td></tr>
      <tr><td style="padding:10px 16px;color:#746b60">Payment</td><td style="padding:10px 16px;text-align:right">${esc(order.paymentStatus || 'N/A')}</td></tr>
    </table>
    ${button('View Order in Admin Dashboard', `${siteUrl}/admin#orders`)}`;
  return {
    subject: `JayLuxe Order #${order.id} — ${status}`,
    html: shell('Order Status Notification', body, { eyebrow: 'Admin notification' }),
    text: `JayLuxe order #${order.id} for ${order.customerName || order.customerEmail || 'Customer'} is now ${status}. Total: ${money(order.total)}.`,
  };
}

export function passwordResetTemplate(name: string, resetLink: string) {
  const body = `<p style="font-size:16px;line-height:1.7">Hello <strong>${esc(name || 'Customer')}</strong>, we received a request to reset your JayLuxe password.</p>
    <p style="color:#655d53;line-height:1.7">Use the secure button below to continue. This Firebase-generated action link is time-limited. If you did not request a password reset, you can safely ignore this email.</p>
    ${button('Reset Password', resetLink)}
    <div style="margin-top:22px;padding:16px;background:#fff7e9;border:1px solid #eed9ad;border-radius:12px;color:#6d5a34;font-size:13px;line-height:1.65">For your security, JayLuxe will never ask you to send your password by email.</div>`;
  return {
    subject: 'Reset Your JayLuxe Password',
    html: shell('Reset Your Password', body, { eyebrow: 'Account security' }),
    text: `Reset your JayLuxe password using this secure link: ${resetLink}. If you did not request this, ignore this email.`,
  };
}

export function verificationTemplate(name: string, verificationLink: string) {
  const body = `<p style="font-size:16px;line-height:1.7">Hello <strong>${esc(name || 'Customer')}</strong>, please verify your email address to complete your JayLuxe account setup.</p>
    ${button('Verify Email Address', verificationLink)}
    <p style="color:#655d53;font-size:13px;line-height:1.7">If you did not create a JayLuxe account, you can ignore this email.</p>`;
  return {
    subject: 'Verify Your JayLuxe Account',
    html: shell('Verify Your Account', body, { eyebrow: 'Account verification' }),
    text: `Verify your JayLuxe account: ${verificationLink}`,
  };
}

export function welcomeTemplate(name: string) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:17px;line-height:1.75">Welcome, <strong>${esc(name || 'Customer')}</strong>. Your JayLuxe account is ready for a more personalised luxury shopping experience.</p>
    <p style="color:#655d53;line-height:1.7">Save favourites, follow eligible orders and discover curated beauty, fashion, bridal and lifestyle selections.</p>
    ${button('Shop Now', `${siteUrl}/shop`)}
    ${button('Visit My Account', `${siteUrl}/account`)}`;
  return {
    subject: 'Welcome to JayLuxe',
    html: shell('Welcome to JayLuxe', body, { eyebrow: 'A refined shopping experience' }),
    text: `Welcome to JayLuxe, ${name || 'Customer'}. Shop now: ${siteUrl}/shop. My Account: ${siteUrl}/account`,
  };
}

export function contactAdminTemplate(input: { id: string; name: string; email: string; phone?: string; subject: string; message: string }) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:16px;line-height:1.7">A customer submitted a new message through the JayLuxe website.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f1;border:1px solid #eee4d5;border-radius:14px">
      <tr><td style="padding:9px 14px;color:#746b60">Name</td><td style="padding:9px 14px;text-align:right">${esc(input.name)}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Email</td><td style="padding:9px 14px;text-align:right">${esc(input.email)}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Phone</td><td style="padding:9px 14px;text-align:right">${esc(input.phone || 'Not supplied')}</td></tr>
      <tr><td style="padding:9px 14px;color:#746b60">Subject</td><td style="padding:9px 14px;text-align:right">${esc(input.subject)}</td></tr>
    </table>
    <div style="margin-top:18px;padding:18px;background:#fff;border:1px solid #eee4d5;border-radius:14px;line-height:1.75;white-space:pre-wrap">${esc(input.message)}</div>
    ${button('Open Admin Dashboard', `${siteUrl}/admin#messages`)}`;
  return {
    subject: 'New Customer Message - JayLuxe',
    html: shell('New Customer Message', body, { eyebrow: 'Admin notification' }),
    text: `New JayLuxe customer message from ${input.name} (${input.email}). Subject: ${input.subject}\n\n${input.message}`,
  };
}

export function contactAcknowledgementTemplate(name: string) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:16px;line-height:1.7">Hello <strong>${esc(name || 'Customer')}</strong>, thank you for contacting JayLuxe.</p>
    <p style="color:#655d53;line-height:1.75">Your message has been received and saved securely. A member of the JayLuxe team will review it and respond as soon as possible.</p>
    ${button('Visit JayLuxe', siteUrl)}`;
  return {
    subject: 'We Received Your Message - JayLuxe',
    html: shell('We Received Your Message', body, { eyebrow: 'Customer care' }),
    text: `Hello ${name || 'Customer'}, we received your JayLuxe message and will respond as soon as possible.`,
  };
}

export function newsletterWelcomeTemplate(unsubscribeUrl: string) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:17px;line-height:1.75">Your subscription to <strong>The JayLuxe Edit</strong> is confirmed.</p>
    <p style="color:#655d53;line-height:1.75">Expect curated luxury arrivals, beauty notes, bridal inspiration and private offers from JayLuxe.</p>
    ${button('Explore JayLuxe', `${siteUrl}/shop`)}
    <p style="margin-top:26px;color:#81776b;font-size:12px;line-height:1.7;text-align:center">You are receiving this because you subscribed to JayLuxe marketing updates. <a href="${esc(unsubscribeUrl)}" style="color:#8b681c">Unsubscribe</a>.</p>`;
  return {
    subject: 'Welcome to the JayLuxe Edit',
    html: shell('Welcome to the JayLuxe Edit', body, { eyebrow: 'Newsletter' }),
    text: `Your JayLuxe newsletter subscription is confirmed. Unsubscribe: ${unsubscribeUrl}`,
  };
}


export function newsletterAdminTemplate(email: string) {
  const body = `<p style="font-size:16px;line-height:1.7">A new subscriber joined The JayLuxe Edit.</p><div style="padding:18px;background:#faf7f1;border:1px solid #eee4d5;border-radius:14px"><strong>${esc(email)}</strong><div style="margin-top:6px;color:#746b60;font-size:13px">Source: website newsletter form</div></div>`;
  return {
    subject: 'New JayLuxe Newsletter Subscriber',
    html: shell('New Newsletter Subscriber', body, { eyebrow: 'Admin notification' }),
    text: `New JayLuxe newsletter subscriber: ${email}`,
  };
}

export function reviewRequestTemplate(order: Order) {
  const siteUrl = getSiteUrlString();
  const body = `<p style="font-size:16px;line-height:1.7">Hello <strong>${esc(order.customerName || 'Customer')}</strong>, we hope you are enjoying your JayLuxe purchase from order <strong>#${esc(order.id)}</strong>.</p>
    ${orderItems(order)}
    <p style="color:#655d53;line-height:1.7">Your feedback helps us improve the JayLuxe experience for every customer.</p>
    ${button('Review Your Purchase', `${siteUrl}/testimonials`)}`;
  return {
    subject: 'How Was Your JayLuxe Purchase?',
    html: shell('How Was Your JayLuxe Purchase?', body, { eyebrow: 'We value your feedback' }),
    text: `How was your JayLuxe purchase from order #${order.id}? Share your feedback: ${siteUrl}/testimonials`,
  };
}
