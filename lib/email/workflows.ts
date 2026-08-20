import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getEmailConfig } from '@/lib/email/config';
import { sendManagedEmail, type ManagedEmailResult } from '@/lib/email/service';
import {
  adminNewOrderTemplate,
  adminOrderStatusTemplate,
  adminPaymentTemplate,
  contactAcknowledgementTemplate,
  contactAdminTemplate,
  newsletterAdminTemplate,
  newsletterWelcomeTemplate,
  orderConfirmationTemplate,
  orderStatusTemplate,
  passwordResetTemplate,
  paymentConfirmationTemplate,
  reviewRequestTemplate,
  verificationTemplate,
  welcomeTemplate,
} from '@/lib/email/templates';
import { getSiteUrlString } from '@/lib/site';
import { buildBrandedPasswordResetLink } from '@/lib/passwordReset';
import type { Order } from '@/lib/types';

function recipient(order: Order) {
  return order.customerEmail?.trim().toLowerCase() || '';
}

function formatOrderTemplateDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || 'N/A';

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(parsed);
}

function formatOrderTemplateMoney(value: number) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function getOrderUrl(order: Order) {
  const siteUrl = getSiteUrlString();
  return `${siteUrl}/order/${encodeURIComponent(order.id)}${order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : ''}`;
}

function getOrderConfirmationTemplateVariables(order: Order) {
  return {
    CUSTOMER_NAME: order.customerName || order.customer?.name || 'Customer',
    ORDER_NUMBER: `#${order.id}`,
    ORDER_DATE: formatOrderTemplateDate(order.createdAt),
    ORDER_TOTAL: formatOrderTemplateMoney(order.total),
    DELIVERY_ADDRESS:
      order.customerAddress ||
      order.shippingAddress ||
      order.address ||
      order.customer?.address ||
      'To be confirmed',
    ORDER_URL: getOrderUrl(order),
  };
}

