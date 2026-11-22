// Service Worker for Personal Salary & Finance Manager (PWA App Shell)
// CRITICAL PRIVACY & DATA SECURITY GUARANTEE:
// This service worker ONLY caches static application assets (HTML, CSS, JS, SVG, Web Fonts).
// It NEVER caches personal financial data, uploaded Excel workbooks (.xlsx),
// exported files, temporary blob: URLs, data: URLs, or any decrypted session data.

const CACHE_NAME = 'salary-app-shell-v2';

// Static assets forming the application shell
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png'
];

// URLs/patterns that must NEVER be intercepted or cached
const NEVER_CACHE_PATTERNS = [
  /\.xlsx$/i,
  /\.xls$/i,
  /\.csv$/i,
  /^blob:/i,
  /^data:/i,
  /\/api\//i
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache the base app shell
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] App shell precache error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Strict Privacy Filter: Never cache or intercept Excel, blob, data, or external API requests
  const requestUrlStr = event.request.url;
  for (const pattern of NEVER_CACHE_PATTERNS) {
    if (pattern.test(requestUrlStr)) {
      return; // Handled directly by network / browser without SW interference
    }
  }

  // 3. Only handle same-origin or trusted font CDN requests
  const isSameOrigin = url.origin === self.location.origin;
  const isFontCdn = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (!isSameOrigin && !isFontCdn) {
    return;
  }

  // 4. Navigation Requests: Network-first with offline fallback to /index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('/index.html');
        return cachedIndex || new Response('Offline: Please reopen when connected or check your connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
    return;
  }

  // 5. Static Assets (JS, CSS, images, fonts): Cache-first with stale-while-revalidate update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Offline fallback is already cachedResponse */ });
        return cachedResponse;
      }

      // Not in cache, fetch from network and cache static build chunks
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && !isFontCdn)) {
          return networkResponse;
        }

        // Cache static chunks (/assets/, icons, fonts)
        if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || isFontCdn) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      });
    })
  );
});

// Support immediate update message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
