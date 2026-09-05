import { useEffect, useState, type RefObject } from "react";
import { ArrowUp, Map } from "lucide-react";
import { prefersReducedMotion } from "../lib/device-profile";

/** A return path from the long virtualized list, beside the mobile Filters pill. */
export function ExplorerBackToMap({ mapRef }: { mapRef: RefObject<HTMLDivElement | null> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible((mapRef.current?.getBoundingClientRect().bottom ?? 0) < -80);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [mapRef]);

  if (!visible) return null;
  return (
    <button type="button" className="tc-back-to-map" aria-label="Back to atlas map" title="Back to atlas map"
      onClick={() => {
        const map = mapRef.current;
        if (!map) return;
        map.focus({ preventScroll: true });
        map.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }}>
      <ArrowUp className="w-4 h-4" aria-hidden />
      <Map className="w-4 h-4" aria-hidden />
      <span>Map</span>
    </button>
  );
}
