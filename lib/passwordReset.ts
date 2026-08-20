import { PRODUCTION_SITE_URL } from '@/lib/site';

export function buildBrandedPasswordResetLink(firebaseResetLink: string) {
  const parsed = new URL(firebaseResetLink);
  const oobCode = parsed.searchParams.get('oobCode')?.trim();

  if (!oobCode) {
    throw new Error('Firebase password reset link is missing an action code.');
  }

  return `${PRODUCTION_SITE_URL}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
}
