import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function AdminAccessDeniedPage() {
  return (
    <main className="admin-access-denied">
      <section>
        <ShieldX size={42} aria-hidden="true" />
        <p>JayLuxe Administration</p>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link href="/admin">Return to Dashboard</Link>
      </section>
    </main>
  );
}
