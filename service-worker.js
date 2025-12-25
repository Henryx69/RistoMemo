const CACHE_NAME = 'ristomemo-v1.3.0';

// File da mettere in cache per funzionamento offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './mappa.html',
  './ricerca.html',
  './manifest.json',
  './salvaristo_icon512.png',
  './privacy.html'
];

// Installazione: pre-cache dei file essenziali
self.addEventListener('install', function(event) {
  console.log('✅ Service Worker: installazione in corso...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cache aperta, scarico file...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(function() {
        console.log('✅ Tutti i file in cache!');
        return self.skipWaiting();
      })
  );
});

// Attivazione: pulizia cache vecchie
self.addEventListener('activate', function(event) {
  console.log('🔄 Service Worker: attivazione...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Elimino cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker attivo!');
      return self.clients.claim();
    })
  );
});

// Strategia Network First: prova sempre la rete, fallback su cache
self.addEventListener('fetch', function(event) {
  // Ignora richieste non-GET e richieste esterne (Google Maps, etc)
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Se la richiesta ha successo, aggiorna la cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(function() {
        // Se la rete fallisce, usa la cache
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            console.log('📂 Carico da cache:', event.request.url);
            return cachedResponse;
          }
          // Se non è in cache e non c'è rete, mostra errore
          console.warn('❌ Risorsa non disponibile:', event.request.url);
        });
      })
  );
});
