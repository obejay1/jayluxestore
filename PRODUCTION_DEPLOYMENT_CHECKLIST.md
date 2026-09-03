# JayLuxe Phase 34 Production Deployment Checklist

## Build and dependencies
- [ ] Run `npm install` in a network-enabled environment if `package-lock.json` is not yet present.
- [ ] Review and commit the generated `package-lock.json`.
- [ ] Run `npm ci` from the committed lockfile.
- [ ] Run `npm run verify:security`.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Confirm the resolved runtime remains the versions intentionally pinned in `package.json`.

## Environment
- [ ] Configure production Firebase client variables.
- [ ] Configure Firebase Admin credentials/Application Default Credentials.
- [ ] Configure the server-only `PAYSTACK_SECRET_KEY` (no browser Paystack public key is required by the Phase 34 checkout flow).
- [ ] Configure Resend keys/from-addresses and webhook secret if email is enabled.
- [ ] Keep OPay flags disabled until a complete server-verified lifecycle is implemented and tested.
- [ ] Configure optional Cloudinary, Termii, and analytics variables only if used.
- [ ] Configure `NEXT_PUBLIC_GA_ID` only with the intended production measurement ID; there is no hard-coded fallback.

## Firebase
- [ ] Deploy/review Firestore and Storage rules.
- [ ] Confirm required Firestore indexes exist for the production data set.
- [ ] Confirm `checkoutIntents`, payment/recovery collections, and installment ledgers cannot be read or mutated directly by ordinary browser clients.
- [ ] Confirm coupons are readable/writable only by users with the promotions permission; storefront validation must go through `/api/coupons/validate`.

## Paystack / checkout integrity
- [ ] Configure `https://jayluxestore.com/api/paystack/webhook` in Paystack.
- [ ] Test a successful standard checkout and confirm the server-created checkout intent becomes one order.
- [ ] Test a failed/cancelled checkout and confirm reserved inventory is eventually released.
- [ ] Close the browser immediately after a successful charge and confirm the webhook finalizes the order without requiring the browser callback.
- [ ] Replay the same successful webhook and confirm no duplicate order or stock mutation occurs.
- [ ] Test simultaneous attempts for the last unit of a managed-stock product and confirm only one reservation succeeds.
- [ ] Test a crafted cart containing the same product ID more than once and confirm quantities are consolidated server-side.
- [ ] Test successful installment creation and first payment.
- [ ] Test subsequent installment payment and webhook replay; the balance must be credited only once.
- [ ] Test wrong amount, currency, reference, and email and confirm finalization is rejected/reconciled.

## Access-token and analytics privacy
- [ ] Confirm guest order/invoice links use `#access_token=...`, not `?token=...`.
- [ ] Confirm the order/invoice page removes the fragment immediately after storing it in session storage.
- [ ] Confirm `/api/orders/[id]` accepts the access credential only through `X-Order-Access-Token` or authenticated ownership.
- [ ] Confirm GA page views contain pathname only and never query strings or fragments.

## Admin/security
- [ ] Verify admin and super-admin financial access.
- [ ] Verify staff without the required permission cannot access protected financial/customer data.
- [ ] Verify cross-origin admin mutations are rejected.
- [ ] Test admin customer/order print views with HTML-like customer data and confirm it renders as text, never executable markup.
- [ ] Export CSV with values beginning `=`, `+`, `-`, and `@`; confirm spreadsheet software treats them as text.
- [ ] Review audit and reconciliation records.

## Email/SMS
- [ ] Verify Resend order/payment/installment messages in production.
- [ ] Confirm order links received by email use fragment credentials and still open successfully.
- [ ] Verify Resend webhook signature handling and duplicate-delivery behavior.
- [ ] Verify Termii only if production SMS is enabled.

## SEO/assets/UI
- [ ] Confirm dynamic product URLs appear in `sitemap.xml`.
- [ ] Confirm a live product page exposes product-specific title/description/Open Graph data and Product JSON-LD.
- [ ] Confirm `robots.txt` and canonical URLs on the production domain.
- [ ] Confirm `npm run css:build` regenerates the compatibility bundles and the live desktop/mobile design is unchanged.
- [ ] Confirm PWA icons and logo MIME types are served correctly.
