/**
 * Service-worker registration helper + new-version detection.
 *
 * Design notes:
 *   - Register in production only. Dev (`import.meta.env.DEV`) leaves the
 *     SW unregistered so HMR + dynamic chunks stay fast and predictable.
 *   - Resolve the SW URL against the Vite base path so the same code works
 *     under GitHub Pages (`/terraclima/`), Vercel (root), and the static-
 *     preview build (relative `./`).
 *   - When a new worker has installed and is `waiting`, fire the
 *     `onUpdateAvailable` callback so the UI can prompt the user to reload.
 *     The caller can post a `SKIP_WAITING` message via `activateUpdate()`
 *     to claim immediately, then reload.
 *   - Catches all failures silently — a SW that can't register must not
 *     break the app shell.
 */

export interface RegisterServiceWorkerOptions {
  /** Called when a fresh SW has installed and is waiting to activate. */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}

export interface PwaController {
  /** Tell the waiting SW to take over now and refresh the page. */
  activateUpdate: (registration: ServiceWorkerRegistration) => void;
  /** Unregister all SWs registered under this origin (escape hatch). */
  unregister: () => Promise<void>;
}

/** Set before SKIP_WAITING so controllerchange reload is user-initiated only. */
let userAcceptedServiceWorkerUpdate = false;

export function markServiceWorkerUpdateAccepted(): void {
  userAcceptedServiceWorkerUpdate = true;
}

export function shouldReloadOnServiceWorkerControllerChange(): boolean {
  return userAcceptedServiceWorkerUpdate;
}

/** True when the browser supports SW *and* we're not in dev. */
export function shouldRegisterServiceWorker(env: { DEV?: boolean } = import.meta.env): boolean {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  return !env.DEV;
}

/**
 * Resolve `<baseUrl>sw.js` deterministically. Accepts an injected base for
 * unit tests; defaults to `import.meta.env.BASE_URL` (Vite-supplied).
 */
export function resolveServiceWorkerUrl(baseUrl: string = import.meta.env.BASE_URL ?? "/"): string {
  if (!baseUrl.endsWith("/")) return `${baseUrl}/sw.js`;
  return `${baseUrl}sw.js`;
}

/**
 * Register the service worker and wire the optional update-available
 * callback. Returns a small controller object for activating the next SW
 * or unregistering everything.
 *
 * No-ops in dev or in environments without `navigator.serviceWorker`.
 */
export function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {},
): PwaController {
  const controller: PwaController = {
    activateUpdate(registration) {
      markServiceWorkerUpdateAccepted();
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    },
    async unregister() {
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
        await Promise.all(regs.map(r => r.unregister()));
      } catch {
        // Ignore — the SW lifecycle is best-effort.
      }
    },
  };

  if (!shouldRegisterServiceWorker()) return controller;

  // Register asynchronously so we never block first paint.
  void (async () => {
    try {
      const url = resolveServiceWorkerUrl();
      const registration = await navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL ?? "/" });
      // Catch updates that already happened before this script ran.
      if (registration.waiting) {
        options.onUpdateAvailable?.(registration);
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            // A new worker is ready and there's already a controller — that
            // means the active SW will be replaced; fire the prompt.
            options.onUpdateAvailable?.(registration);
          }
        });
      });
      // Reload only after the user explicitly accepts an update — never on the
      // silent first-install takeover or an auto-activated waiting worker.
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!shouldReloadOnServiceWorkerControllerChange()) return;
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      // The files of this first load were fetched before the worker existed, so
      // it never saw them. Hand it their addresses so the next open works offline.
      // Wait until the page has finished loading and gone quiet, so the
      // worker's copies never compete with what the user is waiting for.
      const ready = await navigator.serviceWorker.ready;
      await whenIdleAfterLoad();
      const urls = loadedAssetUrls();
      if (urls.length > 0) ready.active?.postMessage({ type: "CACHE_URLS", urls });
    } catch {
      // Silent: SW registration is a progressive enhancement.
    }
  })();

  return controller;
}

function whenIdleAfterLoad(delayMs = 4000): Promise<void> {
  return new Promise(resolve => {
    const idle = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      const go = () => (w.requestIdleCallback ? w.requestIdleCallback(() => resolve(), { timeout: 5000 }) : resolve());
      window.setTimeout(go, delayMs);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}

/**
 * Same-origin build assets this page has loaded so far (scripts, styles,
 * workers, data chunks), from the resource timing buffer plus the document's
 * own script and stylesheet tags.
 */
export function loadedAssetUrls(
  entries: readonly { name: string }[] = typeof performance !== "undefined" ? performance.getEntriesByType("resource") : [],
  origin: string = typeof location !== "undefined" ? location.origin : "",
  documentUrls: readonly string[] = typeof document !== "undefined"
    ? [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")]
      .map(el => (el instanceof HTMLScriptElement ? el.src : el.href))
    : [],
): string[] {
  const out = new Set<string>();
  for (const raw of [...entries.map(e => e.name), ...documentUrls]) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    if (!/\/assets\/[^/]+\.(?:js|mjs|css|json|woff2?)$/.test(url.pathname)) continue;
    out.add(url.origin + url.pathname);
  }
  return [...out];
}
