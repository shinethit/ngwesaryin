const CACHE_NAME = 'ngwesaryin-live-v9';
// [v7.6.34] ATOMIC GENERATIONS — bump CACHE_NAME on EVERY release.
// A new worker activates only after it has precached the COMPLETE
// build (index.html + every hashed JS/CSS asset it references). The
// previous generation keeps serving until then, so a new deploy
// plus a slow/offline load can never leave a newer index.html
// cached with its chunks missing. The old worker did exactly
// that: network-first with a 1.5s timeout cached whatever
// index.html arrived, then answered HTTP 408 for the new chunk
// whose fetch timed out — the app never booted, and the poisoned
// pairing persisted in the cache (loading screen forever, even
// fully offline).

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting() up front: this generation must be
  // complete before it can take over. Any failure rejects the
  // install, and the previous worker (with its complete cache)
  // keeps serving the previous build.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const res = await fetch('/index.html', { cache: 'no-store' });
      if (!res || !res.ok) {
        throw new Error('Precache: index.html fetch failed');
      }
      const html = await res.text();
      const urls = new Set(PRECACHE_ASSETS);
      // Every hashed asset this build's index.html references.
      const re = /(?:src|href)="([^"]+)"/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const raw = m[1];
        if (!raw.startsWith('/')) continue;
        const p = raw.split('?')[0].split('#')[0];
        if (p.startsWith('/assets/') && (p.endsWith('.js') || p.endsWith('.css'))) {
          urls.add(p);
        }
      }
      urls.add('/index.html');
      // [v7.6.34] The build-time asset manifest covers EVERY chunk,
      // including lazy views: the app mounts all tab views (hidden)
      // on boot, so every lazy chunk is imported on every boot.
      // index.html alone only references the entry chunks — without
      // the manifest, a lazy chunk never visited online would 408
      // offline and trip the ErrorBoundary on boot.
      const manifestRes = await fetch('/asset-manifest.json', { cache: 'no-store' });
      if (!manifestRes || !manifestRes.ok) {
        throw new Error('Precache: asset-manifest.json fetch failed');
      }
      const manifest = await manifestRes.json();
      if (!Array.isArray(manifest)) {
        throw new Error('Precache: asset-manifest.json is not an array');
      }
      manifest.forEach((name) => {
        if (typeof name === 'string' && (name.endsWith('.js') || name.endsWith('.css'))) {
          urls.add('/' + name.replace(/^\//, ''));
        }
      });
      // addAll is all-or-nothing: one failed asset fails the whole
      // install, so a half-cached generation can never activate.
      await cache.addAll([...urls]);
      await self.skipWaiting();
    })().catch(async (err) => {
      console.warn('Precache failed — keeping the previous build:', err);
      // Drop any partial cache this failed install created, so no
      // half-cached generation lingers under this cache name.
      try { await caches.delete(CACHE_NAME); } catch {}
      throw err;
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Clearing old service worker cache:', name);
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

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Skip Firebase Auth, Firestore and GCP Cloud live sync calls
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google')
  ) {
    return;
  }

  // [v7.5.69] Never intercept the version check - /version.json must
  // always reach the network. The Cache-First branch below turns ANY
  // fetch failure into a synthetic 404, and iOS can hang the SW
  // fetch past the app's 5s timeout, so the check reported
  // "HTTP 404" (Android) / "Network timeout (5s)" (iOS) even with a
  // good connection. Returning here (no respondWith) lets the
  // browser fetch it directly from the server.
  if (url.pathname === '/version.json') {
    return;
  }

  // [v7.6.34] Cache-first for the app shell. The active generation
  // is complete by construction (see install), so the cached
  // index.html and its chunks always match. The fetch handler
  // NEVER overwrites the cached index.html: a new build arrives
  // only through a new worker generation, never through a stray
  // network response. A cache miss fetches from the network and
  // caches the result for hashed assets only (immutable by
  // content hash); HTML is never re-cached here.
  const isCodeOrHtml =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/assets/');
  const isHtml =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if (isCodeOrHtml) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              !isHtml &&
              url.origin === self.location.origin
            ) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              }).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback to index.html for SPA routing
            if (request.mode === 'navigate') {
              return caches.match('/index.html').then((indexResponse) => {
                if (indexResponse) return indexResponse;
                return new Response('Network error and no cache available', {
                  status: 408,
                  headers: { 'Content-Type': 'text/plain' },
                });
              });
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

  // Cache-First for static assets (images, fonts, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
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
