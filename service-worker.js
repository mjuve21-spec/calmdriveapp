const CACHE_NAME = 'calmdrive-v1';
const RUNTIME_CACHE = 'calmdrive-runtime-v1';

// Assets to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './icon192x192.png',
  './css',
  './audio/reminder1.mp3',
  './audio/reminder2.mp3',
  './audio/reminder3.mp3',
  './audio/reminder4.mp3',
  './audio/reminder5.mp3',
  './audio/reminder6.mp3'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(PRECACHE_URLS);
      })
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
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip cross-origin requests
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Return cached version or fetch from network
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });

            return response;
          });
        })
        .catch(() => {
          // Return offline page or fallback
          return caches.match('./index.html');
        })
    );
  }
});
