const CACHE_NAME = 'finanzas-pro-v2';
const ASSETS = [
  '/index.html',
  '/history.html',
  '/recurring.html',
  '/login.html',
  '/css/style.css',
  '/js/utils.js',
  '/js/supabase-client.js',
  '/js/ui-controller.js',
  '/js/index.js',
  '/js/history.js',
  '/js/recurring.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  // Don't cache Supabase API calls
  if (event.request.url.includes('supabase.co')) return;
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
