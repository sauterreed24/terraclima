// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { runViewTransition } from "../view-transition";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document as unknown as Record<string, unknown>, "startViewTransition");
});

describe("runViewTransition", () => {
  it("runs the update synchronously when prefers-reduced-motion is on", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    // Re-define on `window` because the helper reads via `window.matchMedia`
    // when present. jsdom default returns matches:false for everything; we
    // override globally so prefersReducedMotion() resolves to true.
    Object.defineProperty(window, "matchMedia", { value: globalThis.matchMedia, configurable: true });
    const startVT = vi.fn();
    (document as unknown as { startViewTransition?: typeof startVT }).startViewTransition = startVT;
    const update = vi.fn();
    runViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(startVT).not.toHaveBeenCalled();
  });

  it("uses document.startViewTransition when present and motion is allowed", () => {
    Object.defineProperty(window, "matchMedia", {
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      configurable: true,
    });
    const startVT = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), skipTransition: () => {} };
    });
    (document as unknown as { startViewTransition?: typeof startVT }).startViewTransition = startVT;
    const update = vi.fn();
    runViewTransition(update);
    expect(startVT).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("runs the update directly when the browser has no startViewTransition", () => {
    Object.defineProperty(window, "matchMedia", {
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      configurable: true,
    });
    Reflect.deleteProperty(document as unknown as Record<string, unknown>, "startViewTransition");
    const update = vi.fn();
    runViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
