
import { adminDb } from '@/lib/firebaseAdmin';

export default async function RefundsPage(){
 const snap=await adminDb.collection('installmentRefunds').orderBy('createdAt','desc').limit(100).get();
 return <div className="amu-page-content"><section className="amu-card"><h1 className="font-serif text-3xl">Installment Refunds</h1></section>
 <section className="amu-card">{snap.docs.map(d=><div key={d.id}>{JSON.stringify(d.data())}</div>)}</section></div>
}
