# JayLuxe Installment System Production Checklist

## Environment
- Verify Firebase configuration
- Verify Paystack keys remain server-side
- Verify OPay credentials remain server-side
- Verify webhook URLs

## Database
- Verify installment collections
- Verify Firestore indexes
- Verify security rules
- Verify transaction reference uniqueness

## Payments
- Test Paystack successful payment
- Test Paystack failed payment
- Test duplicate webhook delivery
- Test OPay callback verification
- Test duplicate callback delivery

## Security
- Verify admin-only installment routes
- Verify financial APIs validate sessions
- Verify clients cannot alter balances

## Monitoring
- Review audit logs
- Review reconciliation warnings
- Confirm reminder scheduler operation
