import { adminDb } from '@/lib/firebaseAdmin';
import { normalizeInstallmentStatus } from './status';

export async function getInstallmentReports(){
 const snap=await adminDb.collection('installmentPlans').get();
 let total=0,collected=0,outstanding=0,active=0,completed=0,overdue=0,paystack=0,opay=0;
 snap.forEach(d=>{
  const x:any=d.data();
  const t=Number(x.totalAmount||x.totalInstallmentAmount||0);
  const p=Number(x.paidAmount||x.amountPaid||0);
  const status=normalizeInstallmentStatus(x.status);
  total+=t; collected+=p; outstanding+=Math.max(0,t-p);
  if(status==='completed') completed++; else if(status==='overdue') overdue++; else if(status==='active'||status==='pending') active++;
  const provider=String(x.provider||'').toLowerCase();
  if(provider==='paystack') paystack+=p;
  if(provider==='opay') opay+=p;
 });
 return {total,collected,outstanding,active,completed,overdue,paystack,opay};
}
