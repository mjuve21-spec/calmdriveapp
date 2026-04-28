const CACHE_NAME = 'calmdrive-v2';

// Assets to cache on install
const PRECACHE_URLS = [
  './icon192x192.png',
  './audio/reminder1.mp3',
  './audio/reminder2.mp3',
  './audio/reminder3.mp3',
  './audio/reminder4.mp3',
  './audio/reminder5.mp3',
  './audio/reminder6.mp3'
];

// Install event - cache only audio and images
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.log('Cache failed:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - ALWAYS get HTML pages fresh from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always fetch HTML pages fresh - never serve from cache
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For audio and images - serve from cache if available
  if (request.destination === 'audio' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else - network first
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
