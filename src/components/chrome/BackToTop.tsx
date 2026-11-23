import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { prefersReducedMotion } from "../../lib/device-profile";

/** Appears once the reader is more than ~1.5 screens down the page. */
export function BackToTop({ hidden = false }: { hidden?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const next = window.scrollY > window.innerHeight * 1.5;
      setVisible(prev => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const shown = visible && !hidden;
  return (
    <button
      type="button"
      className="tc-back-to-top"
      data-visible={shown ? "true" : "false"}
      tabIndex={shown ? 0 : -1}
      aria-hidden={shown ? undefined : true}
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }}
    >
      <ArrowUp className="w-4 h-4" aria-hidden />
      <span>Top</span>
    </button>
  );
}
