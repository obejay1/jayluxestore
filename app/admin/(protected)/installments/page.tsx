'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminInstallmentsPage() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(query(collection(db, 'installmentPlans')), snap => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#faf7f0] p-6 text-black">
      <h1 className="font-serif text-3xl">Installment Payments</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Manage customer installment plans and payment progress.
      </p>

      <div className="mt-6 grid gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="rounded-2xl border bg-white p-5">
            <p>Customer: {plan.userId}</p>
            <p>Order: {plan.orderId}</p>
            <p>Total: ₦{Number(plan.totalAmount || 0).toLocaleString()}</p>
            <p>Paid: ₦{Number(plan.paidAmount || 0).toLocaleString()}</p>
            <p>Balance: ₦{Number(plan.remainingBalance || 0).toLocaleString()}</p>
            <p>Status: {plan.status}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
