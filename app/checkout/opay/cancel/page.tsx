import Link from "next/link";

export default function OpayCancelPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Payment cancelled</h1>
        <p className="mt-3 text-gray-600">
          Your OPay payment was cancelled. You can return to checkout and try again.
        </p>
        <Link className="inline-block mt-6 rounded bg-black px-5 py-3 text-white" href="/checkout">
          Return to Checkout
        </Link>
      </div>
    </main>
  );
}
