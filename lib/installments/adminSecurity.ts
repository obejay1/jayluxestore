import { requireAdminSession } from '@/lib/adminServerAuth';

export async function requireInstallmentAdmin() {
  return requireAdminSession();
}
