import { adminDb } from '@/lib/firebaseAdmin';

export type InstallmentSummary = {
  id:string;
  customerId?:string;
  orderId?:string;
  productName?:string;
  totalAmount:number;
  paidAmount:number;
  outstanding:number;
  progress:number;
  status:string;
  provider?:string;
  nextPaymentDate?:string;
};

const moneyNumber=(v:any)=>Number(v||0);

export async function getAdminInstallments(): Promise<InstallmentSummary[]> {
  const snap = await adminDb.collection('installmentPlans').get();
  const now = new Date();

  return snap.docs.map(doc=>{
    const d:any = doc.data();
    const total = moneyNumber(d.totalAmount ?? d.totalInstallmentAmount);
    const paid = moneyNumber(d.paidAmount ?? d.amountPaid);
    const outstanding = Math.max(0,total-paid);
    let status = d.status || 'Active';

    if (outstanding===0) status='Completed';
    else if (d.nextPaymentDate && new Date(d.nextPaymentDate)<now) status='Overdue';

    return {
      id:doc.id,
      customerId:d.userId || d.customerId,
      orderId:d.orderId,
      productName:d.productName,
      totalAmount:total,
      paidAmount:paid,
      outstanding,
      progress: total ? Math.min(100,Math.round((paid/total)*100)) : 0,
      status,
      provider:d.provider,
      nextPaymentDate:d.nextPaymentDate,
    };
  });
}

export async function getInstallmentDetails(id:string){
  const plan = await adminDb.collection('installmentPlans').doc(id).get();
  if(!plan.exists) return null;

  const payments = await adminDb.collection('installmentPayments')
    .where('planId','==',id).get();

  return {
    id:plan.id,
    ...plan.data(),
    payments:payments.docs.map(p=>({id:p.id,...p.data()}))
  };
}
