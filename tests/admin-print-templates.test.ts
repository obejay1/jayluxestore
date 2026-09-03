import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCustomerPrintHtml, buildOrderInvoicePrintHtml } from '../lib/admin/printTemplates.ts';
import type { AdminOrder, Customer } from '../lib/admin/types.ts';

const money = (value: number) => `NGN ${value}`;

test('admin customer print template encodes stored HTML payloads', () => {
  const customer: Customer = {
    id: 'c1',
    name: '<img src=x onerror=alert(1)>',
    email: 'buyer@example.com',
    phone: '+234000',
    address: '<script>alert(1)</script>',
    orderCount: 0,
    totalSpent: 0,
    orders: [],
  };
  const html = buildCustomerPrintHtml(customer, money);
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('admin order invoice print template encodes customer and item payloads', () => {
  const order = {
    id: 'o1',
    customerName: '<svg onload=alert(1)>',
    customerEmail: 'buyer@example.com',
    customerPhone: '+234000',
    customerAddress: '<b>Address</b>',
    total: 1000,
    items: [{ name: '<img src=x onerror=alert(1)>', category: '<script>x</script>', price: 1000, qty: 1 }],
  } as AdminOrder;
  const html = buildOrderInvoicePrintHtml(order, 'Tomorrow', money);
  assert.equal(html.includes('<svg onload=alert(1)>'), false);
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.ok(html.includes('&lt;svg onload=alert(1)&gt;'));
});
