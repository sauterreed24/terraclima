import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import type { PlaceNavItem } from "./place-detail-nav";
import { scrollDetailRootToSection } from "../../lib/detail-scroll-spy";
import { childOverflowsContainer, scrollChildIntoContainer } from "../../lib/scroll-within-container";

interface ChapterGroup {
  label: string;
  items: PlaceNavItem[];
}

function groupByChapter(items: PlaceNavItem[]): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) {
      last.items.push(item);
    } else {
      groups.push({ label: item.group, items: [item] });
    }
  }
  return groups;
}

/**
 * On-this-page navigation: mobile strip and desktop sticky list.
 *
 * Renders only the five dossier chapters at the top level; a chapter's
 * section links nest underneath it and are only present for the chapter
 * that is currently active (via scroll-spy) or was most recently opened —
 * every other chapter stays collapsed to a single link.
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
  const idPrefix = useId();

  const chapters = useMemo(() => groupByChapter(items), [items]);
  const chapterOfActive = useMemo(
    () => items.find(i => i.id === activeAnchorId)?.group ?? chapters[0]?.label ?? null,
    [items, activeAnchorId, chapters],
  );
  const [openOverride, setOpenOverride] = useState<string | null>(null);
  useEffect(() => {
    setOpenOverride(null);
  }, [activeAnchorId]);
  const openChapter = openOverride ?? chapterOfActive;

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
        if (!link || link.hidden) return;
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

  const onNavClick = useCallback((event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    if (scrollDetailRootToSection(id, { behavior: reduceMotion ? "auto" : "smooth" })) {
      event.preventDefault();
    }
  }, [reduceMotion]);

  const onChapterClick = useCallback((event: ReactMouseEvent<HTMLAnchorElement>, chapter: ChapterGroup) => {
    setOpenOverride(chapter.label);
    const target = chapter.items[0]?.id;
    if (target && scrollDetailRootToSection(target, { behavior: reduceMotion ? "auto" : "smooth" })) {
      event.preventDefault();
    }
  }, [reduceMotion]);

  if (items.length === 0) return null;

  const linkBase =
    "tc-reading-nav-link px-2.5 py-1.5 text-left text-[12.5px] leading-snug text-[color:var(--color-frost-strong)] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tc-focus-ring)]";

  const mobileLink = `${linkBase} shrink-0 snap-start whitespace-nowrap`;
  const desktopLink = `${linkBase} block w-full`;

  return (
    <>
      <nav
        className="lg:hidden tc-reading-nav-mobile mb-6"
        aria-label="On this page"
        aria-describedby="tc-reading-nav-mobile-scroll-hint"
      >
        <p id="tc-reading-nav-mobile-scroll-hint" className="sr-only">
          Swipe or scroll horizontally to browse more dossier chapters.
        </p>
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone mb-2 px-0.5">On this page</div>
        <div
          ref={mobileStripRef}
          className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]"
        >
          {chapters.map((chapter, chapterIdx) => {
            const chapterActive = chapter.label === chapterOfActive;
            const expanded = chapter.label === openChapter;
            const nestedId = `${idPrefix}-mobile-chapter-${chapterIdx}`;
            return (
              <div key={chapter.label} className="flex gap-1.5 shrink-0">
                <a
                  href={`#${chapter.items[0]!.id}`}
                  className={`${mobileLink} tc-reading-nav-chapter${chapterActive ? " tc-reading-nav-link--active" : ""}`}
                  onClick={event => onChapterClick(event, chapter)}
                  aria-current={chapterActive ? "location" : undefined}
                  aria-expanded={expanded}
                  aria-controls={nestedId}
                >
                  {chapter.label}
                </a>
                <div id={nestedId} className="flex gap-1.5 shrink-0" hidden={!expanded}>
                  {chapter.items.map(it => {
                    const isActive = activeAnchorId != null && activeAnchorId === it.id;
                    return (
                      <a
                        key={it.id}
                        href={`#${it.id}`}
                        className={`${mobileLink} tc-reading-nav-nested-link${isActive ? " tc-reading-nav-link--active" : ""}`}
                        onClick={event => onNavClick(event, it.id)}
                        aria-current={isActive ? "location" : undefined}
                        hidden={!expanded}
                      >
                        {it.label}
                      </a>
                    );
                  })}
                </div>
              </div>
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
          {chapters.map((chapter, chapterIdx) => {
            const chapterActive = chapter.label === chapterOfActive;
            const expanded = chapter.label === openChapter;
            const nestedId = `${idPrefix}-desktop-chapter-${chapterIdx}`;
            return (
              <li key={chapter.label}>
                <a
                  href={`#${chapter.items[0]!.id}`}
                  className={`${desktopLink} tc-reading-nav-chapter${chapterActive ? " tc-reading-nav-link--active" : ""}`}
                  onClick={event => onChapterClick(event, chapter)}
                  aria-current={chapterActive ? "location" : undefined}
                  aria-expanded={expanded}
                  aria-controls={nestedId}
                >
                  {chapter.label}
                </a>
                <ul id={nestedId} className="tc-reading-nav-nested" hidden={!expanded}>
                  {chapter.items.map(it => {
                    const isActive = activeAnchorId != null && activeAnchorId === it.id;
                    return (
                      <li key={it.id}>
                        <a
                          href={`#${it.id}`}
                          className={`${desktopLink} tc-reading-nav-nested-link${isActive ? " tc-reading-nav-link--active" : ""}`}
                          onClick={event => onNavClick(event, it.id)}
                          aria-current={isActive ? "location" : undefined}
                          hidden={!expanded}
                        >
                          {it.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
