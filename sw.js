const CACHE_NAME = 'gametracker-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/index.css',
  '/js/app.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/animations.js',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests - network only with timeout
  if (url.hostname.includes('rawg.io') || url.hostname.includes('steampowered.com')) {
    event.respondWith(
      fetchWithTimeout(request, 10000)
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          fetchAndCache(request);
          return cachedResponse;
        }
        return fetchAndCache(request);
      })
  );
});

// Helper: Fetch with timeout
function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Helper: Fetch and cache response
function fetchAndCache(request) {
  return fetch(request)
    .then((response) => {
      // Don't cache non-ok responses
      if (!response.ok) return response;

      const responseClone = response.clone();
      caches.open(CACHE_NAME)
        .then((cache) => {
          cache.put(request, responseClone);
        });

      return response;
    });
}
