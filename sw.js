const CACHE_NAME = 'finanzas-pro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/history.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/utils.js',
  '/js/index.js',
  '/js/history.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});