const CACHE_NAME = 'pandora-store-v16';
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
      // Usamos un ciclo seguro para que si algún archivo opcional no existe, 
      // la instalación no se rompa por completo.
      return Promise.all(
        urlsToCache.map((url) => {
          return cache.add(url).catch((error) => {
            console.warn('Aviso: No se pudo cachear el recurso:', url, error);
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

// ESTRATEGIA: NETWORK FIRST CON FALLBACK A CACHÉ PARA EVITAR BLOQUEOS
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});