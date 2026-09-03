import assert from 'node:assert/strict';
import test from 'node:test';

import { CartInputError, normalizeRequestedCartItems } from '../lib/checkout/cart.ts';

test('duplicate cart lines are consolidated before inventory reservation', () => {
  assert.deepEqual(normalizeRequestedCartItems([
    { id: 'shoe-1', qty: 2 },
    { id: 'shoe-1', qty: 3 },
    { id: 'bag-1', qty: 1 },
  ]), [
    { id: 'shoe-1', qty: 5 },
    { id: 'bag-1', qty: 1 },
  ]);
});

test('aggregate quantity cannot bypass the per-product limit', () => {
  assert.throws(
    () => normalizeRequestedCartItems([{ id: 'shoe-1', qty: 20 }, { id: 'shoe-1', qty: 1 }]),
    CartInputError,
  );
});

test('invalid and empty cart payloads are rejected', () => {
  assert.throws(() => normalizeRequestedCartItems([]), CartInputError);
  assert.throws(() => normalizeRequestedCartItems([{ id: '', qty: 1 }]), CartInputError);
  assert.throws(() => normalizeRequestedCartItems([{ id: 'shoe-1', qty: 0 }]), CartInputError);
});
