'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';

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
  coupon?: Coupon;
}

const fallbackCoupons: Coupon[] = [];


const ls =
  typeof window !== 'undefined' ? window.localStorage : null;

export async function getCoupons(): Promise<Coupon[]> {
  if (db) {
    const snap = await getDocs(collection(db, 'coupons'));

    const storedCoupons = snap.docs.map((d) => ({
      ...(d.data() as Coupon),
      id: d.id,
    }));
    const storedCodes = new Set(
      storedCoupons.map((coupon) => coupon.code.trim().toUpperCase()),
    );

    return [
      ...storedCoupons,
      ...fallbackCoupons.filter(
        (coupon) => !storedCodes.has(coupon.code.trim().toUpperCase()),
      ),
    ];
  }

  const saved = ls?.getItem('coupons');

  if (saved) return JSON.parse(saved);

  return [];
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  const cleanCoupon: Coupon = {
    ...coupon,
    id: coupon.id || coupon.code.toUpperCase(),
    code: coupon.code.toUpperCase(),
    discount: Number(coupon.discount || 0),
    type: coupon.type || 'percentage',
    minOrder: Number(coupon.minOrder || 0),
    active: coupon.active !== false,
  };

  if (db) {
    await setDoc(doc(db, 'coupons', cleanCoupon.id), cleanCoupon);
    return;
  }

  const all = await getCoupons();
  const next = [
    cleanCoupon,
    ...all.filter((c) => c.id !== cleanCoupon.id),
  ];

  ls?.setItem('coupons', JSON.stringify(next));
}

export async function removeCoupon(id: string): Promise<void> {
  if (db) {
    await deleteDoc(doc(db, 'coupons', id));
    return;
  }

  const all = await getCoupons();
  ls?.setItem(
    'coupons',
    JSON.stringify(all.filter((c) => c.id !== id))
  );
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponResult> {
  const upper = code.trim().toUpperCase();

  if (!upper) {
    return {
      valid: false,
      discount: 0,
      message: 'Please enter a coupon code.',
    };
  }

  const coupons = await getCoupons();

  const coupon = coupons.find(
    (c) => c.code.toUpperCase() === upper && c.active !== false
  );

  if (!coupon) {
    return {
      valid: false,
      discount: 0,
      message: `Invalid coupon code: "${code}"`,
    };
  }

  if (coupon.expiryDate) {
    const today = new Date();
    const expiry = new Date(coupon.expiryDate);

    if (expiry < today) {
      return {
        valid: false,
        discount: 0,
        message: 'This coupon has expired.',
      };
    }
  }

  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order is ₦${coupon.minOrder.toLocaleString()}.`,
    };
  }

  const discount =
    coupon.type === 'fixed'
      ? Number(coupon.discount)
      : Math.round(subtotal * (Number(coupon.discount) / 100));

  return {
    valid: true,
    discount,
    message:
      coupon.message ||
      `${coupon.code} applied! You saved ₦${discount.toLocaleString()}.`,
    coupon,
  };
}