import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CouponData = {
  code?: string;
  discount?: number;
  type?: 'percentage' | 'fixed';
  minOrder?: number;
  expiryDate?: string;
  active?: boolean;
  message?: string;
};

function cleanCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase().slice(0, 40);
}

export async function POST(request: Request) {
  let body: { code?: unknown; subtotal?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, discount: 0, message: 'Invalid coupon request.' }, { status: 400 });
  }

  const code = cleanCode(body.code);
  const subtotal = Number(body.subtotal);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ valid: false, discount: 0, message: 'Enter a valid coupon code.' }, { status: 400 });
  }

  const coupons = adminDb.collection('coupons');
  const direct = await coupons.doc(code).get();
  let coupon = direct.exists ? (direct.data() as CouponData) : undefined;
  if (!coupon) {
    const query = await coupons.where('code', '==', code).limit(1).get();
    coupon = query.empty ? undefined : (query.docs[0].data() as CouponData);
  }

  if (!coupon || coupon.active === false) {
    return NextResponse.json({ valid: false, discount: 0, message: 'Invalid coupon code.' });
  }
  if (coupon.expiryDate) {
    const expiry = Date.parse(coupon.expiryDate);
    if (Number.isFinite(expiry) && expiry < Date.now()) {
      return NextResponse.json({ valid: false, discount: 0, message: 'This coupon has expired.' });
    }
  }
  const minOrder = Number(coupon.minOrder || 0);
  if (subtotal < minOrder) {
    return NextResponse.json({ valid: false, discount: 0, message: `Minimum order is ₦${minOrder.toLocaleString('en-NG')}.` });
  }
  const value = Number(coupon.discount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ valid: false, discount: 0, message: 'This coupon is unavailable.' });
  }
  const discount = Math.min(subtotal, Math.max(0, Math.round(coupon.type === 'fixed' ? value : subtotal * (value / 100))));
  return NextResponse.json({
    valid: true,
    discount,
    message: coupon.message || `${code} applied! You saved ₦${discount.toLocaleString('en-NG')}.`,
    coupon: { code, type: coupon.type || 'percentage' },
  });
}
