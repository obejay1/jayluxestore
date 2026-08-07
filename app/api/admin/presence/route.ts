import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import {
  adminAuthErrorResponse,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { adminDb } from '@/lib/firebaseAdmin';
import { hasTrustedRequestOrigin } from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The request origin is not trusted.' },
      { status: 403 },
    );
  }

  try {
    const session = await requireAdminSession();
    let online = true;

    try {
      const body = (await request.json()) as { online?: unknown };
      online = body.online !== false;
    } catch {
      online = true;
    }

    await adminDb.collection('adminUsers').doc(session.user.uid).set(
      {
        online,
        lastSeenAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, online });
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
