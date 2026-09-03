import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminSession } from '@/lib/adminServerAuth';
export const dynamic='force-dynamic';
export default async function EmailOperationsPage(){try{await requireAdminSession({permission:'reports'})}catch{redirect('/admin/login?error=expired')}const s=await adminDb.collection('email_events').orderBy('createdAt','desc').limit(50).get();return <main style={{padding:24}}><h1>Email Events</h1>{s.docs.map(d=><p key={d.id}>{d.data().email} — {d.data().status} — {d.data().createdAt}</p>)}</main>}
