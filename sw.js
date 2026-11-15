/* eslint-disable no-restricted-globals -- service worker runs in its own scope */
/**
 * Terraclima service worker.
 *
 * Strategy:
 *   - App shell precache: index.html + the SW itself (kept tiny so an
 *     install on a flaky connection still succeeds). On install we activate
 *     ourselves so updates roll out without waiting for all tabs to close.
 *   - Runtime cache: stale-while-revalidate for hashed JS/CSS produced by
 *     Vite (long-cache, content-addressed names). Same strategy for the
 *     manifest, icon PNGs, and og-image so a cold offline open still shows
 *     metadata + a favicon. Range requests pass through untouched.
 *   - The atlas data files are large and content-hashed; we let the browser
 *     HTTP cache + the runtime SWR cache handle them. We do NOT precache
 *     them — that would balloon the install size and isn't necessary for
 *     read-only offline.
 *   - Anything that isn't a GET, or that targets a cross-origin URL we
 *     didn't put in the allowlist, falls through to the network untouched.
 */

const VERSION = "terraclima-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./site.webmanifest",
];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Use `Request` with `cache: "reload"` so a SW update doesn't reuse a
      // possibly-stale HTTP cache entry for the shell.
      await Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
            // Best-effort: missing assets shouldn't kill the install.
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith("terraclima-") && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map(stale => caches.delete(stale)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Don't cache Range requests — they tend to be media and the cache can't
  // satisfy partial responses anyway.
  if (request.headers.has("range")) return;

  // Navigation requests: shell-first with a network fallback. This lets a
  // user open the app fully offline once they've visited it once.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Same-origin static asset: SWR.
  const isStaticAsset = /\.(?:js|mjs|css|png|svg|ico|webmanifest|json|woff2?)$/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function handleNavigation(request) {
  const shell = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    // Update the shell on every successful navigation so the offline copy
    // tracks the deployed bundle.
    if (fresh && fresh.ok) {
      shell.put("./index.html", fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = (await shell.match(request)) ?? (await shell.match("./index.html"));
    if (cached) return cached;
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      // Only cache successful, basic-origin responses.
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
