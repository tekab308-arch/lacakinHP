// LacakHP Service Worker — Network-First App-Shell Offline Fallback
// Excludes /lacakhp-resmi.apk (12MB) and /version.json (dynamic) to keep storage small and updates fresh.

const CACHE_NAME = 'lacakhp-shell-v1';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Bypass Service Worker entirely for APK download and live registry/version metadata
  if (
    url.pathname === '/lacakhp-resmi.apk' ||
    url.pathname.endsWith('/lacakhp-resmi.apk') ||
    url.pathname === '/version.json' ||
    url.pathname.endsWith('/version.json') ||
    url.pathname === '/community-relays.json' ||
    url.pathname.endsWith('/community-relays.json')
  ) {
    return;
  }

  // Cross-origin requests (e.g. tile maps, Nostr websockets, Google Maps external) handle normally
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-First for app shell assets: try network first; if offline / host is down, serve from cache
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(async () => {
        const cachedRes = await caches.match(req);
        if (cachedRes) return cachedRes;
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline: Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
