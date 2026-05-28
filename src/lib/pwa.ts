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
      // When the new SW takes over, reload once so the UI matches the new bundle.
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch {
      // Silent: SW registration is a progressive enhancement.
    }
  })();

  return controller;
}
