const CACHE_VERSION = 'v10';  // â­ Fix á€á€­á€¯á€„á€ºá€¸ á€’á€«á€€á€­á€¯ bump
const CACHE_NAME = `ngwesaryin-live-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',       // â­ .webmanifest (file name á€”á€²á€· á€á€°á€›á€™á€šá€º)
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // â­ File á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸ á€á€½á€²á€•á€¼á€®á€¸ cache â€” á€á€…á€ºá€á€¯ fail á€›á€„á€º á€€á€»á€”á€ºá€á€¬ á€™á€•á€»á€€á€ºá€…á€±á€›
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Pre-cache skipped: ${asset}`, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('ngwesaryin-'))
          .map((name) => {
            console.log('[SW] Clearing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Fetch with timeout â€” 5s (slow networks/VPNs)
 */
function fetchWithTimeout(request, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('SW fetch timeout'));
    }, timeoutMs);
    fetch(request)
      .then((response) => { clearTimeout(timer); resolve(response); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * â­ Safe cache.put â€” scheme + status check
 */
async function safeCachePut(cache, request, response) {
  try {
    const url = request.url;
    // HTTP/HTTPS á€žá€¬ cache á€œá€¯á€•á€ºá€•á€«
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    // Response status 200 (á€žá€­á€¯á€·) opaque á€žá€¬
    if (response && (response.status === 200 || response.type === 'opaque')) {
      await cache.put(request, response);
    }
  } catch (err) {
    // Silent â€” chrome-extension, unsupported scheme, etc.
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // â­â­ CRITICAL: HTTP/HTTPS á€™á€Ÿá€¯á€á€ºá€›á€„á€º á€œá€¯á€¶á€¸á€ á€™á€€á€­á€¯á€„á€ºá€› (chrome-extension://, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // â­ Firebase / Google APIs á€€á€­á€¯ SW handle á€™á€œá€¯á€•á€ºá€› â€” network á€€á€á€Šá€ºá€¸á€€
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('google-analytics.com')
  ) {
    return;
  }

  const isCodeOrHtml =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/assets/');

  if (isCodeOrHtml) {
    event.respondWith(
      fetchWithTimeout(request, 5000)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              safeCachePut(cache, request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Network error and no cache available', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
        })
    );
    return;
  }

  // Cache-First for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            safeCachePut(cache, request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline resource not available', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
