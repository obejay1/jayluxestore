import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminSession } from '@/lib/adminServerAuth';

export const dynamic='force-dynamic';

export default async function AnalyticsPage(){
  try { await requireAdminSession({permission:'reports'}); } catch { redirect('/admin/login?error=expired'); }
  const orders=await adminDb.collection('orders').limit(500).get();
  let revenue=0;
  const products:Record<string,number>={};
  orders.docs.forEach(d=>{
    const o=d.data();
    if(o.status==='paid'||o.status==='completed'||o.paymentStatus==='completed') revenue += Number(o.total||o.amount||0);
    (o.items||[]).forEach((i:any)=> products[i.name]=(products[i.name]||0)+Number(i.quantity||1));
  });
  const best=Object.entries(products).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return <main style={{padding:24}}><h1>Business Analytics</h1><section><h2>Revenue</h2><p>₦{revenue.toLocaleString()}</p></section><section><h2>Best Sellers</h2>{best.map(([n,q])=><p key={n}>{n}: {q}</p>)}</section></main>;
}
