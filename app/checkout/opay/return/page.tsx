export default function OpayReturnPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Processing payment...</h1>
        <p className="mt-3 text-gray-600">
          We are confirming your OPay payment. Please wait while we verify the transaction.
        </p>
      </div>
    </main>
  );
}
