const CACHE_NAME = 'cacador-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo-transparent.png',
  '/teteco.png',
  '/manifest.json'
];

// Instala e faz cache dos assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos ao ativar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-First: APIs de dados (Sheets, Shopee, ML, Gemini)
  const isData = url.hostname.includes('googleapis') ||
                 url.hostname.includes('docs.google') ||
                 url.pathname.startsWith('/api/');
  if (isData) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First: fontes do Google
  if (url.hostname.includes('fonts.gstatic') || url.hostname.includes('fonts.googleapis')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate: páginas e assets locais
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
