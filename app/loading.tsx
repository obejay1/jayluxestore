import { LoaderCircle } from 'lucide-react';

export default function RootLoading() {
  return (
    <main className="jl-system-page" aria-busy="true" aria-live="polite">
      <LoaderCircle className="jl-spin" size={34} aria-hidden="true" />
      <h1 className="font-serif">Preparing JayLuxe</h1>
      <p>Loading your luxury experience…</p>
    </main>
  );
}
