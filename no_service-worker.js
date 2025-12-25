
self.addEventListener('install', function(event) {
  console.log('✅ Service Worker installato');
  self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
