# JayLuxe Installment System - Phase 11

Implemented a centralized verified-payment settlement layer.

## Added

- `lib/installments/paymentOrchestrator.ts`

Purpose:
- Provides a single settlement entry point after Paystack/OPay server verification.
- Rejects missing references.
- Rejects invalid payment amounts.
- Uses the existing transaction ledger/idempotency layer.
- Prevents client-side balance authority.

## Important deployment note

Provider webhook routes must call this function only after their existing provider verification succeeds.

Required production checks remain:
- run npm install
- run lint/typecheck/build
- run sandbox Paystack and OPay transaction tests
