import { redirect } from 'next/navigation';

import { AdminAuthError, getCurrentAdminSession } from '@/lib/adminServerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await getCurrentAdminSession(true);
  } catch (error) {
    if (error instanceof AdminAuthError && error.code === 'ACCOUNT_DISABLED') {
      redirect('/admin/login?error=disabled');
    }
    redirect('/admin/login?error=expired');
  }

  return children;
}
