export type OrderPushNotification = {
  title: string;
  body: string;
  orderNumber: string;
  status: string;
  url: string;
};

const statusMessages: Record<string, (orderNumber: string) => string> = {
  Confirmed: (orderNumber) => `Your JayLuxe order ${orderNumber} has been confirmed.`,
  Processing: (orderNumber) => `We're preparing your order ${orderNumber}.`,
  'Ready for Shipment': (orderNumber) => `Your order ${orderNumber} is ready for shipment.`,
  Packed: (orderNumber) => `Your order ${orderNumber} has been packed.`,
  Shipped: (orderNumber) => `Your order ${orderNumber} has been shipped.`,
  'Out for Delivery': (orderNumber) => `Your order ${orderNumber} is out for delivery.`,
  Delivered: (orderNumber) => `Your JayLuxe order ${orderNumber} has been delivered.`,
  Cancelled: (orderNumber) => `Your JayLuxe order ${orderNumber} has been cancelled.`,
  Refunded: (orderNumber) => `Your JayLuxe order ${orderNumber} has been refunded.`,
};

export function buildOrderPushNotification(
  status: string,
  orderNumber?: string | null,
): OrderPushNotification | null {
  const message = statusMessages[status];
  const reference = orderNumber?.trim();
  if (!message || !reference) return null;

  return {
    title: 'JayLuxe order update',
    body: message(reference),
    orderNumber: reference,
    status,
    url: `/account?order=${encodeURIComponent(reference)}`,
  };
}

export function isOrderStatusTransition(currentStatus: string, requestedStatus: string) {
  return currentStatus !== requestedStatus;
}

export function isUsablePushToken(token: unknown): token is string {
  return typeof token === 'string' && Boolean(token.trim());
}

export function splitPushTokenBatches<T>(items: T[], batchSize = 500) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error('Push token batches must contain between 1 and 500 entries.');
  }
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

export function classifyFcmDelivery(result: {
  success: boolean;
  error?: { code?: string } | null;
}): 'sent' | 'invalid' | 'retry' {
  if (result.success) return 'sent';
  if (
    result.error?.code === 'messaging/registration-token-not-registered' ||
    result.error?.code === 'messaging/invalid-registration-token'
  ) {
    return 'invalid';
  }
  return 'retry';
}

export type PushPermissionState =
  | 'signed_out'
  | 'unsupported'
  | 'denied'
  | 'not_enabled'
  | 'enabled';

export function getPushPermissionState(
  signedIn: boolean,
  supported: boolean,
  permission: NotificationPermission | 'unsupported',
): PushPermissionState {
  if (!signedIn) return 'signed_out';
  if (!supported || permission === 'unsupported') return 'unsupported';
  if (permission === 'denied') return 'denied';
  if (permission === 'granted') return 'enabled';
  return 'not_enabled';
}

export function getSafeNotificationUrl(value: unknown, origin: string) {
  if (typeof value !== 'string') return new URL('/account', origin).toString();

  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || !target.pathname.startsWith('/account')) {
      return new URL('/account', origin).toString();
    }
    return target.toString();
  } catch {
    return new URL('/account', origin).toString();
  }
}

export function buildForegroundPushNotification(
  data: Record<string, string | undefined>,
  origin: string,
) {
  return {
    title: data.title || 'JayLuxe order update',
    body: data.body || 'Your order has a new update.',
    url: getSafeNotificationUrl(data.url, origin),
    tag: data.eventId || 'jayluxe-order-update',
  };
}
