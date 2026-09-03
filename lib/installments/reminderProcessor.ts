
import { adminDb } from '@/lib/firebaseAdmin';

function toDate(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const converter = (value as { toDate?: () => Date }).toDate;
    if (typeof converter === 'function') {
      const converted = converter.call(value);
      return Number.isFinite(converted.getTime()) ? converted : null;
    }
  }
  const converted = new Date(String(value));
  return Number.isFinite(converted.getTime()) ? converted : null;
}

export async function processInstallmentReminders() {
  const now = new Date();
  const plans = await adminDb.collection('installmentSchedules').get();
  let processed = 0;

  for (const doc of plans.docs) {
    const item = doc.data();
    if (!item.dueDate || item.status === 'paid') continue;

    const due = toDate(item.dueDate);
    if (!due) continue;
    const days = Math.ceil((due.getTime()-now.getTime())/86400000);
    let type = '';

    if (days === 7) type='payment_upcoming';
    if (days === 3) type='payment_approaching';
    if (days === 0) type='payment_due_today';
    if (days < 0) type='payment_overdue';

    if (!type) continue;

    const existing = await adminDb.collection('installmentReminders')
      .where('scheduleId','==',doc.id)
      .where('type','==',type)
      .limit(1).get();

    if (!existing.empty) continue;

    await adminDb.collection('installmentReminders').add({
      scheduleId: doc.id,
      planId: item.planId,
      type,
      status:'pending',
      createdAt:new Date().toISOString()
    });
    processed++;
  }
  return {processed};
}
