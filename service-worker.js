// Force fresh install by incrementing version
const CACHE_NAME = 'calmdrive-v4';

// Only cache audio files - NEVER cache HTML pages
const PRECACHE_URLS = [
  '../audio/reminder1.mp3',
  '../audio/reminder2.mp3',
  '../audio/reminder3.mp3',
  '../audio/reminder4.mp3',
  '../audio/reminder5.mp3',
  '../audio/reminder6.mp3'
];

// Install - cache only audio
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.log('Cache failed:', err))
  );
});

// Activate - delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete everything that isn't current cache
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - ALWAYS get HTML fresh, never from cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ALWAYS fetch HTML pages fresh from network - NO EXCEPTIONS
  if (event.request.destination === 'document' || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => fetch(event.request))
    );
    return;
  }

  // For audio files only - use cache
  if (event.request.destination === 'audio') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else - always network first
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => caches.match(event.request))
  );
});
