'use client';

import { useSyncExternalStore } from 'react';

import { getCartCount, subscribeToCart } from '@/lib/store';

export function useCartCount() {
  return useSyncExternalStore(
    subscribeToCart,
    getCartCount,
    () => 0,
  );
}
