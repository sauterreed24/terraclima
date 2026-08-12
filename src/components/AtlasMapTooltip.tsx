import { memo, type CSSProperties } from "react";
import type { MicroclimateArchetype, Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { fmtPrecip, fmtTemp, useUnits } from "../lib/units";
import { getAnnualPrecipMm, meanSummerHigh } from "../lib/climate-metrics";

function archetypeLabel(id: MicroclimateArchetype): string {
  return ARCHETYPE_BY_ID[id]?.label ?? id;
}

function toneToDataTone(t: string): "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora" {
  if (t === "sage" || t === "ochre" || t === "ember" || t === "ice" || t === "aurora") return t;
  return "glacier";
}

/**
 * Compact glance for map pin hover/focus. Name, archetype, one climate line.
 * Click/tap still opens the dossier; shortlist stays on modifier-click / P.
 */
export const AtlasMapTooltip = memo(function AtlasMapTooltip({
  place,
  xPct,
  yPct,
  mapWidth,
  featuredRank,
  featuredLabel,
}: {
  place: Place;
  xPct: number;
  yPct: number;
  mapWidth: number;
  featuredRank?: number;
  featuredLabel?: string;
}) {
  const { temp, dist } = useUnits();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const dataTone = toneToDataTone(tone);

  const compactMap = mapWidth < 420;
  const onRight = (100 - xPct) >= xPct;
  const onTop = yPct >= (100 - yPct);
  const horizontal = onRight ? "right" : "left";
  const vertical = onTop ? "above" : "below";
  const availableHeightPct = onTop ? yPct : 100 - yPct;
  const style: CSSProperties = {
    left: compactMap ? "0.5rem" : `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${compactMap ? "0" : onRight ? "12px" : "calc(-100% - 12px)"}, ${onTop ? "calc(-100% - 10px)" : "10px"})`,
    width: compactMap ? "calc(100% - 1rem)" : undefined,
    maxWidth: compactMap ? "calc(100% - 1rem)" : "min(18rem, calc(100vw - 1rem))",
    ["--tc-map-hover-max-height" as string]: `calc(${availableHeightPct}% - 1.25rem)`,
  };

  const countryLabel =
    place.country === "USA" ? "US" : place.country === "Canada" ? "CA" : "MX";
  const featuredLine = featuredRank && featuredLabel
    ? `Rank #${featuredRank} by ${featuredLabel}`
    : featuredRank
      ? `Rank #${featuredRank}`
      : null;
  const climateLine = `${fmtTemp(meanSummerHigh(place), temp)} summers · ${fmtPrecip(getAnnualPrecipMm(place), dist)}`;

  return (
    <div
      role="tooltip"
      id="tc-map-hover-preview"
      aria-labelledby="tc-map-hover-title"
      className="tc-map-hover-card tc-map-hover-card--compact tc-map-hover-card-enter absolute w-[min(18rem,calc(100vw-1.25rem))] pointer-events-none z-10 text-left shadow-2xl"
      data-tone={dataTone}
      data-variant="compact"
      data-horizontal={horizontal}
      data-vertical={vertical}
      style={style}
    >
      <header className="tc-map-hover-card__hero">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="tc-map-hover-meta-row">
              <span>{countryLabel}</span>
            </div>
            <h2 id="tc-map-hover-title" className="tc-map-hover-title font-atlas text-[1.02rem] leading-tight mt-1">
              {place.name}
            </h2>
          </div>
          <span className="chip shrink-0 max-w-[7.5rem] text-center leading-snug text-[0.62rem]" data-tone={tone}>
            {archetypeLabel(place.archetypes[0])}
          </span>
        </div>
        {featuredLine ? (
          <div className="tc-map-hover-rankline" aria-label={featuredLine}>
            <span>{featuredLine}</span>
          </div>
        ) : null}
      </header>
      <div className="tc-map-hover-card__body tc-map-hover-card__body--compact">
        <p className="tc-map-hover-climate-line" aria-label="Quick climate read">
          {climateLine}
        </p>
      </div>
    </div>
  );
});
