import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import type { AdminSessionUser } from '@/lib/adminTypes';

type AuditInput = {
  actor: AdminSessionUser;
  action: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  metadata?: Record<string, unknown>;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

export async function writeAdminActivity(input: AuditInput) {
  await adminDb.collection('adminActivity').add({
    actorUid: input.actor.uid,
    userName: clean(input.actor.fullName, 160),
    email: clean(input.actor.email, 200).toLowerCase(),
    role: input.actor.role,
    action: clean(input.action, 120),
    description: clean(input.description, 1200),
    targetType: input.targetType ? clean(input.targetType, 120) : null,
    targetId: input.targetId ? clean(input.targetId, 240) : null,
    ipAddress: input.ipAddress ? clean(input.ipAddress, 120) : null,
    browser: input.browser ? clean(input.browser, 500) : null,
    metadata: input.metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  });
}
