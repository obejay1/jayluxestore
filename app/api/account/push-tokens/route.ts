import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { hasTrustedRequestOrigin } from '@/lib/adminRequest';
import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TokenPayload = {
  token?: unknown;
  previousToken?: unknown;
};

function cleanToken(value: unknown) {
  return typeof value === 'string' && value.length <= 4096 ? value.trim() : '';
}

function tokenDocumentId(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function readPayload(request: NextRequest): Promise<TokenPayload | null> {
  try {
    const payload = (await request.json()) as TokenPayload;
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ message: 'The request origin is not trusted.' }, { status: 403 });
  }
  const customer = await getVerifiedCustomer(request);
  if (!customer) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });

  const payload = await readPayload(request);
  const token = cleanToken(payload?.token);
  if (!token) return NextResponse.json({ message: 'A valid push token is required.' }, { status: 400 });

  const tokens = adminDb.collection('pushNotificationTokens');
  const tokenRef = tokens.doc(tokenDocumentId(token));
  const previousToken = cleanToken(payload?.previousToken);
  const previousRef = previousToken ? tokens.doc(tokenDocumentId(previousToken)) : null;

  try {
    const withinDeviceLimit = await adminDb.runTransaction(async (transaction) => {
      const [tokenSnapshot, previousSnapshot, customerTokens] = await Promise.all([
        transaction.get(tokenRef),
        previousRef && previousRef.path !== tokenRef.path
          ? transaction.get(previousRef)
          : Promise.resolve(null),
        transaction.get(tokens.where('userId', '==', customer.uid).limit(11)),
      ]);
      const currentOwner = tokenSnapshot.data()?.userId;
      const alreadyOwned = currentOwner === customer.uid;
      if (!alreadyOwned && customerTokens.size >= 10) return false;

      const now = new Date().toISOString();

      if (
        previousRef &&
        previousRef.path !== tokenRef.path &&
        previousSnapshot?.exists &&
        previousSnapshot.data()?.userId === customer.uid
      ) {
        transaction.delete(previousRef);
      }

      transaction.set(tokenRef, {
        token,
        userId: customer.uid,
        createdAt: tokenSnapshot.exists
          ? tokenSnapshot.data()?.createdAt || now
          : now,
        updatedAt: now,
      });
      return true;
    });
    if (!withinDeviceLimit) {
      return NextResponse.json(
        { message: 'A maximum of 10 notification-enabled devices is allowed per account.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('PUSH TOKEN REGISTRATION ERROR:', error);
    return NextResponse.json({ message: 'The notification subscription could not be saved.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ message: 'The request origin is not trusted.' }, { status: 403 });
  }
  const customer = await getVerifiedCustomer(request);
  if (!customer) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });

  const payload = await readPayload(request);
  const token = cleanToken(payload?.token);
  if (!token) return NextResponse.json({ message: 'A valid push token is required.' }, { status: 400 });

  try {
    const tokenRef = adminDb.collection('pushNotificationTokens').doc(tokenDocumentId(token));
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(tokenRef);
      if (snapshot.exists && snapshot.data()?.userId === customer.uid) {
        transaction.delete(tokenRef);
      }
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('PUSH TOKEN REMOVAL ERROR:', error);
    return NextResponse.json({ message: 'The notification subscription could not be removed.' }, { status: 500 });
  }
}
