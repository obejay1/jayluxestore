export function buildInstallmentAmounts(totalAmount: number, installmentCount: number) {
  const total = Math.max(0, Math.round(Number(totalAmount || 0)));
  const count = Math.max(1, Math.trunc(Number(installmentCount || 1)));
  if (count === 1) return [total];

  const standard = Math.ceil(total / count);
  const amounts: number[] = [];
  let remaining = total;

  for (let index = 0; index < count; index += 1) {
    const slotsLeft = count - index;
    const amount = slotsLeft === 1 ? remaining : Math.min(standard, remaining);
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
