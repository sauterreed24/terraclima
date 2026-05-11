// ============================================================
// use-keyboard-shortcuts — global shortcuts for Terraclima
// ============================================================
// Pulled out of App.tsx so the shortcut surface is one focused
// hook instead of a 70-line useEffect mid-component. Behaviour
// is unchanged from the previous in-component implementation.
// ============================================================

import { useEffect } from "react";

export type ShortcutView = "explorer" | "trips" | "collections" | "learn";

export interface KeyboardShortcutDeps {
  view: ShortcutView;
  showShortcuts: boolean;
  compareOpen: boolean;
  selectedId: string | null;
  explorerDockLg: boolean;
  /** True only on the Explorer view; outside Explorer we still honour `?` and `Escape`. */
  setView: (view: ShortcutView) => void;
  setShowShortcuts: (open: boolean | ((prev: boolean) => boolean)) => void;
  setCompareOpen: (open: boolean) => void;
  closeDetail: () => void;
  /** Focus the search input by id, opening the filter sheet on narrow screens. */
  focusSearchInput: () => void;
  /** Open the mobile filter sheet (no-op on desktop dock). */
  openFilterSheet: () => void;
  /**
   * Random-place callback. Returns true when a place was opened, false when
   * the pool was empty. Caller can show feedback when false.
   */
  pickRandomPlace: () => boolean;
  /** Optional hook for "no random pick available" UX feedback. */
  onRandomEmpty?: () => void;
  /**
   * Toggle the bookmark state of the currently-selected place. No-op when
   * nothing is selected — the shortcut hint silently does nothing rather
   * than throwing or showing UI noise.
   */
  toggleBookmarkSelected?: () => void;
}

/**
 * Wires the global shortcut handler. Idempotent across re-mounts; safe to
 * use from a single top-level component.
 */
export function useKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
  const {
    view,
    showShortcuts,
    compareOpen,
    selectedId,
    explorerDockLg,
    setView,
    setShowShortcuts,
    setCompareOpen,
    closeDetail,
    focusSearchInput,
    openFilterSheet,
    pickRandomPlace,
    onRandomEmpty,
    toggleBookmarkSelected,
  } = deps;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowShortcuts(s => !s);
          break;
        case "Escape": {
          if (showShortcuts) { e.preventDefault(); setShowShortcuts(false); break; }
          if (compareOpen) { e.preventDefault(); setCompareOpen(false); break; }
          const filterDlg = document.getElementById("tc-explorer-filter-sheet") as HTMLDialogElement | null;
          if (filterDlg?.open) { e.preventDefault(); filterDlg.close(); break; }
          const siteMenuDlg = document.getElementById("tc-site-menu") as HTMLDialogElement | null;
          if (siteMenuDlg?.open) { e.preventDefault(); siteMenuDlg.close(); break; }
          if (selectedId) { e.preventDefault(); closeDetail(); break; }
          break;
        }
        case "e": case "E": setView("explorer"); break;
        case "t": case "T": setView("trips"); break;
        case "c": case "C": setView("collections"); break;
        case "l": case "L": setView("learn"); break;
        case "/": {
          e.preventDefault();
          setView("explorer");
          requestAnimationFrame(() => {
            if (!explorerDockLg) openFilterSheet();
            requestAnimationFrame(focusSearchInput);
          });
          break;
        }
        case "f": case "F": {
          if (explorerDockLg || view !== "explorer") break;
          e.preventDefault();
          openFilterSheet();
          break;
        }
        case "r": case "R": {
          e.preventDefault();
          setView("explorer");
          requestAnimationFrame(() => {
            const ok = pickRandomPlace();
            if (!ok) onRandomEmpty?.();
          });
          break;
        }
        case "b": case "B": {
          // Only meaningful when a place is open — there's nothing to pin
          // otherwise. Avoids hijacking the keystroke on the index views.
          if (!selectedId || !toggleBookmarkSelected) break;
          e.preventDefault();
          toggleBookmarkSelected();
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    view, showShortcuts, compareOpen, selectedId, explorerDockLg,
    setView, setShowShortcuts, setCompareOpen, closeDetail,
    focusSearchInput, openFilterSheet, pickRandomPlace, onRandomEmpty,
    toggleBookmarkSelected,
  ]);
}
