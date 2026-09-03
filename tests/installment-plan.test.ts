import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInstallmentAmounts } from '../lib/installments/planMath.ts';

test('installment amounts sum exactly to the order total', () => {
  for (const count of [2, 3, 4]) {
    const amounts = buildInstallmentAmounts(10001, count);
    assert.equal(amounts.length, count);
    assert.equal(amounts.reduce((sum, value) => sum + value, 0), 10001);
    assert.ok(amounts.every((value) => value >= 0));
  }
});
