import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { PlaceNavItem } from "./place-detail-nav";

/**
 * On-this-page navigation: mobile horizontal snap strip; desktop sticky rail.
 * Optional `activeAnchorId` highlights the section nearest the reading line.
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

  useEffect(() => {
    if (activeAnchorId == null) return;
    const want = `#${activeAnchorId}`;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    const scrollLink = (root: HTMLElement | null, mobile: boolean) => {
      if (!root) return;
      const link = Array.from(root.querySelectorAll<HTMLAnchorElement>("a")).find(
        a => a.getAttribute("href") === want,
      );
      if (!link) return;
      if (mobile) {
        link.scrollIntoView({
          inline: reduceMotion ? "nearest" : "center",
          block: "nearest",
          behavior,
        });
      } else {
        link.scrollIntoView({
          inline: "nearest",
          block: reduceMotion ? "nearest" : "center",
          behavior,
        });
      }
    };
    scrollLink(mobileStripRef.current, true);
    scrollLink(desktopNavRef.current, false);
  }, [activeAnchorId, itemKey, reduceMotion]);

  if (items.length === 0) return null;

  const linkBase =
    "rounded-xl px-2.5 py-1.5 text-left transition-[background,border-color,color,box-shadow] duration-150 " +
    "text-[12.5px] leading-snug text-[color:var(--color-frost-strong)] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 " +
    "focus-visible:outline-[rgba(26,143,168,0.55)]";

  const mobileLink = `${linkBase} shrink-0 snap-start border border-[rgba(26,143,168,0.2)] bg-white/80 hover:bg-[rgba(232,248,252,0.95)] hover:border-[rgba(26,143,168,0.42)] hover:text-ice whitespace-nowrap shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]`;

  const desktopLink = `${linkBase} block w-full border border-transparent bg-transparent hover:bg-white/95 hover:border-[rgba(200,170,140,0.4)] hover:shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] hover:text-ice`;

  return (
    <>
      <nav
        className="lg:hidden tc-reading-nav-mobile mb-6"
        aria-label="On this page"
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone font-semibold mb-2 px-0.5">On this page</div>
        <div
          ref={mobileStripRef}
          className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]"
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
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone font-semibold mb-2.5 px-1">On this page</div>
        <ul className="space-y-1">
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
