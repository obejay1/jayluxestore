import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminSession } from '@/lib/adminServerAuth';
export const dynamic='force-dynamic';
export default async function InventoryOperationsPage(){try{await requireAdminSession({permission:'reports'})}catch{redirect('/admin/login?error=expired')}const s=await adminDb.collection('inventory_movements').orderBy('createdAt','desc').limit(50).get();return <main style={{padding:24}}><h1>Inventory Movement</h1>{s.docs.map(d=><p key={d.id}>{d.data().productId} — {d.data().type} ({d.data().quantity}) — {d.data().createdAt}</p>)}</main>}
