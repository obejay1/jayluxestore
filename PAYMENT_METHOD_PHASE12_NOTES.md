# Phase 12 Payment Method Enforcement

Implemented as a safety review checkpoint.

Required current customer payment state:
- OPay Wallet: enabled
- Paystack: retained in codebase but customer-disabled

Verification checklist:
- Customer UI must not submit Paystack when disabled.
- Backend payment creation must validate allowed payment methods.
- OPay Wallet requests must continue using OpayWalletNg.
- Historical Paystack records must remain available.

Before production:
- Run npm install
- Run npm run build
- Test direct API attempts with disabled payment methods.
