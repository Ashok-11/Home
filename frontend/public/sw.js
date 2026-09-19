// Manshok service worker.
//
// Hard rule: never cache HTML documents or JS/CSS modules. Doing so served stale
// Vite dev modules (and a shell captured mid-build) and rendered a blank page.
// Only static, content-addressed assets (icons, manifest, images) are cached, and
// any cache from an older version is deleted on activate.
const CACHE = "manshok-static-v3";
const PRECACHE = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
const CACHEABLE = /\.(png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Escape hatch: page can ask the worker to purge everything and unregister.
  if (event.data === "manshok-reset") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.registration.unregister()),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // household data is always live
  if (request.mode === "navigate" || request.destination === "document") return; // never cache HTML
  if (!CACHEABLE.test(url.pathname)) return; // scripts, styles, dev modules → straight to network

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
