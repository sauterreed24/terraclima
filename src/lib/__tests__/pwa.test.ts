// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  loadedAssetUrls,
  markServiceWorkerUpdateAccepted,
  resolveServiceWorkerUrl,
  shouldRegisterServiceWorker,
  shouldReloadOnServiceWorkerControllerChange,
} from "../pwa";

describe("resolveServiceWorkerUrl", () => {
  it("joins a base path that already ends with /", () => {
    expect(resolveServiceWorkerUrl("/")).toBe("/sw.js");
    expect(resolveServiceWorkerUrl("/terraclima/")).toBe("/terraclima/sw.js");
  });

  it("appends a / separator when the base doesn't end with one", () => {
    expect(resolveServiceWorkerUrl("/terraclima")).toBe("/terraclima/sw.js");
    expect(resolveServiceWorkerUrl(".")).toBe("./sw.js");
  });
});

describe("shouldRegisterServiceWorker", () => {
  it("returns false in dev even when serviceWorker is supported", () => {
    expect(shouldRegisterServiceWorker({ DEV: true })).toBe(false);
  });

  it("returns true in production when serviceWorker is supported", () => {
    // jsdom defines navigator.serviceWorker.
    const supported = "serviceWorker" in navigator;
    expect(shouldRegisterServiceWorker({ DEV: false })).toBe(supported);
  });

  it("returns false when navigator entirely lacks the serviceWorker key", () => {
    // The `in navigator` runtime check ignores values and inspects key
    // presence, so to simulate an unsupported browser we need to swap
    // navigator wholesale for one without the key — not just nuke the
    // value. We restore at the end so the rest of the suite is unaffected.
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    try {
      expect(shouldRegisterServiceWorker({ DEV: false })).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
      });
    }
  });
});

describe("service worker reload gating", () => {
  it("does not reload until the user accepts an update", () => {
    expect(shouldReloadOnServiceWorkerControllerChange()).toBe(false);
    markServiceWorkerUpdateAccepted();
    expect(shouldReloadOnServiceWorkerControllerChange()).toBe(true);
  });
});

describe("loadedAssetUrls", () => {
  it("keeps same-origin build files, drops everything else, and dedupes", () => {
    const origin = "https://example.github.io";
    const entries = [
      { name: `${origin}/terraclima/assets/index-abc.js` },
      { name: `${origin}/terraclima/assets/index-abc.js?v=1` },
      { name: `${origin}/terraclima/assets/style-def.css` },
      { name: `${origin}/terraclima/assets/climate-processor.worker-x.js` },
      { name: `${origin}/terraclima/icon-192.png` },
      { name: `${origin}/terraclima/` },
      { name: "https://upload.wikimedia.org/photo.jpg" },
      { name: "not a url" },
    ];
    expect(loadedAssetUrls(entries, origin, [`${origin}/terraclima/assets/react-1.js`])).toEqual([
      `${origin}/terraclima/assets/index-abc.js`,
      `${origin}/terraclima/assets/style-def.css`,
      `${origin}/terraclima/assets/climate-processor.worker-x.js`,
      `${origin}/terraclima/assets/react-1.js`,
    ]);
  });
});
