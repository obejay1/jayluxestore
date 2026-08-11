# JayLuxe Resend Production Email Integration

Target: `https://jayluxestore.com`  
Framework: Next.js 14 / TypeScript  
Database/Auth: Firebase / Firebase Admin  
Hosting: Vercel  
Email: Resend

## A. Files created

- `lib/email/config.ts` — centralized sender/test/admin configuration.
- `lib/email/service.ts` — centralized Resend SDK, Firestore event idempotency, Resend idempotency keys, logging, test-mode redirection, webhook verification.
- `lib/email/templates.ts` — reusable responsive JayLuxe HTML email templates.
- `lib/email/workflows.ts` — trusted workflow functions for orders, payments, account emails, contact, newsletter and status changes.
- `app/api/email/registration/route.ts` — authenticated welcome/verification trigger.
- `app/api/email/password-reset/route.ts` — generic, rate-limited Resend password reset flow.
- `app/api/email/resend-webhook/route.ts` — signed Resend delivery/bounce/complaint webhook.
- `app/api/admin/orders/[id]/status/route.ts` — authenticated server-side order status changes and status email trigger.
- `app/api/admin/orders/[id]/retry-email/route.ts` — authenticated failed-email retry endpoint.
- `app/api/newsletter/unsubscribe/route.ts` — one-click/list unsubscribe endpoint.
- `app/newsletter-unsubscribed/page.tsx` — unsubscribe result page.

## B. Files modified

See `JayLuxe-Resend-Production-files-changed.txt` for the exact list. Key modifications include:

- `app/api/orders/route.ts` — order/payment emails are triggered only after trusted Paystack verification and successful Firestore order transaction; email failure never rolls back the order.
- `app/checkout/page.tsx` — removed browser-triggered order email call.
- `app/api/send-email/route.ts` — retained as a secured compatibility route, now delegates to centralized workflows.
- `app/api/contact/route.ts` — server validation, honeypot, rate limit, duplicate protection, admin/customer email workflow, durable contact record.
- `app/api/newsletter/route.ts` — durable subscription consent/status, duplicate prevention, welcome/admin email, unsubscribe token.
- `app/api/bookings/route.ts` — centralized Resend service.
- `app/register/page.tsx`, `app/account/page.tsx`, `app/forgot-password/page.tsx` — account emails routed through server APIs rather than client email sending.
- `app/api/admin/users/[uid]/reset-password/route.ts` — centralized branded reset email.
- `app/admin/(protected)/page.tsx` — email delivery status/errors and Retry Email action on orders.
- `lib/store.ts` — admin order status update goes through trusted server route.
- `lib/types.ts` — order email/tracking fields.
- `firestore.rules` — client writes blocked for email/webhook logs; appropriate admin read access only.
- `.env.example`, `env.local.example`, `README.md` — production configuration and test documentation.

## C. Required environment variables

Server-only Resend/email variables:

```env
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>
ORDER_FROM_EMAIL=JayLuxe <orders@jayluxestore.com>
CONTACT_FROM_EMAIL=JayLuxe Support <support@jayluxestore.com>
ACCOUNT_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>
ADMIN_EMAIL_FROM=JayLuxe <admin@jayluxestore.com>
BOOKING_FROM_EMAIL=JayLuxe Support <support@jayluxestore.com>
NEWSLETTER_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>
ADMIN_NOTIFICATION_EMAIL=officialjayluxe.ng@gmail.com
SUPPORT_EMAIL=officialjayluxe.ng@gmail.com
REVIEW_REQUEST_EMAILS_ENABLED=false
```

Only use the `@jayluxestore.com` sender addresses after Resend marks the domain verified.

Existing production variables remain required, including the Firebase client variables, Vercel Firebase Admin service-account values, Paystack, Cloudinary and any other integrations already used by the application. Firebase Admin secrets remain server-only and must never use `NEXT_PUBLIC_*`.

## D. DNS records required for Resend

Use the exact current values displayed under **Resend → Domains → jayluxestore.com**. The current setup requires:

- `TXT`, Name `resend._domainkey`, Value = complete Resend DKIM `p=...` value.
- `MX`, Name `send`, Value = exact Resend `feedback-smtp...amazonses.com` hostname, Priority `10`.
- `TXT`, Name `send`, Value = exact Resend SPF value.
- DMARC may be added after SPF/DKIM verify.

