import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  '[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function listFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(el => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return true;
  });
}

/**
 * Keeps keyboard Tab cycling inside `containerRef` while `active` is true.
 * Pair with an explicit initial focus (e.g. close button) when opening a modal.
 *
 * When `restoreFocus` is true, the element focused at activation time is
 * captured and refocused when the trap tears down — so closing a modal returns
 * keyboard/screen-reader users to the control that opened it instead of
 * dropping focus to `<body>`. Leave it false for modals that already restore
 * focus elsewhere (e.g. PlaceDetail) or native `<dialog>`s (the browser does it).
 *
 * Call this hook *before* the effect that moves initial focus into the modal so
 * the captured "previously focused" element is the opener, not an in-modal node.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  restoreFocus = false,
): void {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;
    const previouslyFocused = restoreFocus ? (document.activeElement as HTMLElement | null) : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = listFocusables(root);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const cur = document.activeElement as Node | null;

      if (!root.contains(cur)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey) {
        if (cur === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (cur === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      // Restore focus to the opener only if focus is still inside the closing
      // modal (or already lost to <body>). If the user moved focus elsewhere, or
      // something else already handled restoration, don't steal it back.
      if (!previouslyFocused || !previouslyFocused.isConnected) return;
      const current = document.activeElement;
      if (current === null || current === document.body || root.contains(current)) {
        try { previouslyFocused.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    };
  }, [active, containerRef, restoreFocus]);
}
