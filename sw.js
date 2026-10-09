const CACHE_NAME = 'pandora-store-v2';
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
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});