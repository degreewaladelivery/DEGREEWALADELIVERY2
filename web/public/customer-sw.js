/**
 * Service worker for customer order updates.
 *
 * Runs outside the page, so a customer hears about their order with the tab
 * closed and the phone in a pocket — until now they were told nothing once they
 * navigated away, and had to keep checking the tracking page themselves.
 *
 * Pushes carry no payload, deliberately: an unencrypted one would expose a
 * customer's order details to the browser vendor's push service. The cost is
 * that the wording here is generic — the tracking page has the real status one
 * tap away.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let title = 'Your order was updated';
  let body = 'Tap to see where it is.';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
    } catch {
      const text = event.data.text();
      if (text) body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      // One tag per customer, so several updates on one order replace each
      // other rather than stacking up on the lock screen.
      tag: 'dw-order-update',
      renotify: true,
      vibrate: [150, 80, 150],
      data: { url: '/track' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/track';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/track') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
