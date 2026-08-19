'use client';

import { useSyncExternalStore } from 'react';

import { getCartItemCount, subscribeToCart } from '@/lib/store';

export function useCartCount() {
  return useSyncExternalStore(
    subscribeToCart,
    getCartItemCount,
    () => 0,
  );
}
