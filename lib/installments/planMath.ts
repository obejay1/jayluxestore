export function getInitialInstallmentPercentage(plan?: Record<string, unknown> | null, installmentCount?: number) {
  const raw = plan?.initialPaymentPercentage ?? plan?.initialPercentage ?? plan?.downPaymentPercentage ?? plan?.initialPaymentPercent;
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0 && value <= 100) return value;
  return null;
}

export function calculateInitialInstallmentAmount(totalAmount: number, plan?: Record<string, unknown> | null, installmentCount?: number) {
  const total = Math.max(0, Math.round(Number(totalAmount || 0)));
  const percentage = getInitialInstallmentPercentage(plan, installmentCount);
  if (percentage) return Math.min(total, Math.ceil(total * (percentage / 100)));
  return buildInstallmentAmounts(total, installmentCount || 1)[0];
}

export function buildInstallmentAmounts(totalAmount: number, installmentCount: number, initialAmount?: number) {
  const total = Math.max(0, Math.round(Number(totalAmount || 0)));
  const count = Math.max(1, Math.trunc(Number(installmentCount || 1)));
  if (count === 1) return [total];

  const firstAmount = initialAmount && initialAmount > 0 ? Math.min(total, Math.round(initialAmount)) : null;
  const standard = Math.ceil(total / count);
  const amounts: number[] = [];
  let remaining = total;

  for (let index = 0; index < count; index += 1) {
    const slotsLeft = count - index;
    const amount = index === 0 && firstAmount ? firstAmount : slotsLeft === 1 ? remaining : Math.min(standard, remaining);
    amounts.push(Math.max(0, amount));
    remaining -= amount;
  }

  return amounts;
}

export function addInstallmentMonths(base: Date, months: number) {
  const date = new Date(base);
  date.setMonth(date.getMonth() + months);
  return date;
}
