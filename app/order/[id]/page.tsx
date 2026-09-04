import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
export const dynamic='force-dynamic';
export default async function OrderTracking({params}:{params:{id:string}}){
 const snap=await adminDb.collection('orders').doc(params.id).get();
 if(!snap.exists) return notFound();
 const o=snap.data()!;
 return <main style={{padding:24}}><h1>Order Tracking</h1><p>Order: {params.id}</p><ol><li>Order received ✓</li><li>Payment confirmed {o.paymentStatus==='completed'?'✓':''}</li><li>Preparing package</li><li>Shipped</li><li>Delivered</li></ol></main>
}
