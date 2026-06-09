// ============================================================
// use-keyboard-shortcuts — global shortcuts for Terraclima
// ============================================================
// Pulled out of App.tsx so the shortcut surface is one focused
// hook instead of a 70-line useEffect mid-component. The handler
// reads the latest dep values through a ref so the listener is
// installed exactly once per mount instead of churning on every
// view / overlay / selection change.
// ============================================================

import { useEffect, useRef } from "react";

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
  /**
   * Set / clear the currently-selected place as the home-base climate
   * anchor. Same no-op-when-nothing-selected contract as the bookmark
   * toggle.
   */
  toggleHomeBaseSelected?: () => void;
  /**
   * Id of the global Explorer search input. When Escape is pressed inside
   * this input with a non-empty value (and no overlay is in the way), the
   * search is cleared as a final convenience instead of being a no-op.
   */
  searchInputId?: string;
  /** Called by the Esc-clear-search convenience. Should reset filters.search to "". */
  clearSearch?: () => void;
}

/**
 * Wires the global shortcut handler. Idempotent across re-mounts; safe to
 * use from a single top-level component.
 *
 * Implementation note: the listener captures a `depsRef` rather than the
 * deps directly, so React state changes (open overlay, new selection, view
 * switch) don't tear down and re-install the global keydown listener every
 * render. The ref is updated synchronously during render, which is the
 * standard React pattern for "always-fresh closure over the latest props".
 */
export function useKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    const isDialogOpen = (id: string): boolean =>
      Boolean((document.getElementById(id) as HTMLDialogElement | null)?.open);
    const onKey = (e: KeyboardEvent) => {
      const d = depsRef.current;
      // Cmd/Ctrl+K — modern search-focus shortcut. Works even from inside
      // a text input (matches GitHub / Linear / Notion / Slack behaviour),
      // so we let it bypass the usual modifier and text-entry bail-outs.
      const isCmdK =
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        !e.shiftKey &&
        (e.key === "k" || e.key === "K");

      if ((e.ctrlKey || e.metaKey || e.altKey) && !isCmdK) return;

      // Escape must stay available even when a focused input owns the event.
      if (e.key === "Escape") {
        if (d.showShortcuts) { e.preventDefault(); d.setShowShortcuts(false); return; }
        if (d.compareOpen) { e.preventDefault(); d.setCompareOpen(false); return; }
        const filterDlg = document.getElementById("tc-explorer-filter-sheet") as HTMLDialogElement | null;
        if (filterDlg?.open) { e.preventDefault(); filterDlg.close(); return; }
        const siteMenuDlg = document.getElementById("tc-site-menu") as HTMLDialogElement | null;
        if (siteMenuDlg?.open) { e.preventDefault(); siteMenuDlg.close(); return; }
        if (d.selectedId) { e.preventDefault(); d.closeDetail(); return; }
        // Final fallback: when nothing else is open and the user is mid-search,
        // clear the input so a fresh query can be typed without manual backspacing.
        // Keeps focus on the input — the typical pattern for "reset this field".
        if (d.searchInputId && d.clearSearch) {
          const active = document.activeElement as (HTMLInputElement | HTMLTextAreaElement | null);
          const value = active && "value" in active ? active.value : "";
          if (active?.id === d.searchInputId && value && value.length > 0) {
            e.preventDefault();
            d.clearSearch();
            return;
          }
        }
        return;
      }

      const tgt = e.target as HTMLElement | null;
      const inTextEntry = Boolean(
        tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable),
      );
      // Cmd/Ctrl+K is a deliberately global shortcut — let it through even
      // when a text input has focus.
      if (!isCmdK && inTextEntry) return;

      // Help and the bookmark toggle stay available even while a modal owns the
      // screen, but still avoid hijacking text entry.
      if (e.key === "?") {
        e.preventDefault();
        d.setShowShortcuts(s => !s);
        return;
      }
      if (e.key === "b" || e.key === "B") {
        // Only meaningful when a place is open — there's nothing to pin
        // otherwise. Avoids hijacking the keystroke on the index views.
        if (!d.selectedId || !d.toggleBookmarkSelected) return;
        e.preventDefault();
        d.toggleBookmarkSelected();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        // Mirror of B: set / clear the open place as the home-base anchor.
        if (!d.selectedId || !d.toggleHomeBaseSelected) return;
        e.preventDefault();
        d.toggleHomeBaseSelected();
        return;
      }

      // View-switch and search shortcuts must not mutate the view hidden behind
      // an open overlay. Suppress them whenever a modal/dialog owns the screen,
      // so a stray keystroke can't silently swap the view under a place profile,
      // compare panel, filter sheet, site menu, or shortcuts dialog.
      const overlayOpen =
        d.showShortcuts ||
        d.compareOpen ||
        d.selectedId !== null ||
        isDialogOpen("tc-explorer-filter-sheet") ||
        isDialogOpen("tc-site-menu");
      if (overlayOpen) return;

      if (isCmdK) {
        e.preventDefault();
        d.setView("explorer");
        requestAnimationFrame(() => {
          if (!d.explorerDockLg) d.openFilterSheet();
          requestAnimationFrame(d.focusSearchInput);
        });
        return;
      }

      switch (e.key) {
        case "e": case "E": d.setView("explorer"); break;
        case "t": case "T": d.setView("trips"); break;
        case "c": case "C": d.setView("collections"); break;
        case "l": case "L": d.setView("learn"); break;
        case "/": {
          e.preventDefault();
          d.setView("explorer");
          requestAnimationFrame(() => {
            if (!d.explorerDockLg) d.openFilterSheet();
            requestAnimationFrame(d.focusSearchInput);
          });
          break;
        }
        case "f": case "F": {
          if (d.explorerDockLg || d.view !== "explorer") break;
          e.preventDefault();
          d.openFilterSheet();
          break;
        }
        case "r": case "R": {
          e.preventDefault();
          d.setView("explorer");
          requestAnimationFrame(() => {
            const ok = d.pickRandomPlace();
            if (!ok) d.onRandomEmpty?.();
          });
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
