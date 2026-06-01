import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

/**
 * Roving-tabindex + arrow-key navigation for a flat group of controls (e.g. a
 * wrapped row of filter chips). Exactly one item is in the Tab order at a time,
 * and Left/Right (plus Home/End) move focus within the group — so Tab steps to
 * the *next* group instead of walking through every chip. This mirrors the
 * atlas map's pin roving model and follows the WAI-ARIA toolbar/group pattern.
 *
 * Usage: call once per group with its item count, give the wrapping container
 * `role="group"` + an `aria-label`, and spread `getItemProps(index)` onto each
 * focusable item (it provides `ref`, `tabIndex`, `onFocus`, `onKeyDown`).
 *
 * Up/Down are intentionally left to the browser so a scrollable group (e.g. the
 * archetype list) still scrolls; focusing an off-screen item scrolls it into
 * view automatically.
 */
export function useRovingTabIndex(count: number) {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Keep the active index valid if the group ever shrinks.
  useEffect(() => {
    if (count > 0 && active > count - 1) setActive(count - 1);
  }, [count, active]);

  const focusItem = useCallback(
    (index: number) => {
      if (count <= 0) return;
      const next = ((index % count) + count) % count;
      setActive(next);
      itemRefs.current[next]?.focus();
    },
    [count],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === active ? 0 : -1,
      onFocus: () => setActive(index),
      onKeyDown: (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            focusItem(index + 1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            focusItem(index - 1);
            break;
          case "Home":
            e.preventDefault();
            focusItem(0);
            break;
          case "End":
            e.preventDefault();
            focusItem(count - 1);
            break;
          default:
            break;
        }
      },
    }),
    [active, count, focusItem],
  );

  return { getItemProps };
}
