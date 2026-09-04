# JayLuxe Installment Production Readiness — Phase 34

## Source-level readiness completed

- Customer installment reads use authenticated server APIs; direct browser access to financial ledgers remains denied.
- Paystack installment amounts/currency/reference/customer data are verified server-side.
- Settlement is transactionally idempotent and duplicate verification cannot double-credit a plan.
- Overpayment/mismatch conditions are flagged for reconciliation.
- Status values and success-status interpretation are normalized across ledger/reporting/admin calculations.
- Reminder queries use valid Firestore operators and timestamp-safe date parsing.
- Initial installment checkout is initialized from a server-created checkout intent, reserves inventory before payment, and records the first successful installment and schedule atomically with the order.
- Admin installment financial routes are restricted to admin/super-admin roles.
- OPay is intentionally disabled until a complete verified lifecycle exists.
- Repository installment verification scripts and Phase 34 security/unit tests pass.

## Required deployment validation

Before production launch:

1. Generate and commit `package-lock.json` in a network-enabled environment.
2. Run `npm run lint`, `npm run typecheck`, and `npm run build`.
3. Deploy/review Firebase rules and required indexes.
4. Run Paystack sandbox tests for success, failure, duplicate verification, duplicate webhook, stale pending locks, and browser-close recovery.
5. Confirm `/api/paystack/webhook` is configured in Paystack.
6. Exercise reconciliation flags from the admin workflow.
7. Verify reminder scheduler execution against real Firestore Timestamp and ISO-string legacy records.

## Financial rules

- Browser redirects are never payment confirmation.
- A plan is credited only from server-verified provider data.
- Duplicate provider events are idempotent.
- Verified amounts cannot exceed the remaining plan balance.
- Refunds must preserve the original transaction ledger.
- Completed plans require an actual zero remaining balance after successful credited payments.
