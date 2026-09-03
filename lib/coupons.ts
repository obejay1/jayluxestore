'use client';

import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type?: 'percentage' | 'fixed';
  minOrder?: number;
  expiryDate?: string;
  active?: boolean;
  message?: string;
}

export interface CouponResult {
  valid: boolean;
  discount: number;
  message: string;
  coupon?: Pick<Coupon, 'code' | 'type'>;
}

export async function getCoupons(): Promise<Coupon[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'coupons'));
  return snap.docs.map((entry) => ({ ...(entry.data() as Coupon), id: entry.id }));
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  if (!db) throw new Error('Coupon storage is unavailable.');
  const cleanCoupon: Coupon = {
    ...coupon,
    id: coupon.id || coupon.code.toUpperCase(),
    code: coupon.code.trim().toUpperCase(),
    discount: Number(coupon.discount || 0),
    type: coupon.type || 'percentage',
    minOrder: Number(coupon.minOrder || 0),
    active: coupon.active !== false,
  };
  await setDoc(doc(db, 'coupons', cleanCoupon.id), cleanCoupon);
}

export async function removeCoupon(id: string): Promise<void> {
  if (!db) throw new Error('Coupon storage is unavailable.');
  await deleteDoc(doc(db, 'coupons', id));
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  const response = await fetch('/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as CouponResult & { message?: string };
  if (!response.ok) {
    return {
      valid: false,
      discount: 0,
      message: data.message || 'The coupon could not be validated.',
    };
  }
  return data;
}
