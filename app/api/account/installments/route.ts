import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serialise(value: unknown): unknown {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialise);
  if (typeof value === 'object') {
    const stamp = value as { toDate?: () => Date };
    if (typeof stamp.toDate === 'function') {
      try { return stamp.toDate().toISOString(); } catch { return null; }
    }
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k,v])=>[k,serialise(v)]));
  }
  return String(value);
}

export async function GET(request: NextRequest) {
  const customer = await getVerifiedCustomer(request);
  if (!customer?.uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const snap = await adminDb.collection('installmentPlans').where('userId','==',customer.uid).get();
  const plans = snap.docs.map((doc) => ({ id: doc.id, ...(serialise(doc.data()) as Record<string, unknown>) }));
  return NextResponse.json({ plans });
}
