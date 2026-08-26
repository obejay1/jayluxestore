'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { CreditCard, WalletCards, CircleAlert, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';

type Plan = {
  id:string;
  userId?:string;
  orderId?:string;
  productName?:string;
  totalAmount?:number;
  paidAmount?:number;
  remainingBalance?:number;
  nextPaymentAmount?:number;
  nextPaymentDate?:string;
  status?:string;
  totalInstallments?:number;
  completedInstallments?:number;
};

const money=(value=0)=>`₦${Number(value).toLocaleString('en-NG')}`;

function statusLabel(status?:string){
  return status || 'Active';
}

function exportCsv(plans: Plan[]){
  const rows = [
    ['Customer','Order ID','Product','Total','Paid','Balance','Status','Next Payment Date'],
    ...plans.map(p => [
      p.userId || '',
      p.orderId || '',
      p.productName || '',
      p.totalAmount || 0,
      p.paidAmount || 0,
      p.remainingBalance || 0,
      statusLabel(p.status),
      p.nextPaymentDate || ''
    ])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('\"','\"\"')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;
  a.download='jayluxe-installment-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminInstallmentsPage(){
  const [plans,setPlans]=useState<Plan[]>([]);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('All');
  const [sort,setSort]=useState('newest');

  useEffect(()=>{
    return onSnapshot(
      query(collection(db,'installmentPlans')),
      snap=>setPlans(snap.docs.map(doc=>({id:doc.id,...doc.data()} as Plan)))
    );
  },[]);

  const filtered=useMemo(()=>plans.filter(plan=>{
    const text=`${plan.userId||''} ${plan.orderId||''} ${plan.productName||''}`.toLowerCase();
    return text.includes(search.toLowerCase()) &&
      (status==='All'||statusLabel(plan.status)===status);
  }),[plans,search,status]);

  const sorted=[...filtered].sort((a,b)=>{
    if(sort==='balance') return Number(b.remainingBalance||0)-Number(a.remainingBalance||0);
    if(sort==='paid') return Number(b.paidAmount||0)-Number(a.paidAmount||0);
    return 0;
  });

  const financed=plans.reduce((a,p)=>a+Number(p.totalAmount||0),0);
  const collected=plans.reduce((a,p)=>a+Number(p.paidAmount||0),0);
  const outstanding=Math.max(0,financed-collected);
  const overdue=plans.filter(p=>p.status==='Overdue').length;

  return (
    <div className="amu-page-content">
      <section className="amu-card">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#c8a24b]/15 p-3 text-[#c8a24b]">
            <CreditCard size={24}/>
          </div>
          <div>
            <h1 className="font-serif text-3xl">Installment Management</h1>
            <p className="mt-1 text-neutral-600">
              Monitor installment customers, payment progress, balances and upcoming payments.
            </p>
            <button onClick={() => exportCsv(plans)} className="mt-4 rounded-full bg-[#111] px-5 py-2 text-sm text-white">Export Report</button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Active Plans',plans.length,WalletCards],
          ['Total Financed',money(financed),CreditCard],
          ['Collected',money(collected),CheckCircle2],
          ['Outstanding',money(outstanding),CircleAlert],
          ['Overdue',overdue,CircleAlert],
        ].map(([label,value,Icon])=>{
          const I=Icon as typeof CreditCard;
          return (
            <div className="amu-card" key={String(label)}>
              <I size={20} className="text-[#c8a24b]"/>
              <p className="mt-3 text-sm text-neutral-500">{label}</p>
              <strong className="mt-1 block text-2xl">{value as string}</strong>
            </div>
          );
        })}
      </section>

      <section className="amu-card mt-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="rounded-xl border border-neutral-200 p-3"
            placeholder="Search customers, orders or products..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          <select
            className="rounded-xl border border-neutral-200 p-3"
            value={status}
            onChange={e=>setStatus(e.target.value)}
          >
            {['All','Active','Due Soon','Overdue','Completed','Cancelled'].map(item=>
              <option key={item}>{item}</option>
            )}
          </select>

          <select
            className="rounded-xl border border-neutral-200 p-3"
            value={sort}
            onChange={e=>setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="balance">Highest Balance</option>
            <option value="paid">Highest Paid</option>
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {sorted.map(plan=>{
            const total=Number(plan.totalAmount||0);
            const paid=Number(plan.paidAmount||0);
            const progress=total ? Math.min(100,Math.round((paid/total)*100)) : 0;

            return (
              <article key={plan.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h2 className="font-serif text-xl">
                      {plan.productName || 'JayLuxe Order'}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Order #{plan.orderId || plan.id}
                    </p>
                  </div>
                  <span className="h-fit rounded-full border px-3 py-1 text-sm">
                    {statusLabel(plan.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-4">
                  <div><small>Total</small><strong>{money(total)}</strong></div>
                  <div><small>Paid</small><strong>{money(paid)}</strong></div>
                  <div><small>Balance</small><strong>{money(plan.remainingBalance || outstanding)}</strong></div>
                  <div><small>Next Payment</small><strong>{money(plan.nextPaymentAmount)}</strong></div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-[#c8a24b]" style={{width:`${progress}%`}}/>
                </div>

                <p className="mt-2 text-sm text-neutral-600">
                  {progress}% complete
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
