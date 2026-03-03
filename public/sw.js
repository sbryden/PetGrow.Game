// ============================================================
//  PetGrow — Service Worker (Offline / PWA support)
// ============================================================
const CACHE_NAME = 'petgrow-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './audio.js',
  './db.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Don't cache API calls (proxy or direct)
  if (e.request.url.includes('/api/') || e.request.url.includes('googleapis.com')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Don't cache Google Fonts at install, but cache on first use
  if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        });
      })
    );
    return;
  }
  // Network-first for local assets (try network, fall back to cache)
  e.respondWith(
    fetch(e.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return response;
    }).catch(() => caches.match(e.request))
  );
});
