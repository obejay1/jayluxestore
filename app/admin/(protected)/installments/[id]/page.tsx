import { getInstallmentDetails } from '@/lib/installments/adminService';
import Link from 'next/link';
const money=(v:any)=>`₦${Number(v||0).toLocaleString('en-NG')}`;

export default async function InstallmentDetails({params}:{params:{id:string}}){
 const plan:any=await getInstallmentDetails(params.id);
 if(!plan) return <div className="amu-card">Installment not found.</div>;
 const total=Number(plan.totalAmount||0), paid=Number(plan.paidAmount||0), progress=Math.min(100,Math.round(paid/Math.max(total,1)*100));
 return <div className="amu-page-content space-y-6">
 <div className="amu-card"><Link href="/admin/installments">← Back</Link><h1 className="font-serif text-3xl mt-4">Installment Details</h1></div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
  <section className="amu-card"><h2 className="font-semibold">Customer Information</h2><p className="mt-3">{plan.customerName||plan.customerId}</p><p>{plan.customerEmail}</p><p>{plan.customerPhone}</p></section>
  <section className="amu-card"><h2 className="font-semibold">Installment Summary</h2><div className="grid grid-cols-2 mt-3"><span>Total {money(total)}</span><span>Paid {money(paid)}</span><span>Balance {money(Math.max(0,total-paid))}</span><span>Status {plan.status}</span></div></section>
  <section className="amu-card"><h2 className="font-semibold">Payment Progress</h2><strong className="text-4xl">{progress}%</strong><div className="h-3 bg-neutral-200 rounded mt-3"><div className="h-full bg-[#c8a24b] rounded" style={{width:`${progress}%`}}/></div></section>
  <section className="amu-card"><h2 className="font-semibold">Order Information</h2><p className="mt-3">Order #{plan.orderId||'-'}</p><p>{plan.productName}</p></section>
 </div>
 <section className="amu-card"><h2 className="font-semibold">Payment Schedule & History</h2><div className="space-y-3 mt-4">{plan.payments?.length?plan.payments.map((p:any)=><div key={p.id} className="border rounded-xl p-4">{money(p.amount)} · {p.provider||'-'} · {p.status||'-'} · {p.reference||p.id}</div>):'No payments found.'}</div></section>
 </div>
}
