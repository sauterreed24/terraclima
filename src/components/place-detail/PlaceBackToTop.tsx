/**
 * Floating "scroll to top" button for the place-detail drawer. Visible
 * only after the user has scrolled past ~480 px inside the panel. Scrolls
 * the panel's overflow container (not the page) because the panel is the
 * actual scroll host. A single rAF-throttled scroll listener keeps the
 * cost flat — visibility flips at most once per frame, then the button
 * sits idle until the user scrolls again.
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function PlaceBackToTop({ panelRef }: { panelRef: { current: HTMLElement | null } }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      setVisible(el.scrollTop > 480);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [panelRef]);

  const onClick = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const behavior: ScrollBehavior =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
    el.scrollTo({ top: 0, behavior });
  }, [panelRef]);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="tc-detail-back-to-top"
      aria-label="Scroll to top of place profile"
      title="Back to top"
    >
      <ArrowUp className="w-4 h-4" aria-hidden />
    </button>
  );
}
