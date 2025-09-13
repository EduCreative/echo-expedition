/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const STATIC_CACHE_NAME = 'echo-expedition-static-v1.3'; // For app shell, assets, etc.
const ALL_CACHES = [
  STATIC_CACHE_NAME,
];

// URLs for the app shell and critical assets
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.webmanifest',
];

// --- SERVICE WORKER LIFECYCLE ---

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Opened static cache, caching app shell.');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache is not in our whitelist, delete it.
          if (!ALL_CACHES.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});


// --- FETCH EVENT HANDLING ---

self.addEventListener('fetch', event => {
  const { request } = event;

  // We only handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  // For API calls to Google, always go to the network.
  if (request.url.includes('generativelanguage.googleapis.com')) {
    return; // Let the browser handle it.
  }
  
  // Strategy: Cache First, falling back to Network for all assets.
  event.respondWith(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        // Return from cache if found.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network.
        return fetch(request).then(networkResponse => {
          // Cache the new response for future use.
          if (networkResponse.ok && request.url.startsWith('http')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});