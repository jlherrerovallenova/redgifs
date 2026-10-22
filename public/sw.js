// Service Worker con Arquitectura de Cache Determinista - RedGIFs Pro
// Optimizado según principios de Addy Osmani (PRPL + Cache-First para Assets Hasheados)

const CACHE_VERSION = 'v1.2.2';
const STATIC_CACHE = `redgifs-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `redgifs-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg'
];

// Instalación: Cachear Shell estático crítico
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Mensaje para forzar activación inmediata cuando hay actualización
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Activación: Limpieza de caches antiguos y tomar control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Omitir endpoints dinámicos, APIs externas, streaming de videos y comprobación de versión
  if (
    url.pathname === '/version.json' ||
    url.pathname.startsWith('/api/redgifs') ||
    url.pathname.startsWith('/media-proxy') ||
    url.hostname.includes('redgifs.com') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('codetabs.com') ||
    url.hostname.includes('corsproxy.io') ||
    event.request.destination === 'video'
  ) {
    return; // Petición directa a red
  }

  // 2. Estrategia Cache-First para Assets Hasheados de Vite (/assets/*.js, *.css)
  // Como tienen hash único de contenido, son inmutables: si están en caché, son 100% seguros y cargan al instante (0ms).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Estrategia Network-First con Fallback a Caché para Navegación HTML (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 4. Stale-While-Revalidate para el resto de recursos estáticos (iconos, fuentes, manifest)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            event.request.method === 'GET'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
