import type { CSSProperties } from "react";
import type { MicroclimateArchetype, Place, RiskAssessment, RiskLevel, TopographicDriver } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { fmtPrecip, fmtTemp, useProse, useUnits } from "../lib/units";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "../lib/climate-metrics";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { atmosphericComfortScore, describeHumanComfort, humanComfortScore } from "../lib/livability-score";
import { useRichVisualEffects } from "../lib/device-profile";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";

const RISK_ORDER: Record<RiskLevel, number> = {
  "very-low": 0,
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  "very-high": 5,
};

const RISK_LABELS: Record<keyof Place["risks"], string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Heat",
  extremeCold: "Cold",
  smoke: "Smoke",
  storm: "Storms",
  landslide: "Landslide",
  coastal: "Coastal",
};

function formatDriver(d: TopographicDriver): string {
  return d
    .split("-")
    .map(part => (part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function topRiskRows(place: Place, n: number): { key: keyof Place["risks"]; level: RiskLevel }[] {
  return (Object.entries(place.risks) as [keyof Place["risks"], RiskAssessment][])
    .map(([key, r]) => ({ key, level: r.level, ord: RISK_ORDER[r.level] }))
    .sort((a, b) => b.ord - a.ord)
    .slice(0, n)
    .map(({ key, level }) => ({ key, level }));
}

function archetypeLabel(id: MicroclimateArchetype): string {
  return ARCHETYPE_BY_ID[id]?.label ?? id;
}

function toneToDataTone(t: string): "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora" {
  if (t === "sage" || t === "ochre" || t === "ember" || t === "ice" || t === "aurora") return t;
  return "glacier";
}

function riskTone(level: RiskLevel): "low" | "moderate" | "high" {
  if (level === "high" || level === "very-high" || level === "elevated") return "high";
  if (level === "moderate") return "moderate";
  return "low";
}

export function AtlasMapTooltip({
  place,
  xPct,
  yPct,
  mapWidth,
  featuredRank,
  featuredLabel,
  liveFitFilters,
}: {
  place: Place;
  xPct: number;
  yPct: number;
  mapWidth: number;
  featuredRank?: number;
  featuredLabel?: string;
  liveFitFilters?: LiveFitFilters;
}) {
  const richEffects = useRichVisualEffects();
  const { temp, dist } = useUnits();
  const prose = useProse();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const dataTone = toneToDataTone(tone);
  const drivers = place.drivers.slice(0, 3).map(formatDriver);
  const watch = topRiskRows(place, 2);
  const growList = place.growability.growsWell.slice(0, 2);
  const trickyFirst = place.growability.tricky[0];
  const liveFit = assessLiveFit(place, liveFitFilters);
  const comfort = Math.round(humanComfortScore(place));
  const atmosphere = Math.round(atmosphericComfortScore(place));
  const comfortRead = describeHumanComfort(place);

  const compactMap = mapWidth < 420;
  const onRight = xPct < 55;
  const onTop = yPct > 58;
  const availableHeightPct = onTop ? yPct : 100 - yPct;
  const style: CSSProperties = {
    left: compactMap ? "0.5rem" : `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${compactMap ? "0" : onRight ? "12px" : "calc(-100% - 12px)"}, ${onTop ? "calc(-100% - 10px)" : "10px"})`,
    width: compactMap ? "calc(100% - 1rem)" : undefined,
    maxWidth: compactMap ? "calc(100% - 1rem)" : "min(21.5rem, calc(100vw - 1rem))",
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

  return (
    <div
      role="tooltip"
      id="tc-map-hover-preview"
      aria-labelledby="tc-map-hover-title"
      className="tc-map-hover-card absolute w-[min(21.5rem,calc(100vw-1.25rem))] pointer-events-none anim-fade-in z-10 text-left shadow-2xl"
      data-tone={dataTone}
      style={style}
    >
      <header className="tc-map-hover-card__hero">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="tc-map-hover-meta-row">
              <span>{tierLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{countryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{place.confidence} confidence</span>
            </div>
            <h2 id="tc-map-hover-title" className="font-atlas text-[1.12rem] leading-tight text-ice mt-1.5">
              {place.name}
            </h2>
            {locationLine ? (
              <p className="text-[0.72rem] leading-snug text-stone font-medium mt-1">
                {locationLine}
              </p>
            ) : null}
          </div>
          <span className="chip shrink-0 max-w-[8.5rem] text-center leading-snug" data-tone={tone}>
            {archetypeLabel(place.archetypes[0])}
          </span>
        </div>
        {featuredLine ? (
          <div className="tc-map-hover-rankline" aria-label={featuredLine}>
            <span>{featuredLine}</span>
            <span>Current lens leader</span>
          </div>
        ) : null}
      </header>

      <div className="tc-map-hover-card__body">
        <section className="tc-map-hover-section tc-map-hover-section--flush" aria-label="Climate snapshot">
          <h3 className="tc-map-hover-kicker">Climate snapshot</h3>
          <div className="tc-map-hover-instrument">
            <div className="tc-map-hover-instrument__strip" style={richEffects ? { filter: "saturate(1.06)" } : undefined}>
              <MiniClimateStrip place={place} height={22} />
            </div>
            <div className="tc-map-hover-instrument__metrics">
              <InstrumentMetric label="JJA high" value={fmtTemp(meanSummerHigh(place), temp)} tone="ochre" />
              <InstrumentMetric label="Jan low" value={fmtTemp(meanJanLow(place), temp)} tone="glacier" />
              <InstrumentMetric label="Annual precip" value={fmtPrecip(getAnnualPrecipMm(place), dist)} tone="sage" />
            </div>
          </div>
        </section>

        <section className="tc-map-hover-section" aria-label="Comfort read">
          <h3 className="tc-map-hover-kicker">Comfort read</h3>
          <div className="tc-map-hover-scoregrid">
            <TooltipScore label="Comfort" value={comfort} />
            <TooltipScore label="Live fit" value={liveFit.score} />
            <TooltipScore label="Atmosphere" value={atmosphere} caution={atmosphere < 55} />
          </div>
          <p className="tc-map-hover-prose mt-2 line-clamp-2">{prose(comfortRead.summary)}</p>
        </section>

        <section className="tc-map-hover-section" aria-label="Microclimate gist">
          <h3 className="tc-map-hover-kicker">Microclimate gist</h3>
          <p className="tc-map-hover-prose line-clamp-3">{prose(place.whyDistinct || place.summaryShort)}</p>
        </section>

        {drivers.length > 0 ? (
          <section className="tc-map-hover-section" aria-label="Physical drivers">
            <h3 className="tc-map-hover-kicker">Physical drivers</h3>
            <div className="tc-map-hover-pillstrip">
              {drivers.map(d => (
                <span key={d} className="tc-map-hover-pill">
                  {d}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="tc-map-hover-scout-strip" aria-label="Scout cues">
          <div className="tc-map-hover-scout-strip__head">
            <h3 className="tc-map-hover-kicker">Scout cues</h3>
            <span>Open dossier, compare finalists</span>
          </div>
          <div className="tc-map-hover-cues">
            {growList.length > 0 ? (
              <div>
                <span className="tc-map-hover-cue-label">Grows</span>
                <span>{growList.join(", ")}</span>
              </div>
            ) : null}
            {trickyFirst ? (
              <div>
                <span className="tc-map-hover-cue-label">Watch</span>
                <span>{trickyFirst}</span>
              </div>
            ) : null}
            {watch.map(w => (
              <div key={w.key} data-risk={riskTone(w.level)}>
                <span className="tc-map-hover-cue-label">{RISK_LABELS[w.key]}</span>
                <span>{w.level.replace(/-/g, " ")}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InstrumentMetric({ label, value, tone }: { label: string; value: string; tone: "ochre" | "glacier" | "sage" }) {
  const c: Record<string, string> = {
    ochre: "#c2781a",
    glacier: "#1a7a94",
    sage: "#2d6b3f",
  };
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 min-w-0">
      <span className="text-[0.52rem] font-bold uppercase tracking-[0.08em] text-stone leading-tight text-center">{label}</span>
      <span className="font-mono-num text-[0.82rem] font-semibold tabular-nums text-center" style={{ color: c[tone] }}>
        {value}
      </span>
    </div>
  );
}

function TooltipScore({ label, value, caution }: { label: string; value: number; caution?: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`tc-map-hover-score${caution ? " tc-map-hover-score--caution" : ""}`}>
      <span className="tc-map-hover-score__label">{label}</span>
      <span className="tc-map-hover-score__value">{Math.round(clamped)}</span>
      <span className="tc-map-hover-score__meter" aria-hidden>
        <span style={{ width: `${clamped}%` }} />
      </span>
    </div>
  );
}
