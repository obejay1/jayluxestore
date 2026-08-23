export type InstallmentPlanOption = {
  id: string;
  label: string;
  payments: number;
  intervalDays: number;
};

export const INSTALLMENT_OPTIONS: InstallmentPlanOption[] = [
  { id: 'two', label: 'Pay in 2', payments: 2, intervalDays: 30 },
  { id: 'three', label: 'Pay in 3', payments: 3, intervalDays: 30 },
  { id: 'four', label: 'Pay in 4', payments: 4, intervalDays: 30 },
];

export function calculateInstallments(total: number, payments: number) {
  const amount = Math.floor(total / payments);
  return Array.from({ length: payments }, (_, index) =>
    index === payments - 1 ? total - amount * (payments - 1) : amount
  );
}
