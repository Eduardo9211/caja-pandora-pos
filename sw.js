const CACHE_NAME = 'pandora-store-v14';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/printerService.js',
  '/pdfReportService.js',
  '/jspdf.umd.min.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ESTRATEGIA CORREGIDA: CACHE FIRST (Cero datos / 100% Offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si el archivo está en la memoria del teléfono, lo entrega DE INMEDIATO
      if (cachedResponse) {
        return cachedResponse;
      }
      // 2. Si es algo nuevo que no está en la caché, va a buscarlo a Render
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});