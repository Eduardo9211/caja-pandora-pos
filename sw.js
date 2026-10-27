const CACHE_NAME = 'pandora-store-v17';
const urlsToCache = [
  '/',
  '/index.html',
  '/tienda.html',
  '/style.css',
  '/app.js',
  '/jspdf.umd.min.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        urlsToCache.map((url) => {
          return cache.add(url).catch((error) => {
            console.warn('Aviso: No se pudo cachear:', url, error);
          });
        })
      );
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

// ESTRATEGIA ESTRICTA: CACHE FIRST (Primero busca en el celular, ideal para offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si ya está guardado en el celular, lo abre al instante sin despertar el servidor
      if (cachedResponse) {
        return cachedResponse;
      }
      // Si es un archivo nuevo, lo pide a la red y lo guarda
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Fallback por si acaso no hay red ni caché
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});