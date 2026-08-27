import { adminDb } from '@/lib/firebaseAdmin';

export async function getInstallmentReports(){
 const snap=await adminDb.collection('installmentPlans').get();
 let total=0,collected=0,outstanding=0,active=0,completed=0,overdue=0,paystack=0,opay=0;
 snap.forEach(d=>{const x:any=d.data();const t=Number(x.totalAmount||x.totalInstallmentAmount||0);const p=Number(x.paidAmount||x.amountPaid||0);total+=t;collected+=p;outstanding+=Math.max(0,t-p);if(x.status==='Completed')completed++;else active++;if(x.status==='Overdue')overdue++;if(x.provider==='Paystack')paystack+=p;if(x.provider==='OPay')opay+=p;});
 return {total,collected,outstanding,active,completed,overdue,paystack,opay};
}
