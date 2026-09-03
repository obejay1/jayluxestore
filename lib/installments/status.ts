export const SUCCESSFUL_PAYMENT_STATUSES = new Set(['success', 'successful', 'paid']);

export function isSuccessfulPaymentStatus(value: unknown) {
  return SUCCESSFUL_PAYMENT_STATUSES.has(String(value || '').trim().toLowerCase());
}

export function normalizeInstallmentStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'complete') return 'completed';
  if (status === 'past_due' || status === 'past-due') return 'overdue';
  if (['active', 'completed', 'overdue', 'cancelled', 'failed', 'pending'].includes(status)) {
    return status;
  }
  return 'active';
}

export function installmentStatusLabel(value: unknown) {
  const status = normalizeInstallmentStatus(value);
  return status.charAt(0).toUpperCase() + status.slice(1);
}
