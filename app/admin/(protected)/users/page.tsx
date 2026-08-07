import { redirect } from 'next/navigation';

import AdminPageFrame from '@/components/admin/AdminPageFrame';
import AdminUsersClient from '@/components/admin/AdminUsersClient';
import { AdminAuthError, requireAdminSession } from '@/lib/adminServerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  try {
    const session = await requireAdminSession({ roles: ['super_admin'] });

    return (
      <AdminPageFrame
        user={session.user}
        title="Admin & Staff Management"
        subtitle="Create unique Firebase Authentication accounts, assign roles and permissions, manage account status, and review staff presence."
      >
        <AdminUsersClient currentUser={session.user} />
      </AdminPageFrame>
    );
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) {
      redirect('/admin/access-denied');
    }
    redirect('/admin/login?error=expired');
  }
}
