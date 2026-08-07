import { redirect } from 'next/navigation';

import AdminActivityClient from '@/components/admin/AdminActivityClient';
import AdminPageFrame from '@/components/admin/AdminPageFrame';
import { AdminAuthError, requireAdminSession } from '@/lib/adminServerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminActivityPage() {
  try {
    const session = await requireAdminSession({ permission: 'activity' });

    return (
      <AdminPageFrame
        user={session.user}
        title="Activity Log"
        subtitle="Search and review security-sensitive actions performed by JayLuxe administrators and staff."
      >
        <AdminActivityClient />
      </AdminPageFrame>
    );
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) {
      redirect('/admin/access-denied');
    }
    redirect('/admin/login?error=expired');
  }
}
