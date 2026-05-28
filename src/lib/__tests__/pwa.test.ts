// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveServiceWorkerUrl, shouldRegisterServiceWorker } from "../pwa";

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
