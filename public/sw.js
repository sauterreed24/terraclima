/* eslint-disable no-restricted-globals -- service worker runs in its own scope */
/**
 * Terraclima service worker.
 *
 * Strategy:
 *   - App shell precache: index.html + the SW itself (kept tiny so an
 *     install on a flaky connection still succeeds). On install we activate
 *     ourselves so updates roll out without waiting for all tabs to close.
 *   - Runtime cache: stale-while-revalidate for hashed JS/CSS produced by
 *     Vite (long-cache, content-addressed names). Files of the very first
 *     visit load before this worker exists; the page posts their URLs
 *     (`CACHE_URLS`) once the worker is ready, so a second open works offline. Same strategy for the
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
  // The page lists the build files it loaded before this worker controlled it
  // (the whole first visit). Cache them so the app opens offline next time.
  if (event.data && event.data.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(cacheLoadedAssets(event.data.urls).then(pruneOldBuilds));
  }
});

/**
 * Drop cached build files that the current deploy no longer ships. Hashed
 * names change with every deploy, so without this the cache grows with each
 * visit after an update; under storage pressure a browser may then clear the
 * whole site, saved places included. Needs the network (the manifest is
 * fetched fresh); offline, nothing is removed.
 */
async function pruneOldBuilds() {
  let manifest;
  try {
    const response = await fetch(new URL("asset-manifest.json", self.registration.scope).href, { cache: "no-store" });
    if (!response.ok) return;
    manifest = await response.json();
  } catch {
    return;
  }
  const current = new Set();
  for (const file of Array.isArray(manifest && manifest.files) ? manifest.files : []) {
    if (typeof file === "string") current.add(new URL(file, self.registration.scope).pathname);
  }
  // A manifest without the build's own files is not trusted to prune with.
  if (current.size < 5) return;
  const cache = await caches.open(RUNTIME_CACHE);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path.includes("/assets/") && !current.has(path)) await cache.delete(request);
  }
}

async function cacheLoadedAssets(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  await Promise.all(
    urls.slice(0, 400).map(async raw => {
      try {
        const url = new URL(raw, self.location.href);
        if (url.origin !== self.location.origin || !url.pathname.includes("/assets/")) return;
        if (await cache.match(url.href, { ignoreVary: true })) return;
        // Default cache mode: the files were just downloaded, so this is
        // normally served from the HTTP cache without a second download.
        const response = await fetch(url.href);
        if (response && response.ok && response.type === "basic") await cache.put(url.href, response);
      } catch {
        // Best-effort: a file that cannot be fetched now is cached on its next use.
      }
    }),
  );
}

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
  // Build files have content-hashed names, so a URL match is enough. Ignoring
  // Vary lets a module script (sent with an Origin header) use a copy cached by
  // a plain fetch, on hosts that answer with `Vary: Origin`.
  const cached = await cache.match(request, { ignoreVary: true });
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
