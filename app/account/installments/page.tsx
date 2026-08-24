'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Footer from '@/components/Footer';
import { auth, db } from '@/lib/firebase';

type InstallmentPlan = {
  id: string;
  orderId?: string;
  productName?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: string;
  status?: string;
};

function money(value = 0) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

export default function InstallmentsPage() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  async function continuePayment(plan: InstallmentPlan) {
    try {
      setPaying(plan.id);
      const token = await auth.currentUser?.getIdToken();

      if (!token) throw new Error('Please sign in again');

      const response = await fetch('/api/installments/create-payment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          orderId: plan.orderId,
        }),
      });

      const data = await response.json();

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      throw new Error(data.error || 'Unable to start payment');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  }

  useEffect(() => {
    let unsubscribePlans: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPlans([]);
        return;
      }

      const q = query(
        collection(db, 'installmentPlans'),
        where('userId', '==', user.uid)
      );

      unsubscribePlans = onSnapshot(q, (snap) => {
        setPlans(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<InstallmentPlan, 'id'>),
          }))
        );
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribePlans?.();
    };
  }, []);

  return (
    <>
      <main className="tw-min-h-screen tw-bg-[#faf7f0] tw-px-4 tw-py-16 tw-text-[#171717]">
        <div className="tw-mx-auto tw-max-w-5xl">
          <header className="tw-mb-10">
            <p className="tw-text-xs tw-uppercase tw-tracking-[0.25em] tw-text-[#a17a27]">
              JayLuxe Account
            </p>
            <h1 className="tw-mt-3 tw-font-serif tw-text-4xl md:tw-text-5xl">
              Installment Payments
            </h1>
            <p className="tw-mt-4 tw-max-w-2xl tw-text-neutral-600">
              Manage your payment plan, track completed payments, and view your remaining balance.
            </p>
          </header>

          {plans.length === 0 ? (
            <section className="tw-rounded-3xl tw-border tw-border-[#e8dfd2] tw-bg-white tw-p-10 tw-text-center tw-shadow-[0_15px_45px_rgba(0,0,0,0.05)]">
              <h2 className="tw-font-serif tw-text-2xl">No Active Installment Plans</h2>
              <p className="tw-mx-auto tw-mt-3 tw-max-w-md tw-text-sm tw-text-neutral-600">
                You currently do not have an installment payment plan.
              </p>
              <Link href="/shop" className="tw-mt-7 tw-inline-flex tw-rounded-full tw-bg-[#171717] tw-px-8 tw-py-3.5 tw-text-white hover:tw-opacity-90">
                Continue Shopping
              </Link>
            </section>
          ) : (
            <div className="tw-space-y-8">
              {plans.map((plan) => {
                const total = Number(plan.totalAmount || 0);
                const paid = Number(plan.paidAmount || 0);
                const progress = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <section key={plan.id} className="tw-overflow-hidden tw-rounded-[28px] tw-border tw-border-[#e8dfd2] tw-bg-white tw-shadow-[0_18px_50px_rgba(0,0,0,0.05)]">
                    <div className="tw-bg-[#171717] tw-p-6 tw-text-white md:tw-p-8">
                      <div className="tw-flex tw-flex-col tw-gap-4 md:tw-flex-row md:tw-items-start md:tw-justify-between">
                        <div>
                          <p className="tw-text-xs tw-uppercase tw-tracking-[0.22em] tw-text-[#d9b56a]">Active Payment Plan</p>
                          <h2 className="tw-mt-3 tw-font-serif tw-text-3xl">{plan.productName || 'JayLuxe Order'}</h2>
                          <p className="tw-mt-2 tw-text-sm tw-text-white/70">Order #{plan.orderId || plan.id}</p>
                        </div>
                        <span className="tw-w-fit tw-rounded-full tw-bg-white/10 tw-px-4 tw-py-2 tw-text-sm">{plan.status || 'Active'}</span>
                      </div>
                    </div>

                    <div className="tw-p-6 md:tw-p-8">
                      <div className="tw-flex tw-justify-between tw-text-sm">
                        <span>Payment Progress</span>
                        <strong>{progress}%</strong>
                      </div>

                      <div className="tw-mt-4 tw-h-3 tw-overflow-hidden tw-rounded-full tw-bg-[#ece7dc]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div className="tw-h-full tw-rounded-full tw-bg-[#b88a2d] tw-transition-all tw-duration-700" style={{ width: `${progress}%` }} />
                      </div>

                      <p className="tw-mt-3 tw-text-sm tw-text-neutral-600">
                        {progress === 100 ? 'Installment plan completed' : 'Continue your payment journey'}
                      </p>

                      <div className="tw-mt-8 tw-grid tw-gap-5 sm:tw-grid-cols-3">
                        <div><p className="tw-text-xs tw-text-neutral-500">Amount Paid</p><p className="tw-mt-2 tw-font-serif tw-text-2xl">{money(paid)}</p></div>
                        <div><p className="tw-text-xs tw-text-neutral-500">Remaining</p><p className="tw-mt-2 tw-font-serif tw-text-2xl">{money(plan.remainingBalance)}</p></div>
                        <div><p className="tw-text-xs tw-text-neutral-500">Next Payment</p><p className="tw-mt-2 tw-font-serif tw-text-2xl">{money(plan.nextPaymentAmount)}</p></div>
                      </div>

                      {plan.nextPaymentDate && <p className="tw-mt-6 tw-text-sm tw-text-neutral-600">Next payment date: {plan.nextPaymentDate}</p>}

                      <div className="tw-mt-8 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row">
                        <button onClick={() => continuePayment(plan)} disabled={paying === plan.id || progress >= 100} className="tw-rounded-full tw-bg-[#171717] tw-px-8 tw-py-3.5 tw-text-white hover:tw-opacity-90 disabled:tw-opacity-50">
                          {paying === plan.id ? 'Opening Payment...' : progress >= 100 ? 'Completed' : 'Make Payment'}
                        </button>
                        <Link href="/account" className="tw-rounded-full tw-border tw-border-[#171717] tw-px-8 tw-py-3.5 tw-text-center">
                          Back to Account
                        </Link>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