async function recordOrderEmailSummary(orderId: string, fields: Record<string, unknown>) {
  try {
    await adminDb.collection('orders').doc(orderId).set({
      ...fields,
      emailUpdatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('ORDER EMAIL SUMMARY UPDATE ERROR:', error);
  }
}

export async function sendOrderCreatedEmails(order: Order) {
  const customer = recipient(order);
  const emailConfig = getEmailConfig();
  const admin = emailConfig.adminRecipient;
  const orderConfirmationTemplateId = emailConfig.orderConfirmationTemplateId;
  const results: ManagedEmailResult[] = [];

  if (customer) {
    const template = orderConfirmationTemplate(order);
    const result = await sendManagedEmail({
      eventKey: `order-confirmation:${order.id}`,
      emailType: 'order_confirmation',
      to: customer,
      sender: 'orders',
      orderId: order.id,
      userId: order.userId,
      ...template,
      template: orderConfirmationTemplateId
        ? {
            id: orderConfirmationTemplateId,
            variables: getOrderConfirmationTemplateVariables(order),
          }
        : undefined,
    });
    results.push(result);
    await recordOrderEmailSummary(order.id, {
      confirmationEmailStatus: result.status,
      confirmationEmailId: result.resendId || null,
      confirmationEmailError: result.error || null,
      confirmationEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
      lastEmailType: 'order_confirmation',
      lastEmailStatus: result.status,
      lastEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
    });
  }

  if (admin) {
    const template = adminNewOrderTemplate(order);
    results.push(await sendManagedEmail({
      eventKey: `admin-new-order:${order.id}`,
      emailType: 'admin_new_order',
      to: admin,
      sender: 'admin',
      orderId: order.id,
      replyTo: customer || undefined,
      ...template,
    }));
  }

  return results;
}

export async function sendPaymentConfirmedEmails(order: Order) {
  const customer = recipient(order);
  const admin = getEmailConfig().adminRecipient;
  const results: ManagedEmailResult[] = [];

  if (customer) {
    const template = paymentConfirmationTemplate(order);
    const result = await sendManagedEmail({
      eventKey: `payment-confirmation:${order.id}:${order.paymentReference || 'verified'}`,
      emailType: 'payment_confirmation',
      to: customer,
      sender: 'orders',
      orderId: order.id,
      userId: order.userId,
      ...template,
    });
    results.push(result);
    await recordOrderEmailSummary(order.id, {
      paymentEmailStatus: result.status,
      paymentEmailId: result.resendId || null,
      paymentEmailError: result.error || null,
      paymentEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
      lastEmailType: 'payment_confirmation',
      lastEmailStatus: result.status,
      lastEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
    });
  }

  if (admin) {
    const template = adminPaymentTemplate(order);
    results.push(await sendManagedEmail({
      eventKey: `admin-payment:${order.id}:${order.paymentReference || 'verified'}`,
      emailType: 'admin_payment_confirmation',
      to: admin,
      sender: 'admin',
      orderId: order.id,
      ...template,
    }));
  }

  return results;
}

export async function sendOrderStatusEmail(order: Order, status: string) {
  const customer = recipient(order);
  if (!customer) return { ok: false, status: 'failed' as const, error: 'Order customer email is missing.' };

  const template = orderStatusTemplate(order, status);
  const result = await sendManagedEmail({
    eventKey: `order-status:${order.id}:${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    emailType: 'order_status',
    to: customer,
    sender: 'orders',
    orderId: order.id,
    userId: order.userId,
    ...template,
  });

  await recordOrderEmailSummary(order.id, {
    statusEmailLastStatus: status,
    statusEmailStatus: result.status,
    statusEmailId: result.resendId || null,
    statusEmailError: result.error || null,
    statusEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
    lastEmailType: `order_status:${status}`,
    lastEmailStatus: result.status,
    lastEmailSentAt: result.ok && !result.skipped ? new Date().toISOString() : null,
  });

  if (status === 'Cancelled' || status === 'Refunded') {
    const admin = getEmailConfig().adminRecipient;
    if (admin) {
      const adminTemplate = adminOrderStatusTemplate(order, status);
      await sendManagedEmail({
        eventKey: `admin-order-status:${order.id}:${status.toLowerCase()}`,
        emailType: status === 'Refunded' ? 'admin_refund' : 'admin_order_cancellation',
        to: admin,
        sender: 'admin',
        orderId: order.id,
        ...adminTemplate,
      });
    }
  }

  if (status === 'Delivered' && getEmailConfig().reviewRequestEnabled) {
    const reviewTemplate = reviewRequestTemplate(order);
    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await sendManagedEmail({
      eventKey: `review-request:${order.id}`,
      emailType: 'review_request',
      to: customer,
      sender: 'orders',
      orderId: order.id,
      userId: order.userId,
      scheduledAt,
      ...reviewTemplate,
    });
  }

  return result;
}

export async function sendRegistrationEmails(input: { uid: string; email: string; name: string }) {
  const siteUrl = getSiteUrlString();
  const verificationLink = await adminAuth.generateEmailVerificationLink(input.email, {
    url: `${siteUrl}/account`,
    handleCodeInApp: false,
  });

  const verification = verificationTemplate(input.name, verificationLink);
  const welcome = welcomeTemplate(input.name);

  return Promise.all([
    sendManagedEmail({
      eventKey: `account-verification:${input.uid}`,
      emailType: 'account_verification',
      to: input.email,
      sender: 'noreply',
      userId: input.uid,
      ...verification,
    }),
    sendManagedEmail({
      eventKey: `welcome:${input.uid}`,
      emailType: 'welcome',
      to: input.email,
      sender: 'noreply',
      userId: input.uid,
      ...welcome,
    }),
  ]);
}

export async function sendPasswordResetEmailWithResend(email: string) {
  const user = await adminAuth.getUserByEmail(email);
  const siteUrl = getSiteUrlString();
  const firebaseResetLink = await adminAuth.generatePasswordResetLink(email, {
    url: `${siteUrl}/login`,
    handleCodeInApp: false,
  });
  const resetLink = buildBrandedPasswordResetLink(firebaseResetLink);
  const template = passwordResetTemplate(user.displayName || 'Customer', resetLink);
  return sendManagedEmail({
    eventKey: `password-reset:${user.uid}:${Date.now().toString().slice(0, -5)}`,
    emailType: 'password_reset',
    to: email,
    sender: 'noreply',
    userId: user.uid,
    ...template,
  });
}

export async function sendContactEmails(input: { id: string; name: string; email: string; phone?: string; subject: string; message: string }) {
  const config = getEmailConfig();
  const adminTemplate = contactAdminTemplate(input);
  const customerTemplate = contactAcknowledgementTemplate(input.name);

  const [adminResult, customerResult] = await Promise.all([
    sendManagedEmail({
      eventKey: `contact-admin:${input.id}`,
      emailType: 'contact_admin',
      to: config.adminRecipient,
      sender: 'support',
      replyTo: input.email,
      ...adminTemplate,
    }),
    sendManagedEmail({
      eventKey: `contact-ack:${input.id}`,
      emailType: 'contact_acknowledgement',
      to: input.email,
      sender: 'support',
      ...customerTemplate,
    }),
  ]);

  return { adminResult, customerResult };
}

export async function sendNewsletterWelcome(input: { subscriberId: string; email: string; unsubscribeUrl: string; subscriptionVersion?: number }) {
  const template = newsletterWelcomeTemplate(input.unsubscribeUrl);
  return sendManagedEmail({
    eventKey: `newsletter-welcome:${input.subscriberId}:v${input.subscriptionVersion || 1}`,
    emailType: 'newsletter_welcome',
    to: input.email,
    sender: 'newsletter',
    headers: {
      'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    ...template,
  });
}

export async function sendNewsletterAdminNotification(input: { subscriberId: string; email: string; subscriptionVersion?: number }) {
  const template = newsletterAdminTemplate(input.email);
  return sendManagedEmail({
    eventKey: `newsletter-admin:${input.subscriberId}:v${input.subscriptionVersion || 1}`,
    emailType: 'newsletter_admin_notification',
    to: getEmailConfig().adminRecipient,
    sender: 'admin',
    replyTo: input.email,
    ...template,
  });
}
