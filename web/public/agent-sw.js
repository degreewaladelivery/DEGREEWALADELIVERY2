/**
 * Service worker for delivery agent alerts.
 *
 * This runs outside the page, so it still receives pushes when the dashboard
 * tab is closed or the phone is locked — which is the whole point. The page
 * itself can only alert someone who is already looking at it.
 *
 * Pushes are sent without a payload: an unencrypted payload would leak order
 * details through the browser vendor's push service, and encrypting one adds a
 * lot of machinery for text the agent sees the moment they tap through anyway.
 * The push is a doorbell; the dashboard has the details.
 */

self.addEventListener('install', () => {
  // Take over straight away rather than waiting for existing tabs to close,
  // so enabling alerts works on the first try instead of the next visit.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let title = 'New delivery available';
  let body = 'Tap to accept it before another agent does.';

  // Payloads are optional; read one if a future sender starts including it.
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
      // One tag for all order alerts: a burst of orders replaces itself instead
      // of burying the phone in a stack the agent has to swipe through.
      tag: 'dw-new-order',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: '/agent/orders' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/agent/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Prefer a dashboard tab that is already open — opening a second one
      // would leave the agent with duplicates through a shift.
      for (const client of clients) {
        if (client.url.includes('/agent') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
