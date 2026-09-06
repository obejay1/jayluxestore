import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get('reference')?.trim();
  if (!reference) return NextResponse.json({ status: 'FAILED', message: 'Missing reference' }, { status: 400 });

  const payment = await adminDb.collection('payments').doc(reference).get();
  if (!payment.exists) {
    const tx = await adminDb.collection('payments').where('reference', '==', reference).limit(1).get();
    if (tx.empty) return NextResponse.json({ status: 'PENDING' });
    return NextResponse.json({ status: tx.docs[0].data().status || 'PENDING' });
  }

  return NextResponse.json({ status: payment.data()?.status || 'PENDING' });
}
