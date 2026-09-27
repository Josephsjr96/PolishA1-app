/* Polish A1 — service worker
   Caches the app shell so it opens instantly and works offline once
   it's been visited at least once. Upload this file in the SAME
   folder as the app's .html file (must be named sw.js, or update the
   register("sw.js") path in the app if you rename it). */

const CACHE_NAME = "polish-a1-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["./"]))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: serve from cache instantly if we have it,
   and quietly refresh the cache from the network in the background. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
