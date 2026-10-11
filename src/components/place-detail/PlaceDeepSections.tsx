import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaceDeepSection } from "../../types";
import { useProse } from "../../lib/units";
import { detailScrollRoot, pickActiveSectionIndex } from "../../lib/detail-scroll-spy";
import { replaceDossierHash } from "../../lib/dossier-url-hash";
import { childOverflowsContainer, scrollChildIntoContainer } from "../../lib/scroll-within-container";
import { useReducedMotion } from "framer-motion";
import { BookOpen, ChevronDown } from "lucide-react";

const DEFAULT_OPEN_CHAPTERS = 2;

/** Short jump labels for derived appendix ids; curator sections fall back to trimmed title. */
function jumpLabelForSection(sec: PlaceDeepSection): string {
  const byId: Record<string, string> = {
    "appendix-season-pocket": "Rain year",
    "appendix-forces-atlas": "Mechanisms",
    "appendix-ground-garden": "Gardens",
    "appendix-scouting-diligence": "Homes",
  };
  if (byId[sec.id]) return byId[sec.id]!;
  if (/(?:^|-)site-history$/.test(sec.id)) return "History";
  // Shorten at a word boundary ("Why Mérida reads as…", not "Why Mérida reads a…").
  const t = sec.title.trim().replace(/\s+[—–-]\s+.*$/, "");
  if (t.length <= 22) return t;
  const cut = t.slice(0, 21);
  const space = t[21] === " " ? 21 : cut.lastIndexOf(" ");
  return `${(space >= 6 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "")}…`;
}

