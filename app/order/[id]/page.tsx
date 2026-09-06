import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const steps = [
  'Order Received',
  'Payment Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
];

export default async function OrderTracking({ params }: { params: { id: string } }) {
  const snap = await adminDb.collection('orders').doc(params.id).get();
  if (!snap.exists) return notFound();

  const order = snap.data() || {};
  const paymentStatus = String(order.paymentStatus || '').toLowerCase();
  const orderStatus = String(order.status || '').toLowerCase();
  const confirmed = paymentStatus === 'paid' || paymentStatus === 'completed';

  return (
    <main className="jl-account-page" style={{ padding: '32px 20px' }}>
      <section className="jl-card" style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: '#8c6b2f', fontWeight: 700 }}>JAYLUXE ORDER</p>
        <h1>Order Tracking</h1>
        <p>Reference: {params.id}</p>

        <div style={{ marginTop: 24 }}>
          <h2>Current Status</h2>
          <p style={{ textTransform: 'capitalize' }}>{orderStatus || 'pending'}</p>
          <p>Payment: {paymentStatus || 'pending'}</p>
        </div>

        <ol style={{ marginTop: 28, display: 'grid', gap: 12 }}>
          {steps.map((step, index) => (
            <li key={step} style={{ display: 'flex', gap: 10 }}>
              <span>{index === 1 && !confirmed ? '○' : '✓'}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
