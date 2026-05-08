import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/** Browser-only polyfills for jsdom-based tests (skipped when Vitest uses `environment: "node"`). */
if (typeof window !== "undefined") {
  /** jsdom does not implement matchMedia — App uses `useMediaQuery` everywhere. */
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  window.scrollTo = vi.fn() as typeof window.scrollTo;

  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver;
}
