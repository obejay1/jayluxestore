import { NextRequest, NextResponse } from 'next/server';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { getVerifiedCustomer } from '@/lib/requestAuth';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toOrder(snapshot: QueryDocumentSnapshot<DocumentData>): Order {
  const data = snapshot.data() as Order;
  const { accessToken: _accessToken, ...safeOrder } = data;
  return { ...safeOrder, id: snapshot.id } as Order;
}

function orderTime(order: Order) {
  const time = Date.parse(order.createdAt || '');
  return Number.isFinite(time) ? time : 0;
}

export async function GET(request: NextRequest) {
  const customer = await getVerifiedCustomer(request);

  if (!customer) {
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401 },
    );
  }

  try {
    const ordersReference = adminDb.collection('orders');
    const email = customer.email?.trim().toLowerCase() || '';
    const queries = [ordersReference.where('userId', '==', customer.uid).get()];

    if (email) {
      queries.push(
        ordersReference.where('customerEmailLower', '==', email).get(),
        ordersReference.where('customerEmail', '==', customer.email).get(),
      );
    }

    const snapshots = await Promise.all(queries);
    const orders = new Map<string, Order>();

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((document) => {
        orders.set(document.id, toOrder(document));
      });
    });

    return NextResponse.json(
      {
        orders: Array.from(orders.values()).sort(
          (left, right) => orderTime(right) - orderTime(left),
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('ACCOUNT ORDERS ERROR:', error);
    return NextResponse.json(
      { message: 'Your orders could not be loaded. Please try again.' },
      { status: 500 },
    );
  }
}
