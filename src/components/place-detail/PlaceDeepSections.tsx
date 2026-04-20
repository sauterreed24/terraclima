import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaceDeepSection } from "../../types";
import { useProse } from "../../lib/units";
import { detailScrollRoot, pickActiveSectionIndex } from "../../lib/detail-scroll-spy";
import { replaceDossierHash } from "../../lib/dossier-url-hash";
import { childOverflowsContainer, scrollChildIntoContainer } from "../../lib/scroll-within-container";
import { useReducedMotion } from "framer-motion";
import { BookOpen } from "lucide-react";

/** Short jump labels for derived appendix ids; curator sections fall back to trimmed title. */
function jumpLabelForSection(sec: PlaceDeepSection): string {
  const byId: Record<string, string> = {
    "appendix-season-pocket": "Rain year",
    "appendix-forces-atlas": "Mechanisms",
    "appendix-ground-garden": "Soil",
    "appendix-nearby-differences": "Nearby",
    "appendix-scouting-diligence": "Scouting",
  };
  if (byId[sec.id]) return byId[sec.id]!;
  const t = sec.title.trim();
  return t.length > 20 ? `${t.slice(0, 18)}…` : t;
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
      <div className="rounded-2xl border border-[rgba(200,170,140,0.38)] bg-[rgba(255,253,248,0.92)] px-4 py-3.5 md:px-5 md:py-4">
        <div className="flex flex-wrap items-center gap-2 text-ice">
          <BookOpen className="w-4 h-4 shrink-0 text-stone opacity-80" aria-hidden />
          <h3 id="place-deep-sections-heading" className="font-atlas text-lg md:text-xl tracking-tight">
            Field dossier
          </h3>
        </div>
        <p className="text-[11px] md:text-xs text-stone leading-relaxed mt-2 max-w-[52rem]">
          {hasBestMonthsGuide
            ? "If we have written a longer note for this stop, it runs first. What follows is the same backbone every profile carries: how rain and snow pile through the year, the terrain mechanisms we tagged, soil and yard in one pass, nearby contrasts when the record has them, then an honest closing on fit and risk. For trip or planting calendars, use Best months for… farther down so we are not redundant. Your °F / °C toggle applies throughout."
            : "If we have written a longer note for this stop, it runs first. What follows is the same backbone every profile carries: how rain and snow pile through the year, the terrain mechanisms we tagged, soil and yard in one pass, nearby contrasts when the record has them, then an honest closing on fit and risk. Your °F / °C toggle applies throughout."}
        </p>
        <nav
          ref={jumpStripRef}
          className="mt-3 flex flex-wrap gap-1.5 overflow-x-auto max-w-full pb-0.5 [scrollbar-width:thin] scroll-smooth"
          aria-label="Jump within field dossier"
        >
          {jumps.map(j => {
            const isActive = activeId === j.id;
            return (
              <a
                key={j.id}
                href={`#deep-${j.id}`}
                className={`detail-dossier-jump ${isActive ? "detail-dossier-jump--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
              >
                {j.label}
              </a>
            );
          })}
        </nav>
        <p className="mt-2 text-[10px] text-stone leading-relaxed">
          <span className="font-medium text-frost">Copy link</span> in the header passes this exact stop. If you stay over the dossier while you read, the URL may pick up a short{" "}
          <span className="font-mono-num text-frost/90">#deep-…</span>
          {" "}suffix for the chapter in view; scroll elsewhere and it falls away so the link stays shareable.
        </p>
      </div>

      <div className="detail-dossier-shell contain-paint">
        {sections.map((sec, idx) => (
          <article
            key={sec.id}
            id={`deep-${sec.id}`}
            className="detail-dossier-chapter scroll-mt-28"
          >
            <header className="detail-dossier-chapter-head">
              <span className="detail-dossier-chapter-idx" aria-hidden>
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <h4 className="detail-dossier-chapter-title font-atlas">{sec.title}</h4>
            </header>
            <div className="detail-dossier-body space-y-3 text-[15px] leading-[1.78] text-[color:var(--color-frost-strong)] pl-0 md:pl-10">
              {sec.paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? "detail-deep-lead" : undefined}>{prose(p)}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});
