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

      if (!token) {
        throw new Error('Please sign in again');
      }

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
      alert(
        error instanceof Error
          ? error.message
          : 'Payment failed'
      );
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

      if (unsubscribePlans) {
        unsubscribePlans();
      }
    };

  }, []);


  return (
    <>
      <main className="min-h-screen bg-[#faf7f0] px-4 py-10 text-black">

        <div className="mx-auto max-w-4xl">

          <h1 className="font-serif text-3xl">
            Pay in Installments
          </h1>


          <p className="mt-3 text-sm text-neutral-600">
            Spread your payment into simple, manageable payments.
          </p>



          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">

            <h2 className="font-serif text-xl">
              How It Works
            </h2>


            <div className="mt-4 grid gap-4 md:grid-cols-3">

              {[
                ['Choose Your Plan', 'Select an available installment option.'],
                ['Make a Payment', 'Pay your current installment securely online.'],
                ['Track Your Balance', 'Monitor remaining payments from your account.'],
              ].map(([title, text]) => (

                <div
                  key={title}
                  className="rounded-xl bg-[#faf7f0] p-4"
                >

                  <h3 className="font-medium">
                    {title}
                  </h3>


                  <p className="mt-2 text-sm text-neutral-600">
                    {text}
                  </p>

                </div>

              ))}

            </div>

          </section>




          <section className="mt-8">

            <h2 className="font-serif text-xl">
              Your Installment Plans
            </h2>



            {plans.length === 0 ? (

              <div className="mt-4 rounded-2xl border bg-white p-6 text-center">

                <p className="font-medium">
                  No Installment Plans
                </p>


                <p className="mt-2 text-sm text-neutral-600">
                  You don&apos;t have an active installment payment plan yet.
                </p>


                <Link
                  href="/shop"
                  className="mt-5 inline-block rounded-full bg-black px-6 py-3 text-white"
                >
                  Continue Shopping
                </Link>

              </div>


            ) : (


              <div className="mt-4 space-y-4">


                {plans.map((plan) => {

                  const total = Number(plan.totalAmount || 0);

                  const paid = Number(plan.paidAmount || 0);


                  const progress = total
                    ? Math.min(
                        100,
                        Math.round((paid / total) * 100)
                      )
                    : 0;



                  return (

                    <div
                      key={plan.id}
                      className="rounded-2xl border bg-white p-5"
                    >


                      <h3 className="font-serif text-lg">
                        {plan.productName || 'JayLuxe Order'}
                      </h3>



                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

                        <p>
                          Total: {money(total)}
                        </p>


                        <p>
                          Paid: {money(paid)}
                        </p>


                        <p>
                          Remaining: {money(plan.remainingBalance)}
                        </p>


                        <p>
                          Next payment: {money(plan.nextPaymentAmount)}
                        </p>

                      </div>



                      <div className="mt-5 h-2 rounded-full bg-neutral-200">

                        <div
                          className="h-2 rounded-full bg-[#c49a45]"
                          style={{
                            width: `${progress}%`,
                          }}
                        />

                      </div>



                      <p className="mt-2 text-sm">
                        {progress}% paid
                      </p>



                      <button
                        onClick={() => continuePayment(plan)}
                        disabled={
                          paying === plan.id ||
                          progress >= 100
                        }
                        className="mt-5 rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
                      >

                        {
                          paying === plan.id
                            ? 'Opening Payment...'
                            : progress >= 100
                              ? 'Completed'
                              : 'Continue Payment'
                        }

                      </button>


                    </div>

                  );

                })}


              </div>

            )}

          </section>


        </div>

      </main>


      <Footer />

    </>
  );
}