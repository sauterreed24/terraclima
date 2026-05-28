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

/** State of the "copy current view" UX. */
export type ShareStatus = "idle" | "copied" | "failed";
