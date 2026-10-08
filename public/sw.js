/*
 * Service worker: keeps the app shell, fonts, pictures and audio on the
 * device so the app opens without internet. Videos are never cached
 * (they stream from YouTube).
 *
 * VERSION and PRECACHE are filled in after each build by
 * scripts/finalize-sw.mjs (this template stays valid JavaScript).
 */
const VERSION = "dev";
const PRECACHE = [];
const SHELL = `shell-${VERSION}`;
// Versioned too, so pages saved from an older deploy are dropped with it.
const RUNTIME = `runtime-${VERSION}`;
const OFFLINE_URL = "/offline";
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // All or nothing: if the connection drops halfway, this update fails and the
      // previous, complete version stays in charge until the browser tries again.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

/** This deploy's precache first, then pages and files saved while browsing. */
async function fromCache(request) {
  return (
    (await caches.match(request, { cacheName: SHELL, ignoreSearch: true })) ||
    (await caches.match(request, { cacheName: RUNTIME, ignoreSearch: true })) ||
    undefined
  );
}

/** Pages and page data: fresh when online, cached copy when slow or offline. */
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]);
    if (response.ok) {
      const copy = response.clone();
      caches.open(RUNTIME).then((c) => c.put(request, copy));
    }
    return response;
  } catch {
    const cached = await fromCache(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

/** Versioned files, fonts, pictures, audio: use the saved copy if we have one. */
async function cacheFirst(request) {
  const cached = await fromCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(RUNTIME).then((c) => c.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // YouTube, thumbnails: straight to the network.

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, OFFLINE_URL));
  } else if (url.pathname.startsWith("/audio/")) {
    // <audio> asks for byte ranges, and partial (206) responses can't be cached:
    // always fetch and keep the whole file, and answer every range request with it.
    event.respondWith(cacheFirst(new Request(url.href)));
  } else if (url.pathname.startsWith("/_next/static/") || /^\/(images|icons)\//.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