Do not replace/delete Vercel's web A/ALIAS records while adding mail records.

## E. Firebase changes

- Existing Firebase project/database/authentication architecture is preserved.
- New `emailEvents` collection stores deterministic email event records: type, recipient, order/user, attempts, state, Resend message ID, timestamps and errors.
- New `resendWebhookEvents` collection deduplicates signed provider callbacks.
- Existing `newsletterSubscribers` collection now tracks subscription version, unsubscribe token, consent/status, suppression status and email results.
- Contact anti-abuse data is server-written in dedicated rate/dedup collections.
- Firestore rules prevent client writes to email/provider logs.
- No permissive Firebase rules were introduced.

## F. Vercel configuration

1. Add the required server email variables in Vercel Project Settings.
2. Keep valid `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` and correctly formatted PEM `FIREBASE_ADMIN_PRIVATE_KEY` for Vercel.
3. Redeploy after every environment-variable change.
4. In Resend, add a webhook for `https://jayluxestore.com/api/email/resend-webhook` and store its signing secret as `RESEND_WEBHOOK_SECRET`.
5. Verify `jayluxestore.com` in Resend before enabling the production sender addresses.

## G. Implemented email workflows

- Customer order confirmation.
- Customer verified-payment confirmation.
- Admin new-order notification.
- Admin verified-payment notification.
- Order status notifications (Pending, Confirmed, Processing, Ready for Shipment, Packed, Shipped, Out for Delivery, Delivered, Cancelled, Refunded).
- Shipping message with tracking/courier fields when available.
- Delivery confirmation.
- Optional delayed review request (3 days after Delivered).
- Firebase password-reset link delivered through Resend.
- Firebase email-verification link delivered through Resend.
- Welcome email after account registration.
- Contact form admin email plus customer acknowledgement.
- Newsletter subscribe/welcome, consent storage, duplicate prevention and unsubscribe.
- Booking admin notification through the same central service.
- Resend delivery/bounce/complaint event logging/suppression.

## H. Test procedure

Use a Preview deployment with:

```env
```

Then test:

1. Register a new account: welcome and verification messages should arrive at the test mailbox.
2. Request a password reset: UI response remains generic; reset email should arrive.
3. Create a Paystack test order: customer confirmation + payment confirmation + two admin notifications should be logged/sent.
4. Retry/refresh the order workflow: deterministic events must not send duplicates.
5. Change order status in Admin: one corresponding status email; no email when status is unchanged.
6. Mark Shipped with tracking data: shipping template should include tracking.
7. Mark Delivered: delivery email; optional scheduled review email if enabled.
8. Cancel/refund an order: corresponding status email.
9. Submit the contact form: admin email and customer acknowledgement; duplicate/rate-limit checks should work.
10. Subscribe to newsletter twice: only the first active subscription sends the welcome; unsubscribe link sets `marketingConsent=false`.
11. Use Resend webhook test events and verify `providerStatus` in `emailEvents`.
12. Keep production recipient routing enabled; use controlled recipient addresses only when performing manual development/preview verification.

## I. Issues / limitations discovered

- `resend` was already present in `package.json` (`^6.18.1`), so no unnecessary dependency change was made.
- The existing wishlist is browser `localStorage`; there is no reliable server-side per-user wishlist subscription model. Back-in-stock, price-drop and reminder emails were therefore not implemented.
- OPay is currently disabled and has no trusted verified-payment callback in the inspected architecture; payment-success email remains tied to the trusted Paystack verification path only.
- Real inbox rendering in Gmail, Outlook and Apple Mail cannot be fully validated in this sandbox; the templates use a conservative responsive table/inline-style approach and should be tested with Resend test sends.
- Full dependency-based lint/type/build validation could not be completed in this sandbox because dependency installation could not complete. `npm run lint` and `npm run build` therefore report `next: not found`, and TypeScript reports missing installed type packages. Source-level TS/TSX syntax transpilation passed for all project TypeScript files, local `@/` imports resolve, `next.config.js` syntax passed, and project JSON files parse successfully. Run the documented commands in your normal development/Vercel environment with dependencies installed.
