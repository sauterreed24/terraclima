// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  isThemePreference,
  nextThemePreference,
  persistThemePreference,
  prefersDarkScheme,
  resolveInitialTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "../theme";

describe("isThemePreference", () => {
  it("only accepts the three known preferences", () => {
    expect(isThemePreference("auto")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference("Dark")).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference(42)).toBe(false);
  });
});

describe("resolveInitialTheme", () => {
  it("prefers a valid URL query value over everything else", () => {
    expect(resolveInitialTheme("?theme=dark", "light")).toBe("dark");
    expect(resolveInitialTheme("?other=1&theme=auto", "dark")).toBe("auto");
  });

  it("falls back to localStorage when the URL has no theme", () => {
    expect(resolveInitialTheme("", "dark")).toBe("dark");
    expect(resolveInitialTheme("?irrelevant=1", "light")).toBe("light");
  });

  it("falls back to auto when neither URL nor storage has a valid value", () => {
    expect(resolveInitialTheme("", null)).toBe("auto");
    expect(resolveInitialTheme("?theme=neon", "junk")).toBe("auto");
  });

  it("treats a malformed URL search string as if it were missing", () => {
    expect(resolveInitialTheme("not a query", "light")).toBe("light");
  });
});

describe("resolveTheme", () => {
  it("explicit light/dark wins over OS preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("auto follows the OS preference", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets data-theme, data-theme-preference, and color-scheme on the document root", () => {
    const lightMeta = document.createElement("meta");
    lightMeta.dataset.themeColor = "light";
    lightMeta.media = "(prefers-color-scheme: light)";
    const darkMeta = document.createElement("meta");
    darkMeta.dataset.themeColor = "dark";
    darkMeta.media = "(prefers-color-scheme: dark)";
    document.head.append(lightMeta, darkMeta);

    applyTheme(document, "auto", "dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme-preference")).toBe("auto");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(lightMeta.media).toBe("not all");
    expect(darkMeta.media).toBe("all");

    applyTheme(document, "light", "light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(lightMeta.media).toBe("all");
    expect(darkMeta.media).toBe("not all");

    lightMeta.remove();
    darkMeta.remove();
  });
});

describe("persistThemePreference", () => {
  function memoryStorage() {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      _store: store,
    };
  }

  it("stores an explicit preference under the canonical key", () => {
    const storage = memoryStorage();
    persistThemePreference(storage, "dark");
    expect(storage._store.get(THEME_STORAGE_KEY)).toBe("dark");
    persistThemePreference(storage, "light");
    expect(storage._store.get(THEME_STORAGE_KEY)).toBe("light");
  });

  it("clears persistence for the auto preference (default behaviour wins next session)", () => {
    const storage = memoryStorage();
    persistThemePreference(storage, "dark");
    persistThemePreference(storage, "auto");
    expect(storage._store.get(THEME_STORAGE_KEY)).toBeUndefined();
  });

  it("does not crash when storage throws (quota / private browsing)", () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("quota"); },
    };
    expect(() => persistThemePreference(throwingStorage, "dark")).not.toThrow();
    expect(() => persistThemePreference(throwingStorage, "auto")).not.toThrow();
  });
});

describe("prefersDarkScheme", () => {
  it("returns true when matchMedia reports dark", () => {
    const win = {
      matchMedia: (q: string) => ({
        matches: q === "(prefers-color-scheme: dark)",
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    } as unknown as Window;
    expect(prefersDarkScheme(win)).toBe(true);
  });

  it("returns false when matchMedia is unavailable", () => {
    expect(prefersDarkScheme({} as Window)).toBe(false);
  });

  it("returns false when matchMedia throws", () => {
    const win = {
      matchMedia: () => { throw new Error("nope"); },
    } as unknown as Window;
    expect(prefersDarkScheme(win)).toBe(false);
  });
});

describe("nextThemePreference", () => {
  it("cycles auto → light → dark → auto", () => {
    expect(nextThemePreference("auto")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("auto");
  });
});
