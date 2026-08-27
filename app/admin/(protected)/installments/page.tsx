import Link from 'next/link';
import { getAdminInstallments } from '@/lib/installments/adminService';

const money=(v:number)=>`₦${Number(v||0).toLocaleString('en-NG')}`;

export default async function AdminInstallmentsPage({searchParams}:{searchParams?:{q?:string,status?:string,provider?:string}}){
 const plans:any[]=await getAdminInstallments();
 const q=(searchParams?.q||'').toLowerCase();

 const filtered=plans.filter(p=>{
  const text=`${p.customerName||''} ${p.customerEmail||''} ${p.customerId||''} ${p.orderId||''} ${p.productName||''} ${p.provider||''} ${p.transactionReference||''}`.toLowerCase();
  return (!q||text.includes(q)) && (!searchParams?.status||p.status===searchParams.status) && (!searchParams?.provider||p.provider===searchParams.provider);
 });

 const collected=filtered.reduce((s,p)=>s+Number(p.paidAmount||0),0);
 const outstanding=filtered.reduce((s,p)=>s+Number(p.outstanding||0),0);
 const upcoming=filtered.filter(p=>p.nextPaymentDate && p.status!=="Completed");
 const overdue=filtered.filter(p=>p.status==="Overdue");
 const paystack=filtered.filter(p=>p.provider==="Paystack").reduce((s,p)=>s+p.paidAmount,0);
 const opay=filtered.filter(p=>p.provider==="OPay").reduce((s,p)=>s+p.paidAmount,0);

 const cards=[['Active Plans',filtered.filter(p=>p.status==='Active').length],['Completed',filtered.filter(p=>p.status==='Completed').length],['Overdue',overdue.length],['Due Soon',upcoming.length],['Total Collected',money(collected)],['Outstanding',money(outstanding)]];
 const recentPayments=[...filtered].sort((a:any,b:any)=>Number(b.paidAmount||0)-Number(a.paidAmount||0)).slice(0,5);

 return <div className="amu-page-content space-y-6">
  <section className="amu-card flex justify-between gap-4 flex-wrap">
   <div><h1 className="font-serif text-3xl">Installment Management</h1><p>Monitor customer installment plans, payment progress, balances and upcoming payments.</p></div>
   <div className="flex gap-2"><a className="border px-4 py-2 rounded" href="/api/admin/installments/export">Export</a><a className="border px-4 py-2 rounded" href="/admin/installments">Refresh</a></div>
  </section>

  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
   {cards.map(([a,b])=><div className="amu-card" key={String(a)}><p className="text-sm">{a}</p><strong className="text-2xl">{b}</strong></div>)}
  </section>

  <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
   <div className="amu-card"><h2 className="font-semibold">Upcoming Payments</h2>{upcoming.slice(0,5).map(p=><div className="py-2 border-b" key={p.id}>{p.customerName||p.customerId} · {money(p.nextPaymentAmount)} · {p.nextPaymentDate}</div>)}{!upcoming.length&&<p>No upcoming payments</p>}</div>
   <div className="amu-card"><h2 className="font-semibold">Overdue Payments</h2>{overdue.slice(0,5).map(p=><div className="py-2 border-b" key={p.id}>{p.customerName||p.customerId} · {money(p.outstanding)} · {p.nextPaymentDate}</div>)}{!overdue.length&&<p>No overdue payments</p>}</div>
   <div className="amu-card"><h2 className="font-semibold">Payment Providers</h2><p>Paystack: <b>{money(paystack)}</b></p><p>OPay: <b>{money(opay)}</b></p></div>
   <div className="amu-card"><h2 className="font-semibold">Installment Statistics</h2><p>Total Plans: {filtered.length}</p><p>Successful Collected: {money(collected)}</p></div>
   <div className="amu-card"><h2 className="font-semibold">Recent Installment Payments</h2>{recentPayments.map(p=><div className="py-2 border-b" key={p.id}>{p.customerId||'Customer'} · {money(p.paidAmount)} · {p.provider||'Provider'}</div>)}{!recentPayments.length&&<p>No recent payments</p>}</div>
  </section>

  <section className="amu-card">
   <form className="flex flex-wrap gap-3"><input name="q" placeholder="Search customer, order, provider, reference" className="border p-2 rounded"/><select name="status" className="border p-2 rounded"><option value="">All status</option><option>Active</option><option>Overdue</option><option>Completed</option><option>Pending</option></select><select name="provider" className="border p-2 rounded"><option value="">All providers</option><option>Paystack</option><option>OPay</option></select><button className="border px-4 rounded">Filter</button></form>
  </section>

  <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
   {filtered.length===0&&<div className="amu-card">No installment plans yet</div>}
   {filtered.map(p=>{
    const progress=Math.min(100,Math.max(0,Number(p.progress||0)));
    return <article key={p.id} className="amu-card">
      <div className="flex justify-between gap-3"><div><h2 className="font-semibold text-lg">{p.customerName||'Customer'}</h2><p className="text-sm">{p.customerEmail||''}</p><p>Order #{p.orderId||'-'} · {p.planDuration||'Installment Plan'}</p></div><span className="border rounded-full px-3 py-1">{p.status||'Pending'}</span></div>
      <div className="grid grid-cols-3 gap-3 mt-5"><div>Total<b className="block">{money(p.totalAmount)}</b></div><div>Paid<b className="block">{money(p.paidAmount)}</b></div><div>Remaining<b className="block">{money(p.outstanding)}</b></div></div>
      <div className="mt-5"><b>Payment Progress {progress}%</b><div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Payment progress ${progress}%`} className="h-3 bg-neutral-200 rounded mt-2 overflow-hidden"><div className="h-full rounded bg-[#c8a24b] transition-all duration-700" style={{width:`${progress}%`}}/></div><small>{money(p.paidAmount)} paid of {money(p.totalAmount)}</small></div>
      <div className="grid grid-cols-2 gap-3 mt-4"><div>Next Payment<b className="block">{money(p.nextPaymentAmount)}</b></div><div>Due Date<b className="block">{p.nextPaymentDate||'-'}</b></div></div>
      <div className="mt-4">Provider: <b>{p.provider||'-'}</b></div>
      <Link className="inline-block mt-5 border px-4 py-2 rounded" href={`/admin/installments/${p.id}`}>View Details</Link>
    </article>
   })}
  </section>
 </div>
}
