'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export interface Booking {
  id: string;
  kind?: 'service' | 'bridal';
  serviceId?: string;
  serviceName: string;
  servicePrice?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  date: string;
  eventDate?: string;
  time: string;
  eventLocation?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt?: string;
}

function toBooking(id: string, data: Record<string, unknown>): Booking {
  const createdAt = data.createdAt as { toDate?: () => Date } | string | undefined;
  const createdAtValue =
    typeof createdAt === 'string'
      ? createdAt
      : createdAt?.toDate?.().toISOString();

  return {
    id,
    kind: data.kind === 'bridal' ? 'bridal' : 'service',
    serviceId: String(data.serviceId || ''),
    serviceName: String(data.serviceName || data.packageName || 'Booking'),
    servicePrice: Number(data.servicePrice || 0),
    customerName: String(data.customerName || 'Customer'),
    customerEmail: String(data.customerEmail || ''),
    customerPhone: String(data.customerPhone || ''),
    date: String(data.date || data.eventDate || ''),
    eventDate: String(data.eventDate || ''),
    time: String(data.time || ''),
    eventLocation: String(data.eventLocation || ''),
    notes: String(data.notes || data.message || ''),
    status: ['confirmed', 'completed', 'cancelled'].includes(String(data.status))
      ? (String(data.status) as Booking['status'])
      : 'pending',
    createdAt: createdAtValue,
  };
}

export async function getBookings(): Promise<Booking[]> {
  const snapshot = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => toBooking(item.id, item.data()));
}

export async function removeBooking(id: string) {
  await deleteDoc(doc(db, 'bookings', id));
}

export async function updateBookingStatus(id: string, status: string) {
  const allowed: Booking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status as Booking['status'])) {
    throw new Error('Invalid booking status.');
  }
  await updateDoc(doc(db, 'bookings', id), { status });
}
