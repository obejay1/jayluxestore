import { adminDb } from '@/lib/firebaseAdmin';
import { installmentStatusLabel, normalizeInstallmentStatus } from './status';

export type InstallmentSummary = {
  id:string;
  customerId?:string;
  customerName?:string;
  customerEmail?:string;
  customerPhone?:string;
  orderId?:string;
  productName?:string;
  totalAmount:number;
  paidAmount:number;
  outstanding:number;
  progress:number;
  status:string;
  statusKey:string;
  provider?:string;
  transactionReference?:string;
  nextPaymentDate?:string;
  nextPaymentAmount?:number;
  planDuration?:string;
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
    let statusKey = normalizeInstallmentStatus(d.status);

    if (outstanding === 0) statusKey='completed';
    else if (d.nextPaymentDate) {
      const due = new Date(d.nextPaymentDate);
      if (!Number.isNaN(due.getTime()) && due < now) statusKey='overdue';
    }

    return {
      id:doc.id,
      customerId:d.userId || d.customerId,
      customerName:d.customerName,
      customerEmail:d.customerEmail || d.email,
      customerPhone:d.customerPhone || d.phone,
      orderId:d.orderId,
      productName:d.productName,
      totalAmount:total,
      paidAmount:paid,
      outstanding,
      progress: total ? Math.min(100,Math.round((paid/total)*100)) : 0,
      status: installmentStatusLabel(statusKey),
      statusKey,
      provider:d.provider,
      transactionReference:d.transactionReference || d.paymentReference,
      nextPaymentDate:d.nextPaymentDate,
      nextPaymentAmount:moneyNumber(d.nextPaymentAmount),
      planDuration:d.planDuration || (d.installmentCount ? `${d.installmentCount} payments` : undefined),
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
