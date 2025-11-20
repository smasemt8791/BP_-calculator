const CACHE_NAME = 'bp-monitor-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap'
];

// Install Event
self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate Event - Cleanup old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (evt) => {
  const req = evt.request;

  // 1. API Calls: Network Only
  if (req.url.includes('/api/') || req.url.includes('overpass') || req.url.includes('generativelanguage') || req.url.includes('esm.sh')) {
    return;
  }

  // 2. HTML (Navigation): Network First
  if (req.mode === 'navigate') {
    evt.respondWith(
      fetch(req)
        .then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Static Assets: Stale-While-Revalidate
  evt.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes.clone()));
        return networkRes;
      });
      return cachedRes || fetchPromise;
    })
  );
});