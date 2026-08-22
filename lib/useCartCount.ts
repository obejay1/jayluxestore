'use client';

import { useEffect, useState } from 'react';
import { getCartCount, subscribeToCart } from '@/lib/store';

export function useCartCount() {
  const [cartCount, setCartCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const syncCart = () => {
      setCartCount(getCartCount());
    };

    syncCart();

    const unsubscribe = subscribeToCart(syncCart);

    return unsubscribe;
  }, []);

  // Prevent Next.js hydration mismatch by keeping server/client initial HTML identical.
  return mounted ? cartCount : 0;
}
