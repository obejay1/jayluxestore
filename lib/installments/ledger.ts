import { adminDb } from '@/lib/firebaseAdmin';
import { isSuccessfulPaymentStatus } from './status';

export type Provider = 'Paystack' | 'OPay' | 'Manual';

export async function recordInstallmentTransaction(input:{
  planId:string;
  paymentId?:string;
  provider:Provider;
  reference:string;
  amount:number;
  status:string;
  metadata?:Record<string,unknown>;
}){
  const ref = `${input.provider}_${input.reference}`;
  const existing = await adminDb.collection('paymentTransactions').doc(ref).get();
  if(existing.exists) return existing.id;

  await adminDb.collection('paymentTransactions').doc(ref).set({
    ...input,
    idempotencyKey: ref,
    createdAt:new Date().toISOString()
  });
  return ref;
}

export async function calculatePaidAmount(planId:string){
  const snap=await adminDb.collection('installmentPayments').where('planId','==',planId).get();
  return snap.docs.reduce((sum,d)=>{
    const p:any=d.data();
    return isSuccessfulPaymentStatus(p.status) ? sum+Number(p.amount||0):sum;
  },0);
}

export async function recordRefundTransaction(input:{
  transactionReference:string;
  amount:number;
  provider:Provider;
  paymentId:string;
  reason?:string;
}) {
  const id = `refund_${input.provider}_${input.transactionReference}`;
  const existing = await adminDb.collection('installmentRefunds').doc(id).get();
  if (existing.exists) return id;
  await adminDb.collection('installmentRefunds').doc(id).set({
    id,
    ...input,
    createdAt: new Date().toISOString()
  });
  return id;
}
