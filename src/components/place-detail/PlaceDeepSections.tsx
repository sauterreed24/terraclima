import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaceDeepSection } from "../../types";
import { useProse } from "../../lib/units";
import { detailScrollRoot, pickActiveSectionIndex } from "../../lib/detail-scroll-spy";
import { replaceDossierHash } from "../../lib/dossier-url-hash";
import { useReducedMotion } from "framer-motion";
import { ListTree, Share2 } from "lucide-react";

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

  useEffect(() => {
    if (!activeId || !jumpStripRef.current) return;
    const strip = jumpStripRef.current;
    const want = `#deep-${activeId}`;
    const link = Array.from(strip.querySelectorAll<HTMLAnchorElement>("a")).find(
      a => a.getAttribute("href") === want,
    );
    if (!link) return;
    link.scrollIntoView({
      inline: reduceMotion ? "nearest" : "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
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
      <div className="detail-dossier-hero rounded-2xl border border-[rgba(26,143,168,0.22)] bg-gradient-to-br from-[rgba(232,248,252,0.55)] via-white/90 to-[rgba(255,252,247,0.98)] px-4 py-3.5 md:px-5 md:py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="flex flex-wrap items-center gap-2 text-ice">
          <ListTree className="w-4 h-4 shrink-0 text-glacier-500" aria-hidden />
          <h3 id="place-deep-sections-heading" className="font-atlas text-lg md:text-xl tracking-tight">
            Field dossier
          </h3>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone font-semibold ml-0.5">stacked read</span>
        </div>
        <p className="text-[11px] md:text-xs text-stone leading-relaxed mt-2 max-w-[52rem]">
          {hasBestMonthsGuide
            ? "Curator essays run first when we have them. The chapters below share one spine — season shape, drivers, soil pocket, neighbourhood contrasts if present, scouting wrap — all from fields on this page. Calendar-style when-to-visit-or-plant windows live in Best months for… so we do not say it twice. Temperatures and distances follow your °F / °C toggle."
            : "Curator essays run first when we have them. The chapters below share one spine — season shape, drivers, soil pocket, neighbourhood contrasts if present, scouting wrap — all from fields on this page. Temperatures and distances follow your °F / °C toggle."}
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
        <p className="mt-2.5 flex items-start gap-1.5 text-[10px] text-stone">
          <Share2 className="w-3 h-3 shrink-0 opacity-70 mt-0.5" aria-hidden />
          <span>
            Sending this stop to a planner or neighbour? Use <span className="font-medium text-frost">Copy link</span> in the drawer header — it captures the exact place. While the dossier block stays on screen, the address bar quietly picks up a{" "}
            <span className="font-mono-num text-[10px] text-frost/90">#deep-…</span>
            {" "}fragment for the chapter in view; leaving that section strips it so <span className="font-mono-num text-[10px] text-frost/90">?p=</span> links stay tidy.
          </span>
        </p>
      </div>

      <div className="detail-dossier-shell contain-paint">
        {sections.map((sec, idx) => (
          <article
            key={sec.id}
            id={`deep-${sec.id}`}
            className="detail-dossier-chapter scroll-mt-28"
            data-chapter-index={idx % 6}
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
