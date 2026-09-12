'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { captureOrderAccessToken } from '@/lib/orderAccess';

const money = (value: unknown) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString('en-NG')}` : '₦0';
};

type OrderData = Record<string, unknown> & {
  items?: Array<Record<string, unknown>>;
};

export default function OrderTracking() {
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id || '').trim();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setError('This order reference is invalid.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const accessToken = captureOrderAccessToken(orderId);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        setError('');
        const idToken = user ? await user.getIdToken() : '';
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: {
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...(accessToken ? { 'x-order-access-token': accessToken } : {}),
          },
          cache: 'no-store',
        });
        const data = await response.json() as { order?: OrderData; message?: string };
        if (!response.ok || !data.order) {
          throw new Error(data.message || 'The order could not be loaded.');
        }
        if (!cancelled) setOrder(data.order);
      } catch (loadError) {
        if (!cancelled) {
          setOrder(null);
          setError(loadError instanceof Error ? loadError.message : 'The order could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [orderId]);

  const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
  const orderStatus = String(order?.status || '').toLowerCase();
  const confirmed = paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'partially paid';
  const items = Array.isArray(order?.items) ? order.items : [];

  const trackingStages = useMemo(() => [
    'Order Received',
    'Payment Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Delivered',
  ], []);

  const normalizedStatus = orderStatus.replace(/_/g, ' ');
  const statusIndexMap: Record<string, number> = {
    pending: 0,
    received: 0,
    'order received': 0,
    paid: 1,
    confirmed: 1,
    processing: 2,
    packed: 3,
    shipped: 4,
    delivered: 5,
    completed: 5,
  };
  const currentStage = statusIndexMap[normalizedStatus] ?? (confirmed ? 1 : 0);

  if (loading) {
    return (
      <main className="jl-account-page" style={{ padding: '40px 20px', background: '#faf8f3', minHeight: '100vh' }}>
        <section className="jl-card" style={{ maxWidth: 760, margin: '0 auto', padding: 28 }}>
          <p style={{ color: '#a67c28', fontWeight: 700 }}>JAYLUXE ORDER</p>
          <h1>Loading your order…</h1>
          <p>We are securely retrieving your order details.</p>
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="jl-account-page" style={{ padding: '40px 20px', background: '#faf8f3', minHeight: '100vh' }}>
        <section className="jl-card" style={{ maxWidth: 760, margin: '0 auto', padding: 28 }}>
          <p style={{ color: '#a67c28', fontWeight: 700 }}>JAYLUXE ORDER</p>
          <h1>We could not open this order.</h1>
          <p>{error || 'You may need to sign in with the account that placed this order.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="jl-account-page" style={{ padding: '24px 20px', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 22 }}>
        <section className="jl-card" style={{ padding: 30, borderRadius: 22, border: '1px solid #eadfc9', background: '#fffdf8', boxShadow: '0 12px 35px rgba(0,0,0,.06)' }}>
          <p style={{ color: '#a67c28', fontWeight: 700, letterSpacing: 1 }}>JAYLUXE ORDER</p>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, marginTop: 8, fontFamily: 'serif' }}>Order #{orderId.slice(0, 8).toUpperCase()}</h1>
          <p style={{ color: '#666' }}>Order reference: {orderId}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            <div className="jl-card" style={{ padding: 14, flex: 1, minWidth: 180 }}>
              <small>Status</small>
              <strong style={{ display: 'block', marginTop: 6, textTransform: 'capitalize' }}>{orderStatus || 'pending'}</strong>
            </div>
            <div className="jl-card" style={{ padding: 14, flex: 1, minWidth: 180 }}>
              <small>Payment</small>
              <strong style={{ display: 'block', marginTop: 6, textTransform: 'capitalize' }}>{paymentStatus || 'pending'}</strong>
            </div>
          </div>
        </section>

        <section className="jl-card" style={{ padding: 24, borderRadius: 22, border: '1px solid #eadfc9', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,.04)' }}>
          <p style={{ color: '#a67c28', fontWeight: 700, letterSpacing: 1 }}>YOUR PURCHASE</p>
          <h2 style={{ fontFamily: 'serif', fontSize: 28 }}>Order Items</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {items.length ? items.map((item, index) => (
              <div key={`${String(item.id || item.productId || index)}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: 14, border: '1px solid #eee', borderRadius: 14 }}>
                <div>
                  <strong>{String(item.name || item.productName || 'Item')}</strong>
                  <p style={{ color: '#666' }}>Quantity: {String(item.qty || item.quantity || 1)}</p>
                </div>
                <strong>{money(Number(item.price || item.amount || 0) * Number(item.qty || item.quantity || 1))}</strong>
              </div>
            )) : <p>No item details available.</p>}
          </div>
        </section>

        <section className="jl-card" style={{ padding: 24, borderRadius: 22, border: '1px solid #eadfc9', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,.04)' }}>
          <p style={{ color: '#a67c28', fontWeight: 700, letterSpacing: 1 }}>PAYMENT</p>
          <h2 style={{ fontFamily: 'serif', fontSize: 28 }}>Payment Summary</h2>
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <p>Total: <strong>{money(order.total || order.totalAmount)}</strong></p>
            <p>Payment Method: <strong>{String(order.paymentMethod || 'Not available')}</strong></p>
          </div>
        </section>

        <section className="jl-card" style={{ padding: 28, borderRadius: 22, border: '1px solid #eadfc9', background: '#fffdf8', boxShadow: '0 10px 30px rgba(0,0,0,.04)' }}>
          <p style={{ color: '#a67c28', fontWeight: 700, letterSpacing: 1 }}>TRACKING</p>
          <h2 style={{ fontFamily: 'serif', fontSize: 28, marginTop: 6 }}>Order Progress</h2>

          <div style={{ marginTop: 32, overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ minWidth: 720, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ position: 'absolute', top: 16, left: 45, right: 45, height: 3, background: '#eadfc9' }}>
                <div style={{ width: `${(currentStage / (trackingStages.length - 1)) * 100}%`, height: '100%', background: '#b8862f', transition: 'width .4s ease' }} />
              </div>

              {trackingStages.map((stage, index) => {
                const complete = index <= currentStage;
                return (
                  <div key={stage} style={{ position: 'relative', zIndex: 1, width: 100, textAlign: 'center' }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: complete ? '#b8862f' : '#fffdf8',
                      border: `2px solid ${complete ? '#b8862f' : '#d8c7a3'}`,
                      color: complete ? '#fff' : '#b8862f',
                      fontWeight: 700,
                    }}>
                      {complete ? '✓' : index + 1}
                    </div>
                    <p style={{ marginTop: 12, fontSize: 13, fontWeight: complete ? 700 : 500, color: complete ? '#17120c' : '#8a8175' }}>
                      {stage}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
