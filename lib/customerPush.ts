'use client';

import type { User } from 'firebase/auth';

import {
  buildForegroundPushNotification,
  getPushPermissionState,
  isUsablePushToken,
} from '@/lib/orderPush';

const SAVED_TOKEN_KEY = 'jayluxe-order-push-token';
const OPTED_IN_UID_KEY = 'jayluxe-order-push-uid';
const OPT_OUT_KEY = 'jayluxe-order-push-opt-out';

function readLocalValue(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocalValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    console.warn('Order notification preference could not be saved in this browser.');
  }
}

function removeLocalValue(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn('Order notification preference could not be cleared in this browser.');
  }
}

type PushClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

export type CustomerPushResult =
  | { status: 'enabled' }
  | { status: 'disabled' }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'unavailable'; message: string };

function readConfig(): PushClientConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
  };

  return Object.values(config).every(Boolean) ? config : null;
}

function browserSupportsPush() {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
}

export function getCustomerPushPermissionState(signedIn: boolean) {
  return getPushPermissionState(
    signedIn,
    browserSupportsPush(),
    browserSupportsPush() ? Notification.permission : 'unsupported',
  );
}

async function getCurrentToken() {
  const config = readConfig();
  if (!config || !browserSupportsPush() || Notification.permission !== 'granted') return null;

  const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
  if (!(await isSupported())) return null;

  const { default: app } = await import('@/lib/firebase');
  const serviceWorker = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: serviceWorker,
  });
  return isUsablePushToken(token) ? { token, messaging } : null;
}

async function saveToken(user: User, token: string) {
  const previousToken = readLocalValue(SAVED_TOKEN_KEY);
  const idToken = await user.getIdToken();
  const response = await fetch('/api/account/push-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token, previousToken }),
    cache: 'no-store',
  });
  const result = (await response.json()) as { message?: string };
  if (!response.ok) throw new Error(result.message || 'Order notifications could not be enabled.');
  writeLocalValue(SAVED_TOKEN_KEY, token);
  writeLocalValue(OPTED_IN_UID_KEY, user.uid);
}

export function hasExplicitOrderPushOptIn(user: User) {
  return readLocalValue(OPTED_IN_UID_KEY) === user.uid &&
    readLocalValue(OPT_OUT_KEY) !== 'true';
}

export async function syncGrantedOrderPush(
  user: User,
  explicitOptIn = false,
): Promise<CustomerPushResult> {
  if (readLocalValue(OPT_OUT_KEY) === 'true') return { status: 'disabled' };
  if (!explicitOptIn && !hasExplicitOrderPushOptIn(user)) return { status: 'disabled' };
  const state = getCustomerPushPermissionState(true);
  if (state === 'denied') return { status: 'denied' };
  if (state === 'unsupported') return { status: 'unsupported' };
  if (state !== 'enabled') return { status: 'unavailable', message: 'Notifications have not been enabled.' };

  try {
    const current = await getCurrentToken();
    if (!current) return { status: 'unavailable', message: 'Push notifications are unavailable in this browser.' };
    await saveToken(user, current.token);
    return { status: 'enabled' };
  } catch (error) {
    console.error('Order push token sync failed:', error);
    return {
      status: 'unavailable',
      message: error instanceof Error ? error.message : 'Order notifications could not be enabled.',
    };
  }
}

export async function enableOrderPush(user: User): Promise<CustomerPushResult> {
  const config = readConfig();
  if (!config || !browserSupportsPush()) return { status: 'unsupported' };

  if (Notification.permission === 'denied') return { status: 'denied' };

  try {
    const permissionPromise = Notification.requestPermission();
    const permission = await permissionPromise;
    if (permission === 'denied') return { status: 'denied' };
    if (permission !== 'granted') {
      return { status: 'unavailable', message: 'Notification permission was not granted.' };
    }
    removeLocalValue(OPT_OUT_KEY);
    return await syncGrantedOrderPush(user, true);
  } catch (error) {
    console.error('Order push permission request failed:', error);
    return {
      status: 'unavailable',
      message: error instanceof Error ? error.message : 'Order notifications could not be enabled.',
    };
  }
}

export async function disableOrderPush(user: User) {
  const savedToken = readLocalValue(SAVED_TOKEN_KEY);
  const optedIn = hasExplicitOrderPushOptIn(user);
  if (!savedToken && !optedIn) {
    writeLocalValue(OPT_OUT_KEY, 'true');
    removeLocalValue(OPTED_IN_UID_KEY);
    return;
  }

  let current: Awaited<ReturnType<typeof getCurrentToken>> = null;
  if (!savedToken) current = await getCurrentToken();
  const token = savedToken || current?.token || '';
  if (!token) {
    writeLocalValue(OPT_OUT_KEY, 'true');
    return;
  }

  const idToken = await user.getIdToken();
  const response = await fetch('/api/account/push-tokens', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(result.message || 'Order notifications could not be turned off.');
  }

  try {
    if (current) {
      const { deleteToken } = await import('firebase/messaging');
      try {
        await deleteToken(current.messaging);
      } catch (error) {
        console.error('Browser push token deletion failed after server unsubscribe:', error);
      }
    }
  } finally {
    removeLocalValue(SAVED_TOKEN_KEY);
    removeLocalValue(OPTED_IN_UID_KEY);
    writeLocalValue(OPT_OUT_KEY, 'true');
  }
}

export async function showForegroundOrderPush() {
  if (Notification.permission !== 'granted') return () => undefined;

  const current = await getCurrentToken();
  if (!current) return () => undefined;
  const { onMessage } = await import('firebase/messaging');

  return onMessage(current.messaging, (payload) => {
    const data = buildForegroundPushNotification(
      payload.data || {},
      window.location.origin,
    );
    const url = new URL(data.url);
    const notification = new Notification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      tag: data.tag,
      data: { url: url.toString() },
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(url.toString());
      notification.close();
    };
  });
}

export function scheduleOrderPushTokenRefresh(user: User) {
  const refresh = () => {
    if (Notification.permission === 'granted') {
      void syncGrantedOrderPush(user);
    }
  };
  const interval = window.setInterval(refresh, 12 * 60 * 60 * 1000);
  return () => window.clearInterval(interval);
}

export async function removeOrderPushBeforeLogout(user: User) {
  try {
    await disableOrderPush(user);
  } catch (error) {
    console.error('Order push unsubscribe failed during sign out:', error);
  }
}
