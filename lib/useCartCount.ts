'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getCartCount, subscribeToCart } from '@/lib/store';

export function useCartCount() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = useSyncExternalStore(
    subscribeToCart,
    getCartCount,
    () => 0
  );

  // Prevent Next.js SSR/client hydration mismatch caused by localStorage cart state.
  if (!mounted) {
    return 0;
  }

  return cartCount;
}
