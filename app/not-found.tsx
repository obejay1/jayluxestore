import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="jl-system-page">
      <span className="jl-system-code">404</span>
      <h1 className="font-serif">This page is not in the collection.</h1>
      <p>The link may have changed, or the item may no longer be available.</p>
      <div className="jl-system-actions">
        <Link href="/shop">
          <Search size={17} aria-hidden="true" /> Browse the shop
        </Link>
        <Link href="/shop">Browse products <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </main>
  );
}
