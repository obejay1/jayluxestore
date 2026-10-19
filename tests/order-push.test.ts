import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

import {
  buildForegroundPushNotification,
  buildOrderPushNotification,
  classifyFcmDelivery,
  getPushPermissionState,
  getSafeNotificationUrl,
  isOrderStatusTransition,
  isUsablePushToken,
  splitPushTokenBatches,
} from '../lib/orderPush.ts';
import { formatOrderNumber } from '../lib/orderNumbers.ts';

const ORDER_NUMBER = 'JL261018-0001';

test('formats public order references without using a Firestore ID', () => {
  assert.equal(formatOrderNumber(new Date('2026-10-18T12:00:00.000Z'), 1), ORDER_NUMBER);
});

test('builds customer-safe confirmation, processing, shipping and delivery messages', () => {
  assert.equal(
    buildOrderPushNotification('Confirmed', ORDER_NUMBER)?.body,
    `Your JayLuxe order ${ORDER_NUMBER} has been confirmed.`,
  );
  assert.equal(
    buildOrderPushNotification('Processing', ORDER_NUMBER)?.body,
    `We're preparing your order ${ORDER_NUMBER}.`,
  );
  assert.equal(
    buildOrderPushNotification('Shipped', ORDER_NUMBER)?.body,
    `Your order ${ORDER_NUMBER} has been shipped.`,
  );
  assert.equal(
    buildOrderPushNotification('Delivered', ORDER_NUMBER)?.body,
    `Your JayLuxe order ${ORDER_NUMBER} has been delivered.`,
  );
  assert.equal(buildOrderPushNotification('Processing', ''), null);
  assert.equal(buildOrderPushNotification('Unknown', ORDER_NUMBER), null);
});

test('handles granted, denied, unsupported and logged-out permission states without prompting', () => {
  assert.equal(getPushPermissionState(true, true, 'granted'), 'enabled');
  assert.equal(getPushPermissionState(true, true, 'denied'), 'denied');
  assert.equal(getPushPermissionState(true, true, 'default'), 'not_enabled');
  assert.equal(getPushPermissionState(true, false, 'unsupported'), 'unsupported');
  assert.equal(getPushPermissionState(false, true, 'granted'), 'signed_out');
  assert.equal(isUsablePushToken('valid-token'), true);
  assert.equal(isUsablePushToken(''), false);
  assert.equal(isUsablePushToken(null), false);
});

test('does not change order state or create a second transition for duplicate status submission', () => {
  assert.equal(isOrderStatusTransition('Shipped', 'Shipped'), false);
  assert.equal(isOrderStatusTransition('Processing', 'Shipped'), true);
});

test('supports multiple devices and classifies invalid and expired FCM tokens', () => {
  const batches = splitPushTokenBatches(['device-1', 'device-2', 'device-3'], 2);
  assert.deepEqual(batches, [['device-1', 'device-2'], ['device-3']]);
  assert.equal(classifyFcmDelivery({ success: true }), 'sent');
  assert.equal(
    classifyFcmDelivery({ success: false, error: { code: 'messaging/registration-token-not-registered' } }),
    'invalid',
  );
  assert.equal(
    classifyFcmDelivery({ success: false, error: { code: 'messaging/invalid-registration-token' } }),
    'invalid',
  );
  assert.equal(
    classifyFcmDelivery({ success: false, error: { code: 'messaging/server-unavailable' } }),
    'retry',
  );
});

test('notification click targets are restricted to the customer account on this origin', () => {
  const origin = 'https://jayluxestore.com';
  assert.equal(
    getSafeNotificationUrl(`/account?order=${ORDER_NUMBER}`, origin),
    `${origin}/account?order=${ORDER_NUMBER}`,
  );
  assert.equal(getSafeNotificationUrl('https://attacker.example/', origin), `${origin}/account`);
  assert.equal(getSafeNotificationUrl('/admin', origin), `${origin}/account`);
  assert.deepEqual(
    buildForegroundPushNotification({ title: 'Update', body: 'Shipped', url: '/account?order=JL1' }, origin),
    {
      title: 'Update',
      body: 'Shipped',
      url: `${origin}/account?order=JL1`,
      tag: 'jayluxe-order-update',
    },
  );
});

test('service worker displays background pushes and opens the account order route on click', async () => {
  const source = readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const displayed: Array<{ title: string; options: { body?: string; data?: { url?: string } } }> = [];
  const opened: string[] = [];
  let backgroundHandler: ((payload: { data?: Record<string, string> }) => Promise<void>) | undefined;

  const context = {
    URL,
    importScripts() {
      Object.assign(context.self, { __JAYLUXE_FIREBASE_CONFIG__: { projectId: 'test-project' } });
    },
    firebase: {
      initializeApp() {},
      messaging: () => ({
        onBackgroundMessage(handler: typeof backgroundHandler) {
          backgroundHandler = handler;
        },
      }),
    },
    self: {
      location: { origin: 'https://jayluxestore.com' },
      registration: {
        showNotification: async (title: string, options: { body?: string; data?: { url?: string } }) => {
          displayed.push({ title, options });
        },
      },
      addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
        listeners.set(type, listener);
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  };

  runInNewContext(source, context);
  await backgroundHandler?.({
    data: {
      title: 'JayLuxe order update',
      body: `Your order ${ORDER_NUMBER} has been shipped.`,
      url: `/account?order=${ORDER_NUMBER}`,
    },
  });

  assert.equal(displayed[0]?.title, 'JayLuxe order update');
  assert.equal(displayed[0]?.options.body, `Your order ${ORDER_NUMBER} has been shipped.`);

  let clickFinished: Promise<unknown> | undefined;
  listeners.get('notificationclick')?.({
    notification: {
      data: { url: `/account?order=${ORDER_NUMBER}` },
      close() {},
    },
    waitUntil(promise: Promise<unknown>) { clickFinished = promise; },
  });
  await clickFinished;
  assert.deepEqual(opened, [`https://jayluxestore.com/account?order=${ORDER_NUMBER}`]);
});
