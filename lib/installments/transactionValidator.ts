export function validateProviderTransaction(input: {
  provider?: string;
  reference?: string;
  amount?: number;
}) {
  const errors: string[] = [];

  if (!input.provider) errors.push('Missing payment provider');
  if (!input.reference) errors.push('Missing transaction reference');
  if (!input.amount || input.amount <= 0) errors.push('Invalid transaction amount');

  return {
    valid: errors.length === 0,
    errors,
  };
}
