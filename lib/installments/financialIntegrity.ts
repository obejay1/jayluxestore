import { isSuccessfulPaymentStatus } from './status';

export function calculateEffectivePaid(payments:any[], refunds:any[] = []) {
  const paid = payments
    .filter((payment) => isSuccessfulPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const refunded = refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
  return Math.max(0, paid - refunded);
}

// Backward-compatible alias for older phase code.
export const calculateEffectivePaidAmount = calculateEffectivePaid;

export function validateBalance(total:number, paid:number){
  if (paid > total) return {valid:false, reason:'Payment exceeds installment total'};
  return {valid:true};
}

export function isCompleted(total:number, paid:number){
 return paid >= total;
}

export function calculateFinancialState(
  totalAmount: number,
  successfulPayments: number,
  refunds: number = 0
) {
  const effectivePaid = Math.max(successfulPayments - refunds, 0);
  const outstandingBalance = Math.max(totalAmount - effectivePaid, 0);
  const progress = totalAmount > 0
    ? Math.min((effectivePaid / totalAmount) * 100, 100)
    : 0;

  return {
    amountPaid: effectivePaid,
    outstandingBalance,
    progress,
    completed: outstandingBalance === 0,
  };
}
