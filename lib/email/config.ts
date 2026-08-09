export type EmailSenderKind =
  | 'orders'
  | 'support'
  | 'noreply'
  | 'admin'
  | 'bookings'
  | 'newsletter';

const DEFAULT_ADMIN_RECIPIENT = 'officialjayluxe.ng@gmail.com';

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || '',
    adminRecipient:
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim() ||
      DEFAULT_ADMIN_RECIPIENT,
    supportEmail:
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.CONTACT_TO_EMAIL?.trim() ||
      DEFAULT_ADMIN_RECIPIENT,
    testMode: process.env.EMAIL_TEST_MODE?.trim().toLowerCase() === 'true',
    testRecipient: process.env.EMAIL_TEST_RECIPIENT?.trim() || '',
    reviewRequestEnabled:
      process.env.REVIEW_REQUEST_EMAILS_ENABLED?.trim().toLowerCase() === 'true',
  };
}

export function getEmailSender(kind: EmailSenderKind): string {
  const fallback = process.env.RESEND_FROM_EMAIL?.trim() || '';

  const senderByKind: Record<EmailSenderKind, string> = {
    orders: process.env.ORDER_FROM_EMAIL?.trim() || fallback,
    support: process.env.CONTACT_FROM_EMAIL?.trim() || fallback,
    noreply: process.env.ACCOUNT_FROM_EMAIL?.trim() || fallback,
    admin: process.env.ADMIN_EMAIL_FROM?.trim() || fallback,
    bookings: process.env.BOOKING_FROM_EMAIL?.trim() || fallback,
    newsletter: process.env.NEWSLETTER_FROM_EMAIL?.trim() || fallback,
  };

  return senderByKind[kind];
}
