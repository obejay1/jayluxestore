# JayLuxe OPay Notification / Checkout Fix

## Scope
Targeted fix for the checkout error shown to customers as `notify.notifyLanguage is null` plus the OPay response and webhook safety required to avoid false paid orders.

## Root cause
A full source search found no frontend expression that dereferenced `notify.notifyLanguage`. The text was being returned by OPay as a provider-level API error and then surfaced by the checkout's normal `data.message` error handling.

JayLuxe was sending the internal locale code `en` directly as OPay's `notify.notifyLanguage`. JayLuxe now keeps `en` internally and maps it at the OPay boundary to OPay's provider enum (`English`). Nullable language state defaults safely to `en`.

## Files changed
- `app/checkout/page.tsx`
- `app/api/opay/create-payment/route.ts`
- `app/api/opay/webhook/route.ts`
- `lib/payments/opay.ts`
- `lib/checkout/server.ts`
- `tests/opay.test.ts` (new)

## What changed
- Added null-safe OPay response types and optional chaining/defaults.
- JayLuxe client request explicitly sends `notifyLanguage: 'en'`.
- OPay provider request maps JayLuxe `en` -> OPay `English` only at the provider boundary.
- Added required/production-safe OPay Reference Code fields and Nigerian phone normalization.
- OPay provider-level errors are no longer treated as success merely because the upstream HTTP status is 200.
- Reference-code success is handled as a pending payment instruction, not proof of payment.
- OPay checkout now uses the existing server-side checkout intent architecture for authoritative pricing, coupon validation, stock reservation, and customer data validation.
- Successful create-payment never marks an order paid.
- OPay webhook signature verification now uses HMAC-SHA3-512 for callbacks.
- The verified webhook feeds the existing `finalizeCheckoutIntent` order creation path, so a paid order is created only after verified OPay confirmation.
- Existing Paystack and installment flows remain intact.

## Validation
- Existing + new Node tests: 14/14 passing.
- Targeted TypeScript/TSX transpile diagnostics on all changed files: 0 errors.
- `npm run build` was attempted. CSS prebuild completed, but the full Next.js build could not start because dependencies are not installed in this execution environment (`next: not found`). An `npm install` attempt timed out, so a full dependency-backed build cannot be truthfully certified here.

## Remaining integration note
The current provider mode is OPay `ReferenceCode`. OPay Reference Code returns a payment reference code, not necessarily a hosted cashier URL. The frontend now handles either a returned URL (if present) or a reference code safely. If JayLuxe wants an always-hosted redirect checkout experience, that is a separate switch to OPay Cashier/Express Checkout and should not be mixed into this bug fix.
