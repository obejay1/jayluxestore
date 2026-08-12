'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminReportsError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error('Financial reports render error:', error);
  }, [error]);

  return (
    <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f4ef' }}>
      <section role="alert" style={{ width: 'min(560px, 100%)', padding: 28, border: '1px solid #e5ded4', borderRadius: 18, background: '#fff', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px', fontSize: '1.35rem' }}>Unable to display Financial Reports</h1>
        <p style={{ margin: '0 0 18px', color: '#786f64', lineHeight: 1.6 }}>An unexpected rendering error occurred. You can retry the report without leaving the admin portal.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          <button type="button" onClick={reset} style={{ minHeight: 42, padding: '9px 14px', border: 0, borderRadius: 10, background: '#211b15', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Try again</button>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 42, padding: '9px 14px', border: '1px solid #d8d0c4', borderRadius: 10, color: '#211b15', fontWeight: 800, textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </section>
    </main>
  );
}
