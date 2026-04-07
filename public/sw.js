// public/sw.js — Bizzn Web Push Service Worker
// Statisch via Next.js ausgeliefert unter /sw.js

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Neue Nachricht', body: event.data.text(), url: '/' };
  }

  const { title = 'Bizzn', body = '', url = '/' } = payload;

  const options = {
    body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
