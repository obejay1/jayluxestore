export type EmailSenderKind =
  | 'orders'
  | 'support'
  | 'noreply'
  | 'admin'
  | 'bookings'
  | 'newsletter';

const DEFAULT_ADMIN_RECIPIENT = 'support@jayluxestore.com';

const DEFAULT_SENDERS: Record<EmailSenderKind, string> = {
  orders: 'JayLuxe Orders <orders@jayluxestore.com>',
  support: 'JayLuxe Support <support@jayluxestore.com>',
  noreply: 'JayLuxe <noreply@jayluxestore.com>',
  admin: 'JayLuxe Admin <admin@jayluxestore.com>',
  bookings: 'JayLuxe Support <support@jayluxestore.com>',
  newsletter: 'The JayLuxe Edit <noreply@jayluxestore.com>',
};

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || '',
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET?.trim() || '',
    adminRecipient:
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim() ||
      DEFAULT_ADMIN_RECIPIENT,
    supportEmail:
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim() ||
      DEFAULT_ADMIN_RECIPIENT,
    reviewRequestEnabled:
      process.env.REVIEW_REQUEST_EMAILS_ENABLED?.trim().toLowerCase() === 'true',
    orderConfirmationTemplateId:
      process.env.RESEND_ORDER_CONFIRMATION_TEMPLATE_ID?.trim() || '',
  };
}

function isJayLuxeSender(value?: string) {
  if (!value) return false;

  const sender = value.toLowerCase();

  // Prevent production from accidentally using unverified senders
  // such as onboarding@resend.dev or unrelated Gmail addresses.
  return sender.includes('@jayluxestore.com>');
}

export function getEmailSender(kind: EmailSenderKind): string {
  const generic = process.env.RESEND_FROM_EMAIL?.trim();

  const senderByKind: Record<EmailSenderKind, string | undefined> = {
    orders: process.env.ORDER_FROM_EMAIL?.trim(),
    support: process.env.CONTACT_FROM_EMAIL?.trim(),
    noreply: process.env.ACCOUNT_FROM_EMAIL?.trim(),
    admin: process.env.ADMIN_EMAIL_FROM?.trim(),
    bookings: process.env.BOOKING_FROM_EMAIL?.trim(),
    newsletter: process.env.NEWSLETTER_FROM_EMAIL?.trim(),
  };

  const configuredSender = senderByKind[kind] || generic;

  return isJayLuxeSender(configuredSender)
    ? configuredSender!
    : DEFAULT_SENDERS[kind];
}
