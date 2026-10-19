importScripts('/api/push/sw-config');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp(self.__JAYLUXE_FIREBASE_CONFIG__);
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'JayLuxe order update';
  const body = data.body || 'Your order has a new update.';
  return self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    data: { url: data.url || '/account' },
    tag: data.eventId || undefined,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const origin = self.location.origin;
  let target = new URL('/account', origin);
  try {
    const candidate = new URL(event.notification.data?.url || '/account', origin);
    if (candidate.origin === origin && candidate.pathname.startsWith('/account')) {
      target = candidate;
    }
  } catch {
    target = new URL('/account', origin);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === origin);
      if (existing) {
        return existing.navigate(target.toString())
          .then((navigated) => (navigated || existing).focus())
          .catch(() => clients.openWindow(target.toString()));
      }
      return clients.openWindow(target.toString());
    }),
  );
});
