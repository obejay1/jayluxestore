'use client';

import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { getCartCount, subscribeToCart } from '@/lib/store';

export function useCartCount() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useSyncExternalStore(
    subscribeToCart,
    mounted ? getCartCount : () => 0,
    () => 0
  );
}
