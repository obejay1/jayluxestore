export const ORDER_NUMBER_TIME_ZONE = 'Africa/Lagos';
export const GLOBAL_ORDER_NUMBER_COUNTER_ID = 'global';

export type OrderNumberCounterAccess = {
  readGlobalCounter: () => Promise<{ exists: boolean; count: unknown }>;
  readLegacyCounters: () => Promise<Array<{ id: string; count: unknown }>>;
  writeGlobalCounter: (count: number, updatedAt: string) => void;
};

export function orderNumberDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-NG', {
    timeZone: ORDER_NUMBER_TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value || '';

  return `${part('year')}${part('month')}${part('day')}`;
}

export function formatOrderNumber(date: Date, sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('Order number sequence must be a positive integer.');
  }

  return `JL${orderNumberDateKey(date)}-${String(sequence).padStart(4, '0')}`;
}

export function sumLegacyOrderCounters(
  counters: Array<{ id: string; count: unknown }>,
) {
  return counters.reduce((total, counter) => {
    if (!/^\d{6}$/.test(counter.id)) return total;

    const count = Number(counter.count);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Legacy order-number counter "${counter.id}" is invalid.`);
    }
    const nextTotal = total + count;
    if (!Number.isSafeInteger(nextTotal)) {
      throw new Error('The legacy order-number total exceeds the safe integer limit.');
    }
    return nextTotal;
  }, 0);
}

export async function allocateOrderNumberFromCounters(
  counters: OrderNumberCounterAccess,
  date: Date,
) {
  const globalCounter = await counters.readGlobalCounter();
  let currentCount: number;

  if (globalCounter.exists) {
    currentCount = Number(globalCounter.count);
    if (!Number.isSafeInteger(currentCount) || currentCount < 0) {
      throw new Error('The global order-number counter is invalid.');
    }
  } else {
    currentCount = sumLegacyOrderCounters(await counters.readLegacyCounters());
  }

  if (currentCount >= Number.MAX_SAFE_INTEGER) {
    throw new Error('The global order-number counter has reached its safe integer limit.');
  }

  const sequence = currentCount + 1;
  counters.writeGlobalCounter(sequence, date.toISOString());
  return formatOrderNumber(date, sequence);
}
