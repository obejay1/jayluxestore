import { NextResponse } from 'next/server';
import { adminAuthErrorResponse } from '@/lib/adminServerAuth';
import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(){
 try {
  await requireInstallmentAdmin();
  const snap=await adminDb.collection('paymentTransactions').get();
  return NextResponse.json(snap.docs.map(d=>({id:d.id,...d.data()})));
 } catch(error){
  const result=adminAuthErrorResponse(error);
  return NextResponse.json(result.body,{status:result.status});
 }
}
