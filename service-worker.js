// ==========================================
// RistoMemo FREE - Service Worker v2.5.11
// © 2026 Enrico Sarri - AGPL-3.0
// Strategia: Network-first con fallback offline
// Aggiornamento automatico senza toccare CACHE_NAME
// ==========================================

const CACHE_NAME = 'ristomemo-free-v2.5.11';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './salvaristo_icon512.png',
  './privacy.html',
  './terms.html'
];

// ---- INSTALL: pre-cache assets essenziali ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: elimina vecchie cache e prende controllo subito ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: network-first con fallback offline ----
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Risorse esterne (font Google ecc): network con fallback silenzioso
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // File app: prova sempre la rete prima, aggiorna cache, fallback offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// ---- MESSAGGIO: forza aggiornamento da JS ----
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});