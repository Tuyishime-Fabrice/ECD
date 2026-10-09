/*
 * Service worker: keeps the app shell, fonts, pictures and audio on the
 * device so the app opens without internet. Videos are never cached
 * (they stream from YouTube).
 *
 * This is the template. After each build, scripts/finalize-sw.mjs fills in
 * VERSION and PRECACHE and writes the result to public/sw.js.
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

/**
 * Recordings: keep the whole file (partial responses can't be cached) and answer
 * <audio>'s byte-range requests with the matching slice, as Safari requires a 206.
 */
async function audioResponse(request) {
  const full = await cacheFirst(new Request(request.url));
  const range = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get("range") || "").trim());
  if (!range || full.status !== 200 || (range[1] === "" && range[2] === "")) return full;
  const blob = await full.blob();
  const size = blob.size;
  let start;
  let end;
  if (range[1] === "") {
    // "bytes=-N": the last N bytes.
    start = Math.max(0, size - Number(range[2]));
    end = size - 1;
  } else {
    start = Number(range[1]);
    end = range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // YouTube, thumbnails: straight to the network.
  // The admin dashboard, and the deploy status it polls, are always live; never cache them.
  if (/^\/(admin|api)(\/|$)/.test(url.pathname) || url.pathname === "/build-info.json") return;
  // In-app navigation data: online only. Offline, Next.js falls back to a full page load,
  // which is answered from the cached HTML below.
  if (request.headers.has("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, OFFLINE_URL));
  } else if (url.pathname.startsWith("/audio/")) {
    event.respondWith(audioResponse(request));
  } else if (url.pathname.startsWith("/_next/static/") || /^\/(images|icons)\//.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
