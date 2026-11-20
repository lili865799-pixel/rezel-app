const CACHE_VERSION = 'rezel-shell-v2';
const BASE_URL = self.registration.scope;
const APP_URL = new URL('index.html', BASE_URL).href;
const MANIFEST_URL = new URL('manifest.webmanifest', BASE_URL).href;
const ICON_URL = new URL('favicon.svg', BASE_URL).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const response = await fetch(APP_URL);
      const html = await response.clone().text();
      await cache.put(APP_URL, response);

      const assetPaths = Array.from(
        html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
        (match) => match[1],
      )
        .map((path) => new URL(path, BASE_URL))
        .filter((url) => url.origin === self.location.origin)
        .map((url) => url.href);

      await cache.addAll([MANIFEST_URL, ICON_URL, ...assetPaths]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('rezel-shell-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(request)) || cache.match(APP_URL);
      }),
    );
    return;
  }

  if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
});
