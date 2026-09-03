'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

import PageHeroIcon from '@/components/PageHeroIcon';
import { auth } from '@/lib/firebase';
import { buildPrivateOrderUrl } from '@/lib/orderAccess';
import { setCart as persistCart } from '@/lib/store';

export default function CheckoutCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference')?.trim() || '';
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!reference) throw new Error('The payment reference is missing.');
        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ reference }),
          cache: 'no-store',
        });
        const data = await response.json() as { orderId?: string; accessToken?: string; message?: string };
        if (!response.ok || !data.orderId || !data.accessToken) throw new Error(data.message || 'The payment could not be confirmed.');
        if (cancelled) return;

        persistCart([]);
        void fetch('/api/termii/send-order-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, accessToken: data.accessToken }),
        }).catch(() => undefined);

        router.replace(buildPrivateOrderUrl(`/order/${encodeURIComponent(data.orderId)}`, data.accessToken));
        router.refresh();
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Your payment could not be confirmed.');
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [reference, router]);

  return (
    <main className="jl-order-page">
      <section className="jl-order-hero">
        <PageHeroIcon icon={error ? CheckCircle2 : LoaderCircle} label={error ? 'Payment received' : 'Confirming payment'} />
        <h1 className="font-serif">{error ? 'We are reconciling your payment' : 'Confirming your payment'}</h1>
        <p>{error || 'Your payment has returned successfully. We are securely creating your order now.'}</p>
        {error ? <p>Please keep your Paystack reference <strong>{reference || 'available'}</strong> and contact support if your confirmation email does not arrive.</p> : null}
      </section>
    </main>
  );
}
