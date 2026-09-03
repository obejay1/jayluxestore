import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPrivateOrderUrl } from '../lib/orderAccess.ts';

test('order access credential is placed in a URL fragment, never a query string', () => {
  const url = buildPrivateOrderUrl('/order/abc', 'secret token');
  assert.equal(url, '/order/abc#access_token=secret%20token');
  assert.equal(url.includes('?token='), false);
});

test('order URL remains clean when no credential exists', () => {
  assert.equal(buildPrivateOrderUrl('/order/abc', ''), '/order/abc');
});
