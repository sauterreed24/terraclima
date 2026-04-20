import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { detailScrollRoot, pickActiveSectionIndex } from "../lib/detail-scroll-spy";

/**
 * Tracks which `id` from `navDomIds` is nearest the reading line while the
 * user scrolls the place detail panel.
 */
export function useDetailReadingSpy(navDomIds: readonly string[]): string | null {
  const key = useMemo(() => navDomIds.join("\0"), [navDomIds]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  const runSpy = useCallback(() => {
    const root = detailScrollRoot();
    if (!root || navDomIds.length === 0) return;
    const pairs = navDomIds
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter((x): x is { id: string; el: HTMLElement } => x.el instanceof HTMLElement);
    if (pairs.length === 0) return;
    const idx = pickActiveSectionIndex(
      root,
      pairs.map(p => p.el),
    );
    const id = pairs[idx]?.id;
    if (id && id !== activeRef.current) setActiveId(id);
  }, [navDomIds]);

  useEffect(() => {
    const root = detailScrollRoot();
    if (!root || navDomIds.length === 0) return;

    const pairs = navDomIds
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter((x): x is { id: string; el: HTMLElement } => x.el instanceof HTMLElement);
    const first = pairs[0]?.id ?? navDomIds[0] ?? null;
    setActiveId(first);
    activeRef.current = first;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        runSpy();
      });
    };

    runSpy();
    root.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    ro?.observe(root);

    return () => {
      root.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [key, runSpy]);

  return activeId;
}
