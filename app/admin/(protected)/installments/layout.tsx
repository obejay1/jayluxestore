import { redirect } from 'next/navigation';
import { AdminAuthError } from '@/lib/adminServerAuth';
import { requireInstallmentAdmin } from '@/lib/installments/adminSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function InstallmentAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  try {
    await requireInstallmentAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) redirect('/admin/access-denied');
    throw error;
  }
  return children;
}
