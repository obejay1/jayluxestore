import { redirect } from 'next/navigation';

import AdminReportsClient from '@/components/admin/AdminReportsClient';
import { AdminAuthError, requireAdminSession } from '@/lib/adminServerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  try {
    await requireAdminSession({ permission: 'reports' });
    return <AdminReportsClient />;
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) {
      redirect('/admin/access-denied');
    }
    redirect('/admin/login?error=expired');
  }
}
