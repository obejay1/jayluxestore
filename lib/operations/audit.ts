import { adminDb } from '@/lib/firebaseAdmin';

export async function recordPaymentEvent(input: {
  paymentId: string;
  orderId?: string;
  state: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  await adminDb.collection('payment_events').add({
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function recordInventoryMovement(input: {
  productId: string;
  quantity: number;
  type: string;
  reason: string;
  reference?: string;
}) {
  await adminDb.collection('inventory_movements').add({
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function recordEmailEvent(input: {
  email: string;
  type: string;
  status: 'sent' | 'failed';
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  await adminDb.collection('email_events').add({
    ...input,
    createdAt: new Date().toISOString(),
  });
}
