// Service Worker untuk PWA & Web Push Notification TaskFlow v2

// Anti-Cache Guard: Jangan pernah cegat atau cache request ke /api/ atau method non-GET
self.addEventListener('fetch', function (event) {
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return; // Biarkan request lewat langsung ke server
  }
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'TaskFlow', body: event.data.text() };
  }

  const title = data.title || 'TaskFlow Pengingat';
  const options = {
    body: data.body || 'Anda memiliki pemberitahuan tugas baru.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    data: {
      url: data.url || '/dashboard',
    },
    vibrate: [200, 100, 200],
    tag: data.tag || 'taskflow-reminder',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
