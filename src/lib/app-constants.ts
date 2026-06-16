/**
 * Top-level app constants used by App.tsx and any extracted chrome /
 * explorer components. Centralising the search-input id + the
 * one-shot-pulse storage key here keeps cross-component references
 * stable (TopBar, FilterBar, the keyboard hook).
 */

/** DOM id of the Explorer search input. Used by the global "/" + ⌘K
 *  shortcut to focus the input from anywhere on the page. */
export const SEARCH_INPUT_ID = "terraclima-place-search";

/** localStorage key tracking whether the user has ever opened the
 *  shortcuts overlay. Used to suppress the first-run "?" pulse. */
export const SHORTCUTS_SEEN_KEY = "terraclima.shortcuts-seen.v1";

/** Mac shows ⌘; every other platform shows Ctrl. Detected once so keyboard-shortcut
 *  hints stay consistent across the inline tips and the shortcuts overlay. */
export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
/** Label for the Cmd/Ctrl modifier key on this platform (for shortcut keycaps). */
export const CMD_KEY_LABEL = IS_MAC ? "⌘" : "Ctrl";
/** Compact one-pill hint for the global search shortcut, e.g. "⌘K" / "Ctrl K". */
export const SEARCH_SHORTCUT_HINT = IS_MAC ? "⌘K" : "Ctrl K";

/** State of copy/share URL feedback shown by Explorer and Compare controls. */
export type ShareStatus = "idle" | "shared" | "copied" | "failed";
