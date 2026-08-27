import { recordInstallmentTransaction, Provider } from './ledger';
import { calculateFinancialState } from './financialIntegrity';

/**
 * Central payment settlement pipeline.
 * Provider callbacks should call this after provider verification.
 * It intentionally does not accept browser supplied balances.
 */
export async function settleVerifiedInstallmentPayment(input: {
  planId: string;
  paymentId?: string;
  provider: Provider;
  reference: string;
  amount: number;
  metadata?: Record<string, unknown>;
}) {
  if (!input.reference) throw new Error('Missing provider reference');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const transactionId = await recordInstallmentTransaction({
    planId: input.planId,
    paymentId: input.paymentId,
    provider: input.provider,
    reference: input.reference,
    amount: input.amount,
    status: 'successful',
    metadata: input.metadata,
  });

  return {
    transactionId,
    nextStep: 'update_installment_schedule_and_recalculate_balance',
  };
}
