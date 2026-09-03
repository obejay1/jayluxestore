export const PAYMENT_STATES = [
  'initiated',
  'authorized',
  'verified',
  'completed',
  'failed',
  'refunded',
  'disputed',
] as const;

export type PaymentState = typeof PAYMENT_STATES[number];

export function canMovePayment(from: PaymentState, to: PaymentState) {
  const allowed: Record<PaymentState, PaymentState[]> = {
    initiated: ['authorized','failed'],
    authorized: ['verified','failed'],
    verified: ['completed','failed'],
    completed: ['refunded','disputed'],
    failed: [],
    refunded: [],
    disputed: ['refunded'],
  };
  return allowed[from].includes(to);
}
