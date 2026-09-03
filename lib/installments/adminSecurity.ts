import { requireAdminSession } from '@/lib/adminServerAuth';

export async function requireInstallmentAdmin() {
  return requireAdminSession({ roles: ['super_admin', 'admin'] });
}
