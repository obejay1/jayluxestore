import type { Transaction } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  allocateOrderNumberFromCounters,
  GLOBAL_ORDER_NUMBER_COUNTER_ID,
} from '@/lib/orderNumbers';

export async function allocateOrderNumber(
  transaction: Transaction,
  date: Date,
) {
  const counters = adminDb.collection('orderNumberCounters');
  const globalReference = counters.doc(GLOBAL_ORDER_NUMBER_COUNTER_ID);
  return allocateOrderNumberFromCounters({
    async readGlobalCounter() {
      const snapshot = await transaction.get(globalReference);
      return { exists: snapshot.exists, count: snapshot.data()?.count };
    },
    async readLegacyCounters() {
      const snapshot = await transaction.get(counters);
      return snapshot.docs.map((document) => ({
        id: document.id,
        count: document.data().count,
      }));
    },
    writeGlobalCounter(count, updatedAt) {
      transaction.set(globalReference, { count, updatedAt });
    },
  }, date);
}
