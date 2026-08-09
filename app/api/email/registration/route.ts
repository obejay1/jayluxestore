import { NextRequest, NextResponse } from 'next/server';

import { sendRegistrationEmails } from '@/lib/email/workflows';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const customer = await getVerifiedCustomer(request);
  if (!customer?.uid || !customer.email) {
    return NextResponse.json({ ok: false, message: 'Authentication is required.' }, { status: 401 });
  }

  try {
    let requestedName = '';
    try {
      const body = (await request.json()) as { name?: unknown };
      requestedName = String(body.name ?? '').trim().slice(0, 120);
    } catch {
      requestedName = '';
    }

    const user = await adminAuth.getUser(customer.uid);
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, message: 'Your account email is missing.' }, { status: 400 });
    }

    const name = user.displayName?.trim() || requestedName || String(customer.name || '').trim() || 'Customer';
    const results = await sendRegistrationEmails({ uid: user.uid, email, name });
    return NextResponse.json({
      ok: true,
      verificationEmail: results[0].status,
      welcomeEmail: results[1].status,
    });
  } catch (error) {
    console.error('REGISTRATION EMAIL ERROR:', error);
    // Account creation is already successful; email failure must not invalidate it.
    return NextResponse.json({ ok: true, emailQueued: false });
  }
}
