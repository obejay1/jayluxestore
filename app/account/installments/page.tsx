'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Wallet, ShieldCheck, CreditCard, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react';
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, orderId: plan.orderId }),
      });

      const data = await response.json();
      if (data.authorizationUrl) window.location.href = data.authorizationUrl;
      else throw new Error(data.error || 'Unable to start payment');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  }

  useEffect(() => {
    let unsubscribePlans: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setPlans([]); return; }
      const q = query(collection(db, 'installmentPlans'), where('userId', '===', user.uid));
      unsubscribePlans = onSnapshot(q, (snap) => {
        setPlans(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<InstallmentPlan, 'id'>) })));
      });
    });
    return () => { unsubscribeAuth(); unsubscribePlans?.(); };
  }, []);

  return <>
    <main className="jl-installments-page">
      <div className="jl-installments-container">
        <section className="jl-installments-hero">
          <span>INSTALLMENT PAYMENT</span>
          <h1>Pay in Installments</h1>
          <p>Spread your payment into simple, manageable payments.</p>
        </section>

        <section className="jl-installments-section">
          <h2>How It Works</h2>
          <div className="jl-installments-how-grid">
            {[
              [Wallet, '01', 'Choose Your Plan', 'Select an available installment option.'],
              [CreditCard, '02', 'Make a Payment', 'Pay your current installment securely online.'],
              [BarChart3, '03', 'Track Your Balance', 'Monitor your remaining payments from your account.'],
            ].map(([Icon, num, title, text]: any) => (
              <div className="jl-installment-how-card" key={title}>
                <div className="jl-installment-number">{num}</div>
                <Icon size={28} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {plans.length === 0 ? (
          <section className="jl-installment-empty">
            <Wallet size={45} />
            <h2>No Active Installment Plan</h2>
            <p>You don't have an active installment payment plan yet.</p>
            <Link href="/shop" className="jl-installment-button">Continue Shopping <ArrowRight size={18}/></Link>
          </section>
        ) : plans.map((plan) => {
          const total = Number(plan.totalAmount || 0);
          const paid = Number(plan.paidAmount || 0);
          const progress = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          return <section className="jl-installment-card" key={plan.id}>
            <div className="jl-installment-card-head">
              <div>
                <small>YOUR INSTALLMENT PLAN</small>
                <h2>{plan.productName || 'JayLuxe Order'}</h2>
                <p>Order #{plan.orderId || plan.id}</p>
              </div>
              <strong>{plan.status || 'Active'}</strong>
            </div>
            <div className="jl-installment-body">
              <div className="jl-progress-title"><span>Payment Progress</span><b>{progress}%</b></div>
              <div className="jl-progress"><div style={{width:`${progress}%`}} /></div>
              <p>{progress}% completed</p>
              <div className="jl-installment-summary">
                <div><small>Total</small><b>{money(total)}</b></div>
                <div><small>Paid</small><b>{money(paid)}</b></div>
                <div><small>Remaining</small><b>{money(plan.remainingBalance)}</b></div>
                <div><small>Next Payment</small><b>{money(plan.nextPaymentAmount)}</b></div>
              </div>
              {plan.nextPaymentDate && <p>Next payment date: {plan.nextPaymentDate}</p>}
              <button className="jl-installment-button" disabled={paying === plan.id || progress >= 100} onClick={() => continuePayment(plan)}>
                {progress >= 100 ? <><CheckCircle2 size={18}/> Completed</> : paying === plan.id ? 'Opening Payment...' : <>Pay Next Installment <ArrowRight size={18}/></>}
              </button>
            </div>
          </section>
        })}
      </div>
    </main>
    <Footer />
  </>;
}
