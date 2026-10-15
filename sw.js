const CACHE_NAME = 'pandora-store-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/printerService.js',
  '/pdfReportService.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Fuerza la instalación inmediata del nuevo Service Worker
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
            return caches.delete(cacheName); // Borra la memoria caché vieja
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de la app de inmediato
  );
});

self.addEventListener('fetch', (event) => {
  // Primero intenta obtener la versión más reciente de la red (Render)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si no hay internet, recurre a la caché local
        return caches.match(event.request);
      })
  );
});