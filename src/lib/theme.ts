/**
 * Light / dark / auto theme management.
 *
 * Terraclima has shipped as a single light theme since v3.1. The bright
 * Sonoran-courtyard palette stays the default for new sessions, but a user
 * can now explicitly request dark mode (e.g. low-light reading, OLED
 * batteries) or fall back to "auto" which follows the OS preference via
 * `prefers-color-scheme`.
 *
 * The atlas map shell stays dark in all modes — it is an instrument and
 * the cartography contrast is intentional, not a theme leak.
 *
 * Persistence model:
 *   - URL query param `?theme=light|dark|auto` is the source of truth
 *     during the current session (so a shared link round-trips).
 *   - localStorage key `tc.theme` remembers the last explicit choice
 *     across sessions when the URL doesn't carry one.
 *   - First-paint initialization runs from `index.html` via this module to
 *     avoid a flash-of-light-mode on dark-preferring devices.
 */

export type ThemePreference = "auto" | "light" | "dark";
/** The actually-applied theme after resolving `auto` against the OS. */
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "tc.theme";
export const THEME_URL_PARAM = "theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

/**
 * Resolve the preferred theme from the URL → localStorage → "auto" chain.
 *
 * Pure: takes a URL-like search string and the optional persisted value, so
 * tests don't have to stub `window`. The runtime helpers below wrap this.
 */
export function resolveInitialTheme(
  search: string,
  persisted: string | null,
): ThemePreference {
  try {
    const params = new URLSearchParams(search);
    const fromUrl = params.get(THEME_URL_PARAM);
    if (isThemePreference(fromUrl)) return fromUrl;
  } catch {
    // Malformed URL: fall through to localStorage / default.
  }
  if (isThemePreference(persisted)) return persisted;
  return "auto";
}

/** Resolve a (preference, system-prefers-dark?) pair to the concrete theme. */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return prefersDark ? "dark" : "light";
}

/**
 * Apply a resolved theme to the document by toggling `data-theme` on
 * `<html>` and updating the `color-scheme` meta hint. Also writes a
 * matching `data-theme-preference` attribute so debugging tools can see
 * the original three-state preference.
 */
export function applyTheme(
  doc: Document,
  preference: ThemePreference,
  resolved: ResolvedTheme,
): void {
  const root = doc.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", preference);
  // `color-scheme` on the root affects native form controls + scrollbars.
  root.style.colorScheme = resolved;
}

/** Persist the explicit user choice across sessions. */
export function persistThemePreference(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  preference: ThemePreference,
): void {
  try {
    if (preference === "auto") {
      storage.removeItem(THEME_STORAGE_KEY);
    } else {
      storage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Quota / private-browsing — silently ignore; URL/runtime still works.
  }
}

/**
 * Browser-side getter for the current OS preference. Returns false on the
 * server / in environments without `matchMedia` so we don't crash.
 */
export function prefersDarkScheme(win: Window = window): boolean {
  if (typeof win === "undefined" || typeof win.matchMedia !== "function") {
    return false;
  }
  try {
    return win.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/**
 * Return the next preference in the round-robin order:
 *   auto → light → dark → auto → ...
 * Used by the segmented ThemeToggle's "cycle" affordance.
 */
export function nextThemePreference(curr: ThemePreference): ThemePreference {
  if (curr === "auto") return "light";
  if (curr === "light") return "dark";
  return "auto";
}
