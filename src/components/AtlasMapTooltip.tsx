import type { CSSProperties } from "react";
import type { MicroclimateArchetype, Place, RiskAssessment, RiskLevel, TopographicDriver } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
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
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storms",
  landslide: "Landslide",
  coastal: "Coastal",
};

const SEVERITY_BADGE: Record<RiskLevel, string> = {
  "very-low":
    "border-[rgba(61,143,85,0.4)] bg-[rgba(61,143,85,0.1)] text-[#1e4d2b]",
  low: "border-[rgba(61,143,85,0.32)] bg-[rgba(61,143,85,0.07)] text-[#245c36]",
  moderate:
    "border-[rgba(232,155,32,0.45)] bg-[rgba(255,224,102,0.2)] text-[#7a5209]",
  elevated:
    "border-[rgba(232,155,32,0.5)] bg-[rgba(255,196,128,0.22)] text-[#8b4510]",
  high: "border-[rgba(232,90,50,0.45)] bg-[rgba(255,180,140,0.2)] text-[#9a3412]",
  "very-high":
    "border-[rgba(224,77,122,0.5)] bg-[rgba(255,196,214,0.28)] text-[#7f1d1d]",
};

function formatDriver(d: TopographicDriver): string {
  return d
    .split("-")
    .map(part => (part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Highest-severity risks first — surfaces what to read even when everything is “moderate”. */
function topRiskRows(place: Place, n: number): { key: keyof Place["risks"]; level: RiskLevel; note?: string }[] {
  return (Object.entries(place.risks) as [keyof Place["risks"], RiskAssessment][])
    .map(([key, r]) => ({ key, level: r.level, note: r.note, ord: RISK_ORDER[r.level] }))
    .sort((a, b) => b.ord - a.ord)
    .slice(0, n)
    .map(({ key, level, note }) => ({ key, level, note }));
}

function archetypeLabel(id: MicroclimateArchetype): string {
  return ARCHETYPE_BY_ID[id]?.label ?? id;
}

function toneToDataTone(t: string): "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora" {
  if (t === "sage" || t === "ochre" || t === "ember" || t === "ice" || t === "aurora") return t;
  return "glacier";
}

function hardinessCaption(place: Place): string | null {
  const z = place.growability.hardinessZone?.trim();
  if (!z) return null;
  if (place.country === "USA") return `USDA plant hardiness zone ${z}`;
  return `Plant hardiness zone ${z} (USDA-style)`;
}

export function AtlasMapTooltip({
  place,
  xPct,
  yPct,
  onHoverCardPointerEnter,
  onHoverCardPointerLeave,
}: {
  place: Place;
  xPct: number;
  yPct: number;
  onHoverCardPointerEnter?: () => void;
  onHoverCardPointerLeave?: () => void;
}) {
  const richEffects = useRichVisualEffects();
  const { temp, dist } = useUnits();
  const prose = useProse();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "glacier";
  const dataTone = toneToDataTone(tone);
  const julyHigh = meanJulyHigh(place);
  const janLow = meanJanLow(place);
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const s = place.scores;
  const drivers = place.drivers.slice(0, 6).map(formatDriver);
  const watch = topRiskRows(place, 3);
  const settlements = place.settlementsWithinZone?.slice(0, 5);
  const secondaryArchetypes = place.archetypes.slice(1);

  const onRight = xPct < 52;
  const onTop = yPct > 52;
  const style: CSSProperties = {
    left: `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${onRight ? "14px" : "calc(-100% - 14px)"}, ${onTop ? "calc(-100% - 10px)" : "10px"})`,
  };

  const growList = place.growability.growsWell.slice(0, 3);
  const trickyFirst = place.growability.tricky[0];
  const hzLine = hardinessCaption(place);

  const countryLabel =
    place.country === "USA" ? "United States" : place.country === "Canada" ? "Canada" : "Mexico";
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="tc-map-hover-title"
      className="tc-map-hover-card absolute w-[min(28rem,calc(100vw-1.25rem))] max-h-[min(74vh,580px)] overflow-y-auto pointer-events-auto anim-fade-in z-10 text-left shadow-2xl"
      data-tone={dataTone}
      style={style}
      onPointerEnter={onHoverCardPointerEnter}
      onPointerLeave={onHoverCardPointerLeave}
      onWheel={e => e.stopPropagation()}
    >
      <header className="tc-map-hover-card__hero">
        <div className="pl-2.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="tc-map-hover-meta-row">
              <span>{tierLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{countryLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="normal-case tracking-normal font-medium text-[rgba(90,79,71,0.88)]">
                {place.confidence} confidence
              </span>
            </div>
            <h2 id="tc-map-hover-title" className="font-atlas text-[1.35rem] sm:text-[1.45rem] leading-[1.2] text-ice tracking-[-0.02em]">
              {place.name}
            </h2>
            {(place.municipality && place.municipality !== place.name) || place.region ? (
              <p className="text-[0.8125rem] leading-relaxed text-stone font-medium">
                {[place.municipality && place.municipality !== place.name ? place.municipality : null, place.region]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {place.confidenceNotes ? (
              <p className="text-[0.72rem] leading-snug text-stone italic border-l-2 border-[rgba(195,165,138,0.5)] pl-2.5 line-clamp-3" title={place.confidenceNotes}>
                {place.confidenceNotes}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 flex flex-col items-start gap-2 sm:items-end sm:max-w-[11.5rem]">
            <span className="chip text-center leading-snug" data-tone={tone}>
              {archetypeLabel(place.archetypes[0])}
            </span>
            {secondaryArchetypes.length > 0 ? (
              <div className="flex flex-col items-start sm:items-end gap-1 w-full">
                <span className="text-[0.58rem] uppercase tracking-[0.12em] text-stone font-semibold">Also tagged</span>
                <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
                  {secondaryArchetypes.map(id => (
                    <span
                      key={id}
                      className="inline-flex max-w-full rounded-md border border-[rgba(195,165,138,0.4)] bg-[rgba(255,253,248,0.85)] px-1.5 py-0.5 text-[0.62rem] leading-tight text-frost-strong text-right"
                    >
                      {archetypeLabel(id)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[0.65rem] leading-snug text-stone text-right hidden sm:block">
                Primary atlas archetype for this stop.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="tc-map-hover-card__body">
        {/* 1 — Anchors */}
        <section className="tc-map-hover-section tc-map-hover-section--inset" aria-label="Location and classification">
          <h3 className="tc-map-hover-kicker">Location &amp; classification</h3>
          <dl className="tc-map-hover-field tc-map-hover-field--2">
            <dt>Coordinates</dt>
            <dd className="font-mono-num tabular-nums text-[0.8125rem]">
              {place.lat.toFixed(3)}°, {place.lon.toFixed(3)}°
            </dd>
            <dt>Elevation</dt>
            <dd className="font-mono-num tabular-nums">{fmtElev(place.elevationM, dist)}</dd>
            <dt>Köppen</dt>
            <dd>{place.koppen}</dd>
            <dt>Biome</dt>
            <dd>{place.biome}</dd>
          </dl>
        </section>

        {/* 2 — Terrain (optional) */}
        {place.reliefContext ? (
          <section className="tc-map-hover-section" aria-label="Terrain context">
            <h3 className="tc-map-hover-kicker">Terrain &amp; setting</h3>
            <p className="tc-map-hover-prose line-clamp-5">{prose(place.reliefContext)}</p>
          </section>
        ) : null}

        {/* 3 — Drivers */}
        {drivers.length > 0 ? (
          <section className="tc-map-hover-section" aria-label="Terrain drivers">
            <h3 className="tc-map-hover-kicker">Physical drivers</h3>
            <p className="text-[0.7rem] text-stone mb-1.5 leading-snug">
              Processes that shape temperature, moisture, and wind at this site.
            </p>
            <div className="tc-map-hover-pillstrip">
              {drivers.map(d => (
                <span key={d} className="tc-map-hover-pill">
                  {d}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* 4 — Mechanism */}
        <section className="tc-map-hover-section" aria-label="Why this place is distinct">
          <h3 className="tc-map-hover-kicker">Mechanism &amp; distinction</h3>
          <p className="tc-map-hover-prose line-clamp-6">{prose(place.whyDistinct)}</p>
        </section>

        {/* 5 — Human geography (optional) */}
        {settlements && settlements.length > 0 ? (
          <section className="tc-map-hover-section" aria-label="Settlements in zone">
            <h3 className="tc-map-hover-kicker">Human geography</h3>
            <ul className="flex flex-col gap-2">
              {settlements.map(z => (
                <li
                  key={`${z.name}-${z.role ?? ""}`}
                  className="text-[0.8125rem] leading-snug text-frost-strong pl-2.5 border-l-[3px] border-[rgba(195,165,138,0.55)]"
                >
                  <span className="font-semibold text-ice">{z.name}</span>
                  {z.role ? (
                    <span className="text-stone font-normal text-[0.72rem] uppercase tracking-wide"> · {z.role}</span>
                  ) : null}
                  {z.population ? <span className="text-stone font-normal"> · {z.population}</span> : null}
                  {z.note ? <span className="block mt-0.5 text-stone font-normal">{z.note}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <hr className="tc-map-hover-band-sep" aria-hidden="true" />

        {/* 6 — Climate signal (chart + headline numbers) before abstract scores */}
        <section className="tc-map-hover-section tc-map-hover-section--flush" aria-label="Climate at a glance">
          <h3 className="tc-map-hover-kicker">Climate at a glance</h3>
          <p className="text-[0.7rem] text-stone mb-2 leading-snug">
            Monthly rhythm and headline normals — same scale as the full profile charts.
          </p>
          <div className="tc-map-hover-instrument">
            <div className="tc-map-hover-instrument__strip" style={richEffects ? { filter: "saturate(1.06)" } : undefined}>
              <MiniClimateStrip place={place} height={26} />
            </div>
            <div className="tc-map-hover-instrument__metrics">
              <InstrumentMetric label="Jul high" value={fmtTemp(julyHigh, temp)} tone="ochre" />
              <InstrumentMetric label="Jan low" value={fmtTemp(janLow, temp)} tone="glacier" />
              <InstrumentMetric label="Annual precip" value={fmtPrecip(annualP, dist)} tone="sage" />
            </div>
          </div>
        </section>

        {/* 7 — Scores */}
        <section className="tc-map-hover-section tc-map-hover-section--inset" aria-label="Atlas scores">
          <h3 className="tc-map-hover-kicker">Atlas scores (0–100)</h3>
          <p className="text-[0.7rem] text-stone mb-2 leading-snug">
            Relative strengths and tradeoffs — higher tradeoffs means sharper compromises.
          </p>
          <div className="tc-map-hover-scoregrid">
            <ScoreBlock label="Comfort" value={s.comfort} />
            <ScoreBlock label="Hidden gem" value={s.hiddenGem} />
            <ScoreBlock label="Uniqueness" value={s.microclimateUniqueness} />
            <ScoreBlock label="Growability" value={s.growability} />
            <ScoreBlock label="Resilience" value={s.resilience} />
            <ScoreBlock label="Tradeoffs" value={s.tradeoff} caution />
          </div>
        </section>

        {/* 8 — Garden */}
        <section className="tc-map-hover-section tc-map-hover-section--inset" aria-label="Growing conditions">
          <h3 className="tc-map-hover-kicker">Growing &amp; garden</h3>
          <div className="space-y-2">
            {hzLine ? (
              <p className="tc-map-hover-prose">
                <span className="font-semibold text-ice">{hzLine}</span>
              </p>
            ) : null}
            <p className="tc-map-hover-prose">
              {growList.length > 0 ? (
                <span>
                  <span className="font-medium text-ice">Tends to do well:</span> {growList.join(", ")}.
                </span>
              ) : (
                <span>Crop and garden fit depends strongly on aspect, soil, and frost pockets.</span>
              )}
            </p>
            {trickyFirst ? (
              <p className="text-[0.78rem] leading-relaxed text-stone border-t border-[rgba(195,165,138,0.28)] pt-2">
                <span className="font-semibold text-ice">Caution:</span> {trickyFirst}
              </p>
            ) : null}
          </div>
        </section>

        {/* 9 — Risks */}
        {watch.length > 0 ? (
          <section className="tc-map-hover-section" aria-label="Environmental risks">
            <h3 className="tc-map-hover-kicker">Top environmental risks</h3>
            <p className="text-[0.7rem] text-stone mb-2 leading-snug">
              Ranked by modeled severity for this site (see full sheet for the full matrix).
            </p>
            <div className="tc-map-hover-risk">
              {watch.map(w => (
                <div key={w.key} className="tc-map-hover-risk__row">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                    <span className="tc-map-hover-risk__name shrink-0">{RISK_LABELS[w.key]}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide shrink-0 ${SEVERITY_BADGE[w.level]}`}
                    >
                      {w.level.replace(/-/g, " ")}
                    </span>
                  </div>
                  {w.note ? <p className="tc-map-hover-risk__note w-full m-0">{w.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <hr className="tc-map-hover-band-sep" aria-hidden="true" />

        {/* 10 — Narrative closure */}
        <section className="tc-map-hover-section" aria-label="Summary">
          <h3 className="tc-map-hover-kicker">One-line summary</h3>
          <p className="tc-map-hover-prose line-clamp-5">{prose(place.summaryShort)}</p>
        </section>

        <section className="tc-map-hover-section" aria-label="Climate outlook">
          <h3 className="tc-map-hover-kicker">Mid-century outlook (~2050)</h3>
          <p className="tc-map-hover-prose line-clamp-4">{prose(place.climateChange.outlook2050)}</p>
        </section>

        <footer className="rounded-xl border border-[rgba(195,165,138,0.35)] bg-gradient-to-br from-[rgba(255,253,248,0.95)] to-[rgba(252,244,232,0.55)] px-3 py-2.5 text-[0.6875rem] leading-relaxed text-stone">
          <span className="font-semibold text-frost-strong">Open the full sheet</span> for dossier chapters, soil profile,
          full risk matrices, relocation and travel fit tags, and similar stops — tap the pin again or pick the place in the ranked list.
        </footer>
      </div>
    </div>
  );
}

function ScoreBlock({ label, value, caution }: { label: string; value: number; caution?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={caution ? "tc-map-hover-score tc-map-hover-score--caution" : "tc-map-hover-score"}>
      <div className="tc-map-hover-score__label">{label}</div>
      <div className="tc-map-hover-score__value">{v}</div>
      <div className="tc-map-hover-score__meter" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{
            width: `${v}%`,
            background:
              "linear-gradient(90deg, var(--tc-map-accent), color-mix(in srgb, var(--tc-map-accent) 55%, white))",
          }}
        />
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
    <div className="flex flex-col items-center gap-1 px-1 min-w-0">
      <span className="text-[0.5625rem] font-bold uppercase tracking-[0.12em] text-stone leading-tight text-center">{label}</span>
      <span className="font-mono-num text-[0.9375rem] font-semibold tabular-nums text-center" style={{ color: c[tone] }}>
        {value}
      </span>
    </div>
  );
}
