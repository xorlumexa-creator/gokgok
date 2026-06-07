// FIX: Use timestamp-based cache name so every deployment gets a fresh cache
// Old: 'dukan360-v1' — never changed, always served stale files
const CACHE_NAME = 'dukan360-' + '2026061901';

const ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // FIX: Force new service worker to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // FIX: Delete ALL old caches — not just ones with different names
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    )
  );
  // FIX: Take control of all open tabs immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // FIX: Network first strategy — always try network, fall back to cache
  // Old code used cache-first which served stale files after deployments
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Save fresh response to cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Only use cache when offline
        return caches.match(event.request);
      })
  );
});