export const PlaceDeepSections = memo(function PlaceDeepSections({
  sections,
  hasBestMonthsGuide,
  syncDossierHash,
}: {
  sections: PlaceDeepSection[];
  /** When true, intro copy points readers at Best months for… to avoid repeating calendar advice. */
  hasBestMonthsGuide?: boolean;
  /** When false, skip writing `#deep-…` so we do not fight the main scroll-spy clearing the hash. */
  syncDossierHash?: boolean;
}) {
  const prose = useProse();
  const reduceMotion = useReducedMotion();
  const jumps = useMemo(() => sections.map(sec => ({ id: sec.id, label: jumpLabelForSection(sec) })), [sections]);
  const sectionIdsKey = useMemo(() => sections.map(s => s.id).join("\0"), [sections]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // The first two chapters (history, then the lead essay) open by default;
  // the rest are a click or a jump link away, which keeps the drawer short
  // enough for its scrollbar to stay controllable.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(sections.slice(0, DEFAULT_OPEN_CHAPTERS).map(s => s.id)));
  useEffect(() => {
    setOpenIds(prev => {
      const next = new Set(sections.slice(0, DEFAULT_OPEN_CHAPTERS).map(s => s.id));
      for (const id of prev) if (sections.some(s => s.id === id)) next.add(id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset per section set
  }, [sectionIdsKey]);
  const openChapter = useCallback((id: string) => {
    setOpenIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);
  const toggleChapter = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  // A shared #deep-… link opens its chapter.
  useEffect(() => {
    const m = /^#deep-(.+)$/.exec(window.location.hash);
    if (m && sections.some(s => s.id === m[1])) openChapter(m[1]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on section set change only
  }, [sectionIdsKey]);
  const jumpStripRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0);
  const hashDebounceRef = useRef(0);
  const syncHashRef = useRef(syncDossierHash !== false);
  syncHashRef.current = syncDossierHash !== false;
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const runSpy = useCallback(() => {
    const root = detailScrollRoot();
    if (!root || sections.length === 0) return;
    const els = sections
      .map(s => document.getElementById(`deep-${s.id}`))
      .filter((n): n is HTMLElement => Boolean(n));
    if (els.length === 0) return;
    const idx = pickActiveSectionIndex(root, els);
    const id = sections[idx]?.id;
    if (id && id !== activeIdRef.current) setActiveId(id);
  }, [sections]);

  useEffect(() => {
    const root = detailScrollRoot();
    if (!root || sections.length === 0) return;

    const first = sections[0]!.id;
    setActiveId(first);
    activeIdRef.current = first;

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
    // sectionIdsKey captures identity changes without depending on `sections`
    // reference churn; adding `sections` would re-bind listeners too often.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable sections via sectionIdsKey
  }, [runSpy, sectionIdsKey, sections.length]);

  const jumpScrollDebounceRef = useRef(0);
  useEffect(() => {
    if (!activeId || !jumpStripRef.current) return;
    if (jumpScrollDebounceRef.current) window.clearTimeout(jumpScrollDebounceRef.current);
    const id = activeId;
    jumpScrollDebounceRef.current = window.setTimeout(() => {
      jumpScrollDebounceRef.current = 0;
      const strip = jumpStripRef.current;
      if (!strip) return;
      const want = `#deep-${id}`;
      const link = Array.from(strip.querySelectorAll<HTMLAnchorElement>("a")).find(
        a => a.getAttribute("href") === want,
      );
      if (!link) return;
      if (!childOverflowsContainer(strip, link, "x")) return;
      scrollChildIntoContainer(strip, link, {
        axis: "x",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }, 80);

    return () => {
      if (jumpScrollDebounceRef.current) window.clearTimeout(jumpScrollDebounceRef.current);
    };
  }, [activeId, reduceMotion, sectionIdsKey]);

  useEffect(() => {
    if (!activeId || syncDossierHash === false) return;
    if (hashDebounceRef.current) window.clearTimeout(hashDebounceRef.current);
    let cancelled = false;
    hashDebounceRef.current = window.setTimeout(() => {
      hashDebounceRef.current = 0;
      if (cancelled || !syncHashRef.current) return;
      replaceDossierHash(activeId);
    }, 170);
    return () => {
      cancelled = true;
      if (hashDebounceRef.current) window.clearTimeout(hashDebounceRef.current);
    };
  }, [activeId, syncDossierHash]);

  if (sections.length === 0) return null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="place-deep-sections-heading"
    >
      <div className="detail-dossier-intro rounded-2xl border px-4 py-3.5 md:px-5 md:py-4">
        <div className="flex flex-wrap items-center gap-2 text-ice">
          <BookOpen className="w-4 h-4 shrink-0 text-stone opacity-80" aria-hidden />
          <h3 id="place-deep-sections-heading" className="font-atlas text-lg md:text-xl tracking-tight">
            Field dossier
          </h3>
        </div>
        <p className="text-[13px] md:text-sm text-stone-readable leading-relaxed mt-2 max-w-[52rem]">
          {hasBestMonthsGuide
            ? "The long read: the place's history and deeper stories first, then how its rain year runs, how the terrain shapes the climate, what grows, and what living here involves. For the best months to visit, see Best months for… further down."
            : "The long read: the place's history and deeper stories first, then how its rain year runs, how the terrain shapes the climate, what grows, and what living here involves."}
        </p>
        <p id="field-dossier-jump-scroll-hint" className="sr-only">
          Swipe or scroll horizontally to browse more field dossier chapters.
        </p>
        <nav
          ref={jumpStripRef}
          className="mt-3 flex flex-wrap gap-1.5 overflow-x-auto max-w-full pb-0.5 [scrollbar-width:thin] scroll-smooth"
          aria-label="Jump within field dossier"
          aria-describedby="field-dossier-jump-scroll-hint"
        >
          {jumps.map(j => {
            const isActive = activeId === j.id;
            return (
              <a
                key={j.id}
                href={`#deep-${j.id}`}
                className={`detail-dossier-jump ${isActive ? "detail-dossier-jump--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => openChapter(j.id)}
              >
                {j.label}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="detail-dossier-shell contain-paint">
        {sections.map((sec, idx) => {
          const chapterTitleId = `deep-${sec.id}-title`;
          const bodyId = `deep-${sec.id}-body`;
          const open = openIds.has(sec.id);
          return (
            <article
              key={sec.id}
              id={`deep-${sec.id}`}
              className="detail-dossier-chapter scroll-mt-28"
              data-open={open || undefined}
              aria-labelledby={chapterTitleId}
            >
              <header className="detail-dossier-chapter-head">
                <span className="detail-dossier-chapter-idx" aria-hidden>
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <h4
                  id={chapterTitleId}
                  className="detail-dossier-chapter-title font-atlas"
                  tabIndex={-1}
                  data-deep-chapter-title
                >
                  {sec.title}
                </h4>
                <button
                  type="button"
                  className="detail-dossier-chapter-toggle"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() => toggleChapter(sec.id)}
                >
                  <span>{open ? "Hide" : "Read"}</span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                  <span className="sr-only"> {sec.title}</span>
                </button>
              </header>
              {open ? (
                <div id={bodyId} className="detail-dossier-body space-y-3 text-[15px] leading-[1.78] text-[color:var(--color-frost-strong)] pl-0 md:pl-10">
                  {sec.paragraphs.map((p, i) => (
                    <p key={i} className={i === 0 ? "detail-deep-lead" : undefined}>{prose(p)}</p>
                  ))}
                </div>
              ) : (
                <p id={bodyId} className="detail-dossier-teaser pl-0 md:pl-10">
                  {prose(sec.paragraphs[0] ?? "")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
});
