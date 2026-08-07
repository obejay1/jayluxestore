import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';

import { adminAuth } from '@/lib/firebaseAdmin';

export function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

export async function getVerifiedCustomer(
  request: NextRequest,
): Promise<DecodedIdToken | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}
