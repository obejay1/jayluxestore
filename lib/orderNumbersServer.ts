import type { DocumentReference, DocumentData } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { formatOrderNumber, orderNumberCounterId } from '@/lib/orderNumbers';

export async function ensureOrderNumber(
  orderReference: DocumentReference<DocumentData>,
) {
  return adminDb.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderReference);
    if (!orderSnapshot.exists) return null;

    const current = orderSnapshot.data() || {};
    const existing = String(current.orderNumber || '').trim();
    if (existing) return existing;

    const rawCreatedAt = current.createdAt;
    const createdAt =
      rawCreatedAt &&
      typeof rawCreatedAt === 'object' &&
      'toDate' in rawCreatedAt &&
      typeof rawCreatedAt.toDate === 'function'
        ? rawCreatedAt.toDate()
        : new Date(String(rawCreatedAt || ''));
    const date = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
    const counterReference = adminDb.collection('orderNumberCounters')
      .doc(orderNumberCounterId(date));
    const counterSnapshot = await transaction.get(counterReference);
    const sequence = Number(counterSnapshot.data()?.count || 0) + 1;
    const orderNumber = formatOrderNumber(date, sequence);

    transaction.set(counterReference, {
      count: sequence,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    transaction.update(orderReference, { orderNumber });
    return orderNumber;
  });
}
