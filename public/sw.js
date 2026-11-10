// Single Service Worker for Chalo PWA Caching & Web Push Notifications
const CACHE_NAME = 'chalo-shell-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. Install: cache the app shell and call self.skipWaiting()
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate: delete old caches with a different version name, call self.clients.claim()
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch: for same-origin GET requests only, use network first and fall back to the cache.
// Never cache requests to Supabase (*.supabase.co), RPC calls, or storage.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache external requests or requests to Supabase (*.supabase.co), RPC calls, or storage
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rpc/') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/storage/')
  ) {
    return;
  }

  // Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// 4. Push: parse the JSON payload (title, body, url), then call self.registration.showNotification
self.addEventListener('push', (event) => {
  const raw = event.data ? event.data.text() : '';
  let title = '';
  let body = '';
  let url = '/';

  try {
    const data = JSON.parse(raw);
    title = data.title;
    body = data.body;
    if (data.url) {
      url = data.url;
    }
  } catch (e) {
    body = raw;
    title = 'Chalo';
  }

  if (!title) {
    title = 'Chalo';
  }
  if (!body) {
    body = 'You have a new update from Chalo.';
  }

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'chalo-trip',
    data: { url }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click: close notification, then focus an open window at data.url or open it
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus();
        }
      }
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(fullUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
