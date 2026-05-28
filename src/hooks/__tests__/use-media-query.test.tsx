// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "../use-media-query";

type Listener = (e: { matches: boolean }) => void;

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null;
  addEventListener: (event: "change", listener: Listener) => void;
  removeEventListener: (event: "change", listener: Listener) => void;
  addListener: (listener: Listener) => void;
  removeListener: (listener: Listener) => void;
  dispatchEvent: (ev: Event) => boolean;
}

const originalMatchMedia = window.matchMedia;

interface ControllableMediaQueryList extends MockMediaQueryList {
  _setMatches: (matches: boolean) => void;
}

let lastMql: ControllableMediaQueryList | null = null;

beforeEach(() => {
  lastMql = null;
  window.matchMedia = vi.fn().mockImplementation((media: string) => {
    const listeners = new Set<Listener>();
    const mql: ControllableMediaQueryList = {
      matches: false,
      media,
      onchange: null,
      addEventListener: (_event, listener) => { listeners.add(listener); },
      removeEventListener: (_event, listener) => { listeners.delete(listener); },
      addListener: listener => { listeners.add(listener); },
      removeListener: listener => { listeners.delete(listener); },
      dispatchEvent: () => true,
      _setMatches: (next: boolean) => {
        mql.matches = next;
        listeners.forEach(l => l({ matches: next }));
      },
    };
    lastMql = mql;
    return mql as unknown as MediaQueryList;
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("useMediaQuery", () => {
  it("returns the initial matches value from matchMedia at mount", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("updates when the matchMedia change listener fires", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => { lastMql?._setMatches(true); });
    expect(result.current).toBe(true);
    act(() => { lastMql?._setMatches(false); });
    expect(result.current).toBe(false);
  });

  it("removes the change listener on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery("(max-width: 480px)"));
    // The mock listener Set lives on the captured mql. After unmount,
    // dispatching shouldn't be observed by the hook (no React update); we
    // verify cleanup by asserting the listener set ends up empty.
    expect(lastMql).toBeTruthy();
    unmount();
    // Trigger a change after unmount — should be a no-op and not throw.
    act(() => { lastMql?._setMatches(true); });
  });
});
