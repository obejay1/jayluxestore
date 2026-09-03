import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  getOpayRedirectUrl,
  getOpayReferenceCode,
  normalizeJayLuxeNotifyLanguage,
  normalizeNigerianPhone,
  toOpayNotifyLanguage,
  verifyOpayCallbackSignature,
} from '../lib/payments/opay.ts';

test('JayLuxe OPay notification language is null-safe and maps to provider enum', () => {
  assert.equal(normalizeJayLuxeNotifyLanguage(null), 'en');
  assert.equal(normalizeJayLuxeNotifyLanguage(undefined), 'en');
  assert.equal(normalizeJayLuxeNotifyLanguage('en'), 'en');
  assert.equal(normalizeJayLuxeNotifyLanguage('ar'), 'ar');
  assert.equal(toOpayNotifyLanguage('en'), 'English');
  assert.equal(toOpayNotifyLanguage(null), 'English');
  assert.equal(toOpayNotifyLanguage('ar'), 'Arabic');
});

test('Nigerian phone numbers are normalized without exposing credentials', () => {
  assert.equal(normalizeNigerianPhone('0815 874 2782'), '+2348158742782');
  assert.equal(normalizeNigerianPhone('2348158742782'), '+2348158742782');
  assert.equal(normalizeNigerianPhone('+2348158742782'), '+2348158742782');
});

test('OPay response helpers safely handle null and alternate redirect shapes', () => {
  assert.equal(getOpayRedirectUrl({ data: null }), null);
  assert.equal(getOpayRedirectUrl({ data: { cashierUrl: 'https://cashier.example' } }), 'https://cashier.example');
  assert.equal(getOpayReferenceCode({ data: null }), null);
  assert.equal(getOpayReferenceCode({ data: { referenceCode: '674016496' } }), '674016496');
});

test('OPay callback verification uses HMAC-SHA3-512', () => {
  const secret = 'test-secret';
  const payload = {
    amount: '49160',
    currency: 'NGN',
    reference: '10023',
    refunded: false,
    status: 'SUCCESS',
    timestamp: '2022-05-07T06:20:46Z',
    token: '220507145660712931829',
    transactionId: '220507145660712931829',
  };
  const content = '{Amount:"49160",Currency:"NGN",Reference:"10023",Refunded:f,Status:"SUCCESS",Timestamp:"2022-05-07T06:20:46Z",Token:"220507145660712931829",TransactionID:"220507145660712931829"}';
  const signature = crypto.createHmac('sha3-512', secret).update(content).digest('hex');
  assert.equal(verifyOpayCallbackSignature(payload, signature, secret), true);
});
