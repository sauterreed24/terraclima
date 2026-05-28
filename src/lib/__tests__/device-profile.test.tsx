// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, useRichVisualEffects } from "../device-profile";

let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  // Reset the test-only navigator overrides we install below.
  vi.unstubAllGlobals();
});

function setMatchMedia(handler: (query: string) => boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: handler(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("prefersReducedMotion", () => {
  it("reports true when the OS asks for reduced motion", () => {
    setMatchMedia(q => q === "(prefers-reduced-motion: reduce)");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("reports false when the OS does not ask for reduced motion", () => {
    setMatchMedia(() => false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("safely returns false when matchMedia is missing", () => {
    Object.defineProperty(window, "matchMedia", { value: undefined, configurable: true });
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("useRichVisualEffects", () => {
  it("returns false when prefers-reduced-motion is on, regardless of hardware", () => {
    setMatchMedia(q => q === "(prefers-reduced-motion: reduce)");
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 16,
      deviceMemory: 32,
      connection: undefined,
    });
    const { result } = renderHook(() => useRichVisualEffects());
    expect(result.current).toBe(false);
  });

  it("returns false on a low-RAM device (≤ 4 GB) even with motion allowed", () => {
    setMatchMedia(() => false);
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 8,
      deviceMemory: 2,
      connection: undefined,
    });
    const { result } = renderHook(() => useRichVisualEffects());
    expect(result.current).toBe(false);
  });

  it("returns false when the connection has save-data enabled", () => {
    setMatchMedia(() => false);
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 8,
      deviceMemory: 16,
      connection: { saveData: true },
    });
    const { result } = renderHook(() => useRichVisualEffects());
    expect(result.current).toBe(false);
  });

  it("returns false when the core count is at or below 4", () => {
    setMatchMedia(() => false);
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 4,
      deviceMemory: 16,
      connection: undefined,
    });
    const { result } = renderHook(() => useRichVisualEffects());
    expect(result.current).toBe(false);
  });

  it("returns true on a modern desktop with motion allowed", () => {
    setMatchMedia(() => false);
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 12,
      deviceMemory: 16,
      connection: { saveData: false },
    });
    const { result } = renderHook(() => useRichVisualEffects());
    expect(result.current).toBe(true);
  });
});
