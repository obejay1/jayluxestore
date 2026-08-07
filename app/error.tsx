'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('JayLuxe route error:', error);
  }, [error]);

  return (
    <main className="jl-system-page" role="alert">
      <AlertTriangle size={42} aria-hidden="true" />
      <p className="jl-section-kicker">Something went wrong</p>
      <h1 className="font-serif">We could not open this page.</h1>
      <p>Please try again. Your cart and saved items have not been removed.</p>
      <div className="jl-system-actions">
        <button type="button" onClick={reset}>
          <RefreshCw size={17} aria-hidden="true" /> Try again
        </button>
        <Link href="/shop">Browse products</Link>
      </div>
    </main>
  );
}
