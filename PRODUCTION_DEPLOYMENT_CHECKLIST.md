# JayLuxe Phase 33 Production Deployment Checklist

## Build and dependencies
- [ ] Run `npm install` in a network-enabled environment.
- [ ] Review and commit the generated `package-lock.json`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Confirm the resolved runtime is Next.js 16.3.3 and React 19.2.7.

## Environment
- [ ] Configure production Firebase client variables.
- [ ] Configure Firebase Admin credentials/Application Default Credentials.
- [ ] Configure Paystack public + secret keys.
- [ ] Configure Resend keys/from-addresses and webhook secret if email is enabled.
- [ ] Keep OPay flags disabled.
- [ ] Configure optional Cloudinary, Termii, and analytics variables only if used.

## Firebase
- [ ] Deploy/review Firestore rules and Storage rules.
- [ ] Confirm required Firestore indexes exist.
- [ ] Confirm installment/payment-recovery collections cannot be read or mutated directly by browser clients.

## Paystack
- [ ] Configure `https://jayluxestore.com/api/paystack/webhook`.
- [ ] Test successful standard payment.
- [ ] Test failed/cancelled standard payment.
- [ ] Test browser closes after successful payment and confirm a `paymentRecoveries` record is created/linked.
- [ ] Test successful installment creation and first payment.
- [ ] Test subsequent installment payment.
- [ ] Replay the same installment verification/webhook and confirm the balance is credited only once.
- [ ] Test wrong amount, currency, email/metadata mismatch and confirm reconciliation flags are raised.

## Admin/security
- [ ] Verify admin and super-admin installment access.
- [ ] Verify staff without finance authorization cannot access installment administration.
- [ ] Verify cross-origin admin mutations are rejected.
- [ ] Review audit and reconciliation records.

## Email/SMS
- [ ] Verify Resend order/payment/installment messages in production.
- [ ] Verify Resend webhook signature handling and duplicate delivery behavior.
- [ ] Verify Termii only if production SMS is enabled.

## SEO/assets/UI
- [ ] Confirm sitemap and robots endpoints on the canonical domain.
- [ ] Confirm canonical metadata on discovery/legal pages.
- [ ] Confirm homepage editorial cards load real runtime imagery on desktop/mobile.
- [ ] Confirm PWA icons and logo MIME types are served correctly.
