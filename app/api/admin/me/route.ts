import { NextResponse } from 'next/server';

import {
  adminAuthErrorResponse,
  requireAdminSession,
} from '@/lib/adminServerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAdminSession();
    return NextResponse.json(
      { ok: true, user: session.user },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
