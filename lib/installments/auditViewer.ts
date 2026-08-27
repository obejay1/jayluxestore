
import { adminDb } from '@/lib/firebaseAdmin';

export async function getInstallmentAuditLogs(limit = 100) {
  const snap = await adminDb.collection('installmentAuditLogs')
    .orderBy('createdAt','desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
