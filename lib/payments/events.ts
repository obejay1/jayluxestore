export type PaymentLifecycle =
  | 'initiated'
  | 'authorized'
  | 'verified'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed';

export interface PaymentEvent {
  paymentId: string;
  orderId?: string;
  state: PaymentLifecycle;
  reference?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const allowed: Record<PaymentLifecycle, PaymentLifecycle[]> = {
  initiated: ['authorized', 'failed'],
  authorized: ['verified', 'failed'],
  verified: ['completed', 'failed'],
  completed: ['refunded', 'disputed'],
  failed: [],
  refunded: [],
  disputed: ['refunded', 'completed'],
};

export function canMovePaymentState(from: PaymentLifecycle, to: PaymentLifecycle) {
  return from === to || allowed[from].includes(to);
}

export function createPaymentEvent(
  input: Omit<PaymentEvent, 'createdAt'>
): PaymentEvent {
  return { ...input, createdAt: new Date().toISOString() };
}
