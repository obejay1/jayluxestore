export function orderNumberCounterId(date: Date) {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function formatOrderNumber(date: Date, sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('Order number sequence must be a positive integer.');
  }

  return `JL${orderNumberCounterId(date)}-${String(sequence).padStart(4, '0')}`;
}
