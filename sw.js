// Saksham Cognitive Wellness Studio - Service Worker
const CACHE_NAME = 'saksham-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config/db-config.js',
  './js/services/db.js',
  './js/config/constants.js',
  './js/state/store.js',
  './js/services/audio.js',
  './js/services/speech.js',
  './js/services/gemini.js',
  './js/services/notifications.js',
  './js/services/share.js',
  './js/utils/helpers.js',
  './js/utils/intent.js',
  './js/features/navigation.js',
  './js/features/routine.js',
  './js/features/games.js',
  './js/features/vault.js',
  './js/features/movement.js',
  './js/features/calendar.js',
  './js/features/caregiver.js',
  './js/features/ai-assistant.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Saksham SW] Pre-caching offline assets v4');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Saksham SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For HTML page navigation, always fetch fresh from network so updates are instant
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});

// Handle notification interaction when app is in background or closed
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (action === 'start') {
            client.postMessage({ type: 'NOTIFICATION_ACTION', action: 'start' });
          }
          return client.focus();
        }
      }
      // If no window is open, open a fresh window to the routine
      if (clients.openWindow) {
        return clients.openWindow('./index.html#routine');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Saksham SW] Notification dismissed by user:', event.notification.tag);
});

// Listen for background sync or scheduled reminders dispatched from index.html
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_REMINDERS' && Array.isArray(event.data.tasks)) {
    // If browser supports Scheduled Notification Triggers (Chrome Android)
    if ('showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
      event.data.tasks.forEach((task) => {
        if (task.triggerTimestamp && task.triggerTimestamp > Date.now()) {
          self.registration.showNotification(`⏰ Saksham Activity: ${task.title}`, {
            body: `Scheduled for ${task.time}. Tap to open guided routine!`,
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            vibrate: [300, 100, 300, 100, 300],
            tag: `saksham-task-${task.id}`,
            showTrigger: new TimestampTrigger(task.triggerTimestamp),
            requireInteraction: true,
            actions: [
              { action: 'start', title: '▶ Start Activity' },
              { action: 'done', title: '✓ Mark Done' }
            ],
            data: { taskId: task.id, time: task.time }
          }).catch((err) => console.log('[Saksham SW] Scheduled notification note:', err));
        }
      });
    }
  }
});
