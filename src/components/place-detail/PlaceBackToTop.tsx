/**
 * Floating "scroll to top" button for the place-detail drawer. Visible
 * only after the user has scrolled past ~480 px inside the panel (on a
 * narrow panel, only while scrolling back up). Scrolls
 * the panel's overflow container (not the page) because the panel is the
 * actual scroll host. A single rAF-throttled scroll listener keeps the
 * cost flat — visibility flips at most once per frame, then the button
 * sits idle until the user scrolls again.
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { prefersReducedMotion } from "../../lib/device-profile";

export function PlaceBackToTop({ panelRef }: { panelRef: { current: HTMLElement | null } }) {
  const [visible, setVisible] = useState(false);
  const label = "Scroll to top of place profile";

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let ticking = false;
    let lastTop = el.scrollTop;
    const update = () => {
      ticking = false;
      const top = el.scrollTop;
      // A narrow panel has no gutter, so the button would sit on the text.
      // There it shows only while you scroll back up, which is when you want it.
      const goingUp = top < lastTop - 4;
      const goingDown = top > lastTop + 4;
      if (goingUp || goingDown) lastTop = top;
      const narrow = el.clientWidth < 640;
      setVisible(prev => top > 480 && (!narrow || goingUp || (prev && !goingDown)));
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
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    el.scrollTo({ top: 0, behavior });
  }, [panelRef]);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="tc-detail-back-to-top"
      aria-label={label}
      title={label}
    >
      <ArrowUp className="w-4 h-4" aria-hidden />
    </button>
  );
}
