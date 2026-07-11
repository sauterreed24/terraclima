import { memo, type CSSProperties } from "react";
import type { MicroclimateArchetype, Place, TopographicDriver } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { fmtPrecip, fmtTemp, useProse, useUnits } from "../lib/units";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "../lib/climate-metrics";
import { useRichVisualEffects } from "../lib/device-profile";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";

function formatDriver(d: TopographicDriver): string {
  return d
    .split("-")
    .map(part => (part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function archetypeLabel(id: MicroclimateArchetype): string {
  return ARCHETYPE_BY_ID[id]?.label ?? id;
}

function toneToDataTone(t: string): "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora" {
  if (t === "sage" || t === "ochre" || t === "ember" || t === "ice" || t === "aurora") return t;
  return "glacier";
}

/**
 * Compact scout peek for map pin hover/focus. Answers “what kind of climate
 * is this?” — scores and scouting stay in the dossier.
 */
export const AtlasMapTooltip = memo(function AtlasMapTooltip({
  place,
  xPct,
  yPct,
  mapWidth,
  featuredRank,
  featuredLabel,
  variant = "full",
}: {
  place: Place;
  xPct: number;
  yPct: number;
  mapWidth: number;
  featuredRank?: number;
  featuredLabel?: string;
  variant?: "compact" | "full";
}) {
  const richEffects = useRichVisualEffects();
  const { temp, dist } = useUnits();
  const prose = useProse();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const dataTone = toneToDataTone(tone);
  const drivers = place.drivers.slice(0, 2).map(formatDriver);

  const compactMap = mapWidth < 420;
  // Prefer the quadrant with more free space so the card covers less map.
  const onRight = (100 - xPct) >= xPct;
  const onTop = yPct >= (100 - yPct);
  const availableHeightPct = onTop ? yPct : 100 - yPct;
  const style: CSSProperties = {
    left: compactMap ? "0.5rem" : `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${compactMap ? "0" : onRight ? "12px" : "calc(-100% - 12px)"}, ${onTop ? "calc(-100% - 10px)" : "10px"})`,
    width: compactMap ? "calc(100% - 1rem)" : undefined,
    maxWidth: compactMap ? "calc(100% - 1rem)" : "min(19rem, calc(100vw - 1rem))",
    ["--tc-map-hover-max-height" as string]: `calc(${availableHeightPct}% - 1rem)`,
  };

  const countryLabel =
    place.country === "USA" ? "US" : place.country === "Canada" ? "CA" : "MX";
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";
  const featuredLine = featuredRank && featuredLabel
    ? `Rank #${featuredRank} by ${featuredLabel}`
    : featuredRank
      ? `Rank #${featuredRank}`
      : null;
  const locationLine = [place.municipality && place.municipality !== place.name ? place.municipality : null, place.region]
    .filter(Boolean)
    .join(" · ");
  const gist = place.whyDistinct || place.summaryShort;

  if (variant === "compact") {
    return (
      <div
        role="tooltip"
        id="tc-map-hover-preview"
        aria-labelledby="tc-map-hover-title"
        className="tc-map-hover-card tc-map-hover-card--compact absolute w-[min(18rem,calc(100vw-1.25rem))] pointer-events-none anim-fade-in z-10 text-left shadow-2xl"
        data-tone={dataTone}
        data-variant="compact"
        style={style}
      >
        <header className="tc-map-hover-card__hero">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="tc-map-hover-meta-row">
                <span>{tierLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{countryLabel}</span>
              </div>
              <h2 id="tc-map-hover-title" className="tc-map-hover-title font-atlas text-[1.02rem] leading-tight mt-1">
                {place.name}
              </h2>
              {locationLine ? (
                <p className="tc-map-hover-subline text-[0.68rem] leading-snug font-medium mt-0.5">
                  {locationLine}
                </p>
              ) : null}
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
          <div className="tc-map-hover-compact-metrics" aria-label="Quick climate read">
            <InstrumentMetric label="JJA high" value={fmtTemp(meanSummerHigh(place), temp)} tone="ochre" />
            <InstrumentMetric label="Jan low" value={fmtTemp(meanJanLow(place), temp)} tone="glacier" />
            <InstrumentMetric label="Precip" value={fmtPrecip(getAnnualPrecipMm(place), dist)} tone="sage" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="tooltip"
      id="tc-map-hover-preview"
      aria-labelledby="tc-map-hover-title"
      className="tc-map-hover-card absolute w-[min(19rem,calc(100vw-1.25rem))] pointer-events-none anim-fade-in z-10 text-left shadow-2xl"
      data-tone={dataTone}
      data-variant="full"
      style={style}
    >
      <header className="tc-map-hover-card__hero">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="tc-map-hover-meta-row">
              <span>{tierLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{countryLabel}</span>
            </div>
            <h2 id="tc-map-hover-title" className="tc-map-hover-title font-atlas text-[1.05rem] leading-tight mt-1">
              {place.name}
            </h2>
            {locationLine ? (
              <p className="tc-map-hover-subline text-[0.68rem] leading-snug font-medium mt-0.5">
                {locationLine}
              </p>
            ) : null}
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

      <div className="tc-map-hover-card__body">
        <section className="tc-map-hover-section tc-map-hover-section--flush" aria-label="Climate snapshot">
          <h3 className="tc-map-hover-kicker">Climate snapshot</h3>
          <div className="tc-map-hover-instrument">
            <div className="tc-map-hover-instrument__strip" style={richEffects ? { filter: "saturate(1.08)" } : undefined}>
              <MiniClimateStrip place={place} height={22} />
            </div>
            <div className="tc-map-hover-instrument__metrics">
              <InstrumentMetric label="JJA high" value={fmtTemp(meanSummerHigh(place), temp)} tone="ochre" />
              <InstrumentMetric label="Jan low" value={fmtTemp(meanJanLow(place), temp)} tone="glacier" />
              <InstrumentMetric label="Annual precip" value={fmtPrecip(getAnnualPrecipMm(place), dist)} tone="sage" />
            </div>
          </div>
        </section>

        {gist ? (
          <section className="tc-map-hover-section" aria-label="Why it differs">
            <h3 className="tc-map-hover-kicker">Why it differs</h3>
            <p className="tc-map-hover-prose line-clamp-2">{prose(gist)}</p>
          </section>
        ) : null}

        {drivers.length > 0 ? (
          <section className="tc-map-hover-section" aria-label="Physical drivers">
            <h3 className="tc-map-hover-kicker">Drivers</h3>
            <div className="tc-map-hover-pillstrip">
              {drivers.map(d => (
                <span key={d} className="tc-map-hover-pill">
                  {d}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <p className="tc-map-hover-footer-cue">Open pin for full profile</p>
      </div>
    </div>
  );
});

function InstrumentMetric({ label, value, tone }: { label: string; value: string; tone: "ochre" | "glacier" | "sage" }) {
  return (
    <div className="tc-map-hover-metric" data-tone={tone}>
      <span className="tc-map-hover-metric__label">{label}</span>
      <span className="tc-map-hover-metric__value">{value}</span>
    </div>
  );
}
