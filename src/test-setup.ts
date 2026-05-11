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

  /** jsdom: scrollTo on elements is missing or non-callable; place detail uses it for reading-nav. */
  if (typeof Element !== "undefined") {
    Element.prototype.scrollTo = vi.fn() as typeof Element.prototype.scrollTo;
  }

  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    this.setAttribute("open", "");
    this.dispatchEvent(new Event("toggle"));
  };

  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("toggle"));
  };

  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}
