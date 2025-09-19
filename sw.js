/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const STATIC_CACHE_NAME = 'echo-expedition-static-v1.4'; // Incremented version
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

// Listen for a message from the client to skip waiting and activate the new SW
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  // Do not skip waiting here anymore. We want to wait for the user's prompt.
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
    }).then(() => self.clients.claim()) // Take control of uncontrolled clients
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
  
  // Strategy: Network first, then cache for navigation requests (the HTML page).
  // This is crucial for detecting new versions of the app.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // If the network fails, serve the cached page.
        return caches.match(request);
      })
    );
    return;
  }

  // Strategy: Cache first, then network for all other assets (JS, CSS, images, etc.).
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      return cachedResponse || fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
