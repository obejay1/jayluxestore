import { adminDb } from '@/lib/firebaseAdmin';

export default async function InstallmentSchedulePage({params}:{params:Promise<{id:string}>}){
 const { id } = await params;
 const snap = await adminDb.collection('installmentSchedules').where('planId','==',id).get();
 const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
 return <main className="p-6"><h1 className="text-xl font-bold">Payment Schedule</h1><div className="mt-4 space-y-3">{rows.map((r:any)=><div key={r.id} className="rounded border p-4"><div>Installment: {r.installmentNumber}</div><div>Amount: ₦{r.amount}</div><div>Status: {r.status}</div><div>Due: {r.dueDate}</div></div>)}</div></main>
}
