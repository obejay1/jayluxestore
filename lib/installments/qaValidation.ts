import { calculateEffectivePaid } from './financialIntegrity';

export type InstallmentIntegrityIssue = {
  code: string;
  message: string;
};

export function validateInstallmentIntegrity(input: {
  totalAmount: number;
  payments: Array<{ amount: number; status?: string }>;
  refunds?: Array<{ amount: number; status?: string }>;
}) {
  const issues: InstallmentIntegrityIssue[] = [];

  const paid = calculateEffectivePaid(input.payments, input.refunds || []);

  if (input.totalAmount < 0) {
    issues.push({ code: 'INVALID_TOTAL', message: 'Installment total cannot be negative.' });
  }

  if (paid < 0) {
    issues.push({ code: 'INVALID_PAID', message: 'Effective paid amount cannot be negative.' });
  }

  if (paid > input.totalAmount) {
    issues.push({ code: 'OVERPAYMENT', message: 'Successful payments exceed the installment total.' });
  }

  return {
    valid: issues.length === 0,
    effectivePaid: paid,
    issues,
  };
}
