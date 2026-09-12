# JayLuxe Paystack + OPay Live Integration Report

## Implemented

- Paystack and OPay provider availability is resolved server-side via `/api/payments/providers` without exposing secrets.
- Normal checkout supports Paystack and OPay without removing the existing OPay path.
- Installment checkout can now choose Paystack or OPay for the initial installment.
- Subsequent installment payments can now choose Paystack or OPay.
- Installment payment records store the selected provider and a unique reference per attempt.
- Paystack installment initialization is server-side and uses the authoritative outstanding installment amount.
- Paystack installment metadata includes plan/order/user/installment identifiers generated from server data.
- Paystack verification checks the stored payment record, authenticated customer ownership, provider, provider status, reference, amount, currency and settlement state.
- Paystack and OPay installment settlement now share provider-aware, idempotent settlement logic.
- Initial installment order/payment/transaction records now store the actual provider instead of hard-coding OPay.
- The initial installment amount is derived server-side from the authoritative order total and installment count. Client-supplied installment percentages are ignored.
- Paystack checkout metadata includes the checkout reference, provider and authoritative amount.
- OPay checkout initialization now also requires webhook-secret configuration so an unconfirmable provider is not offered as available.
- The customer order page now uses the protected order API and captures the fragment access token instead of reading orders directly from Admin Firestore.

## Validation performed in this workspace

- `npm test`: PASS (14/14 tests).
- `npm run verify:security`: PASS (21/21 checks).
- CSS bundles rebuilt successfully.
- Modified TypeScript/TSX files were syntax-transpiled with TypeScript without syntax diagnostics.

## Build limitation in this workspace

A full `npm run build` could not execute because project dependencies are not installed in this sandbox (`next: not found`). Two `npm install` attempts timed out before creating `node_modules`.

Run on your deployment machine or CI:

```bash
npm install
npm run check
npm run build
```

Do not deploy live payments until those commands pass and you complete low-value real Paystack and OPay payment tests.

## Live environment requirements

Required Paystack server secret:

```env
PAYSTACK_SECRET_KEY=sk_live_...
```

Paystack webhook URL:

```text
https://YOUR_DOMAIN/api/paystack/webhook
```

Keep the existing OPay variables configured as well:

```env
OPAY_PUBLIC_KEY=...
OPAY_SECRET_KEY=...
OPAY_MERCHANT_ID=...
OPAY_BASE_URL=...
```

No Paystack secret is required or used in browser code.
