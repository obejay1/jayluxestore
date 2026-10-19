import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allocateOrderNumberFromCounters,
  formatOrderNumber,
  orderNumberDateKey,
  sumLegacyOrderCounters,
} from '../lib/orderNumbers.ts';

test('formats order dates in the Africa/Lagos business timezone', () => {
  assert.equal(orderNumberDateKey(new Date('2026-10-04T23:30:00.000Z')), '261005');
  assert.equal(
    formatOrderNumber(new Date('2026-10-04T23:30:00.000Z'), 9),
    'JL261005-0009',
  );
});

test('migrates the global sequence from legacy daily counters, not order documents', () => {
  assert.equal(sumLegacyOrderCounters([
    { id: '261004', count: 2 },
    { id: '261005', count: 1 },
    { id: 'global', count: 500 },
    { id: 'not-a-date', count: 100 },
  ]), 3);
});

test('serializes simultaneous allocations through the shared transactional counter', async () => {
  let globalCount: number | undefined;
  let transactionTail = Promise.resolve();
  const legacyCounters = [{ id: '261004', count: 2 }, { id: '261005', count: 1 }];

  const runTransaction = async (date: Date) => {
    const previous = transactionTail;
    let release!: () => void;
    transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;

    let pendingCount: number | undefined;
    try {
      const result = await allocateOrderNumberFromCounters({
        async readGlobalCounter() {
          return { exists: globalCount !== undefined, count: globalCount };
        },
        async readLegacyCounters() {
          return legacyCounters;
        },
        writeGlobalCounter(count) {
          pendingCount = count;
        },
      }, date);
      if (pendingCount !== undefined) globalCount = pendingCount;
      return result;
    } finally {
      release();
    }
  };

  const [first, second] = await Promise.all([
    runTransaction(new Date('2026-10-05T12:00:00.000Z')),
    runTransaction(new Date('2026-10-06T12:00:00.000Z')),
  ]);

  assert.deepEqual([first, second], ['JL261005-0004', 'JL261006-0005']);
  assert.equal(globalCount, 5);
});

test('rejects corrupt legacy counter values instead of risking duplicate numbers', () => {
  assert.throws(
    () => sumLegacyOrderCounters([{ id: '261004', count: -1 }]),
    /counter "261004" is invalid/,
  );
});
