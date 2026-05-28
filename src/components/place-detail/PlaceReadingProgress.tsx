/**
 * Thin progress bar that fills as the user scrolls through the dossier.
 * Mutates the bar's transform via DOM directly (refs, not state) to avoid
 * re-rendering on every scroll frame. Lives sticky at the very top edge
 * of the panel so it never competes with the dossier title for attention.
 *
 * A single rAF-throttled scroll listener keeps the cost a sub-millisecond
 * style-write per frame.
 */
import { useEffect, useRef } from "react";

export function PlaceReadingProgress({ panelRef }: { panelRef: { current: HTMLElement | null } }) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = panelRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max));
      bar.style.transform = `scaleX(${pct})`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [panelRef]);

  return (
    <div className="tc-detail-progress-track" aria-hidden="true">
      <div ref={barRef} className="tc-detail-progress-fill" />
    </div>
  );
}
