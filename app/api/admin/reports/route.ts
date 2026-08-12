import { NextResponse } from 'next/server';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

import {
  adminAuthErrorResponse,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

function serialiseFirestoreValue(value: unknown): SerializableValue {
  if (value == null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialiseFirestoreValue);

  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        return maybeTimestamp.toDate().toISOString();
      } catch {
        return null;
      }
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serialiseFirestoreValue(item),
      ]),
    );
  }

  return String(value);
}

function serialiseDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        serialiseFirestoreValue(value),
      ]),
    ),
  };
}

export async function GET() {
  try {
    await requireAdminSession({ permission: 'reports' });

    // Reports are an administrator-only server concern. Reading them through
    // the Admin SDK avoids coupling report access to unrelated client-side
    // Firestore permissions (for example, the separate `customers` permission).
    const [ordersSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
      adminDb.collection('orders').get(),
      adminDb.collection('users').get(),
      adminDb.collection('products').get(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        orders: ordersSnapshot.docs.map(serialiseDocument),
        users: usersSnapshot.docs.map(serialiseDocument),
        products: productsSnapshot.docs.map(serialiseDocument),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('Admin reports API failed:', error);
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}
