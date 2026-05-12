import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import type { Place } from "../../types";
import { buildAtAGlanceTiles } from "../../lib/place-at-a-glance";
import { useUnits, fmtPrecip, fmtDelta, useProse } from "../../lib/units";

export function PlaceAtAGlance({ place, anchorId }: { place: Place; anchorId: string }) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const tiles = useMemo(
    () =>
      buildAtAGlanceTiles(
        place,
        mm => fmtPrecip(mm, dist),
        dC => fmtDelta(dC, temp, { signed: false }),
        temp,
      ),
    [place, dist, temp],
  );

  if (tiles.length === 0) return null;

  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in scroll-mt-28">
      <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
        <LayoutGrid className="w-4 h-4 shrink-0" style={{ color: "var(--color-glacier-500)" }} aria-hidden />
        At a glance
      </h3>
      <p className="text-[12px] text-stone-readable leading-relaxed mb-3.5 max-w-2xl">
        Use this as the profile&apos;s map legend: depth, place feel, climate class, confidence, water year, and atlas context, all computed from the same structured fields as the charts.
      </p>
      <div className="atlas-snapshot-wrap">
        <div className="atlas-snapshot-grid">
          {tiles.map((t, i) => (
            <div key={`${t.label}-${i}`} className="atlas-snapshot-tile" data-tone={t.tone}>
              <div className="atlas-snapshot-tile__label">{t.label}</div>
              <div className="atlas-snapshot-tile__value">{t.value}</div>
              {t.hint ? <div className="atlas-snapshot-tile__hint">{prose(t.hint)}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
