import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { PlaceNavItem } from "./place-detail-nav";
import { childOverflowsContainer, scrollChildIntoContainer } from "../../lib/scroll-within-container";

/**
 * On-this-page navigation: mobile strip and desktop sticky list.
 * Active section is indicated typographically; strip scroll never touches the drawer.
 */
export function PlaceDetailReadingNav({
  items,
  activeAnchorId,
}: {
  items: PlaceNavItem[];
  activeAnchorId?: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const mobileStripRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const itemKey = useMemo(() => items.map(i => i.id).join("\0"), [items]);
  const debounceRef = useRef(0);

  useEffect(() => {
    if (activeAnchorId == null) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const id = activeAnchorId;
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = 0;
      const want = `#${id}`;
      const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

      const run = (root: HTMLElement | null, axis: "x" | "y") => {
        if (!root) return;
        const link = Array.from(root.querySelectorAll<HTMLAnchorElement>("a")).find(
          a => a.getAttribute("href") === want,
        );
        if (!link) return;
        if (!childOverflowsContainer(root, link, axis)) return;
        scrollChildIntoContainer(root, link, { axis, behavior });
      };

      run(mobileStripRef.current, "x");
      run(desktopNavRef.current, "y");
    }, 140);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [activeAnchorId, itemKey, reduceMotion]);

  if (items.length === 0) return null;

  const linkBase =
    "rounded-lg px-2.5 py-1.5 text-left transition-[background-color,color,box-shadow] duration-150 " +
    "text-[12.5px] leading-snug text-[color:var(--color-frost-strong)] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 " +
    "focus-visible:outline-[rgba(26,143,168,0.45)]";

  const mobileLink =
    `${linkBase} shrink-0 snap-start border border-[rgba(200,170,140,0.35)] bg-white/85 ` +
    "hover:bg-white hover:border-[rgba(200,170,140,0.5)] hover:text-ice whitespace-nowrap";

  const desktopLink =
    `${linkBase} block w-full border border-transparent bg-transparent ` +
    "hover:bg-white/80 hover:border-[rgba(200,170,140,0.35)] hover:text-ice";

  return (
    <>
      <nav
        className="lg:hidden tc-reading-nav-mobile mb-6"
        aria-label="On this page"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone mb-2 px-0.5">On this page</div>
        <div
          ref={mobileStripRef}
          className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]"
        >
          {items.map(it => {
            const isActive = activeAnchorId != null && activeAnchorId === it.id;
            return (
              <a
                key={it.id}
                href={`#${it.id}`}
                className={`${mobileLink}${isActive ? " tc-reading-nav-link--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
              >
                {it.label}
              </a>
            );
          })}
        </div>
      </nav>
      <nav
        ref={desktopNavRef}
        className="hidden lg:block sticky top-6 self-start max-h-[min(72vh,calc(100vh-5rem))] overflow-y-auto overscroll-contain tc-reading-nav-desktop"
        aria-label="On this page"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone mb-2.5 px-1">On this page</div>
        <ul className="space-y-0.5">
          {items.map(it => {
            const isActive = activeAnchorId != null && activeAnchorId === it.id;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  className={`${desktopLink}${isActive ? " tc-reading-nav-link--active" : ""}`}
                  aria-current={isActive ? "location" : undefined}
                >
                  {it.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
