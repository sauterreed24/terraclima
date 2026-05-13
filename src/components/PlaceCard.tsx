import { memo, useCallback, useId, useMemo, type MouseEvent } from "react";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../lib/climate-metrics";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtSnow, useProse } from "../lib/units";
import { getCorpusCardTeaser } from "../lib/atlas-corpus-stats";
import { getBestMonths, type BestWindow } from "../lib/best-months";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { ArrowRight, Droplets, Leaf, Sun } from "lucide-react";
import { BookmarkButton } from "./BookmarkButton";
import { describeHumanComfort, scoreLivability } from "../lib/livability-score";
import { getPlaceVisualSignature } from "../lib/place-visual-signature";

// ── Climate gradient bar helpers ─────────────────────────────────────────────

const MONTH_ABBR = ["J","F","M","A","M","J","J","A","S","O","N","D"] as const;

/** Map a temperature in °C to an HSL colour (blue → teal → green → yellow → orange → red). */
function tempToColor(celsius: number): string {
  if (celsius <= -5) return "#6ab4e8";      // deep cold blue
  if (celsius <= 2)  return "#88cce8";      // cold blue
  if (celsius <= 8)  return "#7ad4c8";      // cool teal
  if (celsius <= 14) return "#72d49c";      // mild green
  if (celsius <= 20) return "#a8d868";      // gentle yellow-green
  if (celsius <= 24) return "#d4cc44";      // warm yellow
  if (celsius <= 28) return "#f0b040";      // orange
  if (celsius <= 32) return "#e87838";      // deep orange
  return "#d64828";                         // hot red
}

const CURRENT_MONTH = new Date().getMonth(); // 0-based index, persistent across the session

interface Props {
  place: Place;
  selected?: boolean;
  note?: string;
  /** Prefer this over `onClick` in lists — stable reference lets `memo` skip re-renders. */
  onOpenPlace?: (id: string) => void;
  /** @deprecated use `onOpenPlace` */
  onClick?: () => void;
  onCompareToggle?: (id: string) => void;
  inCompare?: boolean;
  /** Whether this place is bookmarked. Card shows a filled pin icon when true. */
  bookmarked?: boolean;
  /** Toggle bookmark for this place id. Omit to hide the pin control. */
  onBookmarkToggle?: (id: string) => void;
  compact?: boolean;
  /**
   * Best-month window id that the active ranking profile resonates with.
   * When the card's primary window matches this id, the chip brightens.
   */
  resonantWindow?: BestWindow["id"] | null;
  liveFitFilters?: LiveFitFilters;
  rank?: number;
  rankingLabel?: string;
  rankingScore?: number;
}

const TONE_ACCENT: Record<string, string> = {
  glacier: "linear-gradient(180deg, #7ad4f0 0%, #0f7aa3 100%)",
  sage: "linear-gradient(180deg, #d4f0c4 0%, #3d8a48 100%)",
  ochre: "linear-gradient(180deg, #ffe08a 0%, #b07812 100%)",
  ember: "linear-gradient(180deg, #ffc4a8 0%, #c2410c 100%)",
  ice: "linear-gradient(180deg, #c8effc 0%, #2eb8e6 100%)",
  aurora: "linear-gradient(180deg, #dcc4ff 0%, #6d28d9 100%)",
};

// Archetype tone expressed as comma-separated RGB so CSS can interpolate
// opacity in box-shadow without a second JS pass. Piped into the card via
// the --tone-rgb custom property.
const TONE_RGB: Record<string, string> = {
  glacier: "122, 212, 240",
  sage: "180, 240, 180",
  ochre: "255, 224, 138",
  ember: "255, 156, 120",
  ice: "200, 239, 252",
  aurora: "220, 196, 255",
};

/**
 * Atlas place card.
 *
 * Memoized and reduced to a plain button + CSS hover transform. Previously
 * each card mounted a framer-motion `motion.button` with `layout` and
 * `whileHover`, which on a 40-card grid meant 40 motion runtimes doing
 * per-frame work even when idle. Switching to CSS-only hover (no JS) drops
 * the interactive render budget dramatically on low-spec hardware.
 */
export const PlaceCard = memo(function PlaceCard({
  place, selected, note, onOpenPlace, onClick, onCompareToggle, inCompare, bookmarked, onBookmarkToggle, compact, resonantWindow, liveFitFilters, rank, rankingLabel, rankingScore,
}: Props) {
  const titleId = useId();
  const rankId = useId();
  const { temp, dist } = useUnits();
  const prose = useProse();
  const summerHighC = meanSummerHigh(place);
  const janLowC = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const primaryArchetype = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const tone = primaryArchetype?.tone ?? "ice";
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";

  // Compute the single "best window" teaser for the card. Memoized because
  // PlaceCard is already wrapped in React.memo and `place` is stable — so
  // this cost is paid exactly once per card per session.
  const topWindow = useMemo(() => {
    if (compact) return null;
    return getBestMonths(place, temp).find(w => w.kind === "good") ?? null;
  }, [place, compact, temp]);

  const corpusTeaser = useMemo(() => (compact ? "" : getCorpusCardTeaser(place)), [place, compact]);
  const liveFit = useMemo(
    () => (compact ? null : assessLiveFit(place, liveFitFilters)),
    [place, compact, liveFitFilters],
  );
  const livabilityResult = useMemo(() => (compact ? null : scoreLivability(place)), [place, compact]);
  const comfortRead = useMemo(() => (compact ? null : describeHumanComfort(place)), [place, compact]);
  const visualSignature = useMemo(() => (compact ? null : getPlaceVisualSignature(place)), [place, compact]);

  // Derived at-a-glance extras surfaced on non-compact cards
  const annualSunshinePct = useMemo(() => {
    if (compact || !place.climate.sunshinePct) return null;
    return Math.round(place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12);
  }, [place, compact]);
  const avgHumidity = useMemo(() => {
    if (compact || !place.climate.humidity) return null;
    return Math.round(place.climate.humidity.reduce((a, b) => a + b, 0) / 12);
  }, [place, compact]);
  const frostFreeDays = place.climate.frostFreeDays ?? null;

  const toneRgb = TONE_RGB[tone] ?? TONE_RGB.ice;

  const handleOpen = useCallback(() => {
    if (onOpenPlace) onOpenPlace(place.id);
    else onClick?.();
  }, [onOpenPlace, onClick, place.id]);

  const handleCompare = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    // Compare button is a sibling of the open button, not nested — but a
    // user clicking it is interacting with the card too, so we still don't
    // want the click to bubble into wrapping link/scroll handlers.
    e.stopPropagation();
    onCompareToggle?.(place.id);
  }, [onCompareToggle, place.id]);

  const handleBookmark = useCallback(() => {
    onBookmarkToggle?.(place.id);
  }, [onBookmarkToggle, place.id]);

  /*
   * Layout note: previously the whole card was a `div[role=button]` so the
   * compare control could be a nested real `<button>`. That's an a11y smell
   * because Enter/Space behavior depends on hand-rolled key handling and
   * some ATs miss the role. Now the open target is a real `<button>` and the
   * compare control sits *outside* it (still inside the card frame), so we
   * keep correct semantics on both interactive elements.
   */
  return (
    <article
      className={`place-card place-card--tinted panel w-full relative overflow-hidden group${selected ? " place-card--selected" : ""}`}
      style={{
        // Tint the hover/selected glow with the primary archetype's colour.
        // A string custom property so CSS rgba() can consume it.
        ["--tone-rgb" as string]: toneRgb,
      }}
      aria-labelledby={titleId}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 bottom-0 w-[3px] pointer-events-none"
        style={{ background: TONE_ACCENT[tone] }}
      />

      {/* 12-month temperature gradient bar — always rendered, visually encodes the full year */}
      <div className="place-card__climate-bar" aria-hidden="true">
        {place.climate.tempHighC.map((tempC, i) => (
          <div
            key={i}
            className={`place-card__climate-bar__segment${i === CURRENT_MONTH ? " place-card__climate-bar__segment--now" : ""}`}
            style={{ background: tempToColor(tempC) }}
            title={`${MONTH_ABBR[i]}: ${fmtTemp(tempC, temp)}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleOpen}
        className="place-card__open-target text-left w-full p-4 pl-[calc(1rem+3px)] flex flex-col gap-0 min-h-0 bg-transparent border-0 cursor-pointer"
        aria-labelledby={titleId}
        aria-describedby={rank != null && rankingLabel && rankingScore != null ? rankId : undefined}
        aria-pressed={selected ? true : undefined}
      >
        {rank != null && rankingLabel && rankingScore != null ? (
          <div
            id={rankId}
            className="place-card__rank-strip"
            aria-label={`Rank ${rank} by ${rankingLabel}; score ${Math.round(rankingScore)}.`}
          >
            <span
              className={`place-card__rank-number${rank <= 3 ? ` place-card__rank-number--medal place-card__rank-number--medal-${rank}` : ""}`}
              aria-hidden
            >
              {rank}
            </span>
            <span className="place-card__rank-label">{rankingLabel}</span>
            <span className="place-card__rank-score" aria-hidden>{Math.round(rankingScore)}</span>
          </div>
        ) : null}

        <header className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(71,90,122,0.18)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id={titleId} className="font-atlas text-lg text-ice truncate">{place.name}</h3>
              <ArrowRight className="w-3 h-3 text-stone opacity-35 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0" aria-hidden />
            </div>
            <p className="text-[11px] text-stone mt-1 leading-snug">
              {place.region}
              <span className="text-stone/70"> · </span>
              {place.country === "USA" ? "United States" : place.country === "Canada" ? "Canada" : "Mexico"}
            </p>
            {!compact && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-stone-readable max-w-md">
                <dt className="text-stone-readable/85">Archetype</dt>
                <dd className="text-frost truncate">{primaryArchetype?.label ?? "—"}</dd>
                <dt className="text-stone-readable/85">Elevation</dt>
                <dd><span className="font-mono-num text-frost">{fmtElev(place.elevationM, dist)}</span></dd>
                <dt className="text-stone-readable/85">Köppen</dt>
                <dd className="font-mono-num text-frost">{place.koppen}</dd>
              </dl>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="chip" data-tone={place.tier === "A" ? "ochre" : place.tier === "B" ? "ice" : "sage"} title={`Tier ${place.tier}`}>{tierLabel}</span>
            {/* Spacer to reserve room next to the tier chip so the absolutely-positioned compare/bookmark buttons don't overlap content. */}
            {(onCompareToggle || onBookmarkToggle) ? <span className="place-card__compare-spacer" aria-hidden /> : null}
          </div>
        </header>

        {!compact && (
          <p className="text-sm text-frost leading-snug pt-3 line-clamp-2">{prose(place.summaryShort)}</p>
        )}

        {visualSignature ? (
          <dl
            className="place-card__signature-band"
            style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb }}
            aria-label={`${place.name} visual signature`}
          >
            <div>
              <dt>Signature</dt>
              <dd title={visualSignature.primaryBlurb}>
                <span className="place-card__signature-value">{visualSignature.primaryLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Feel</dt>
              <dd title={`Place-feel score ${visualSignature.feelScore}/100`}>
                <span className="place-card__signature-value">{visualSignature.feelBand}</span>
                <span className="place-card__signature-score font-mono-num">{visualSignature.feelScore}</span>
              </dd>
            </div>
            <div>
              <dt>Leads with</dt>
              <dd title={visualSignature.strength.rationale}>
                <span className="place-card__signature-value">{visualSignature.strength.shortLabel}</span>
                <span className="place-card__signature-score font-mono-num">{Math.round(visualSignature.strength.value)}</span>
              </dd>
            </div>
            <div>
              <dt>Verify</dt>
              <dd title={visualSignature.verify.rationale}>
                <span className="place-card__signature-value">{visualSignature.verify.shortLabel}</span>
                <span className="place-card__signature-score font-mono-num">{Math.round(visualSignature.verify.value)}</span>
              </dd>
            </div>
          </dl>
        ) : null}

        {!compact && (
          <div className="pt-3">
            <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Year at a glance</div>
            <div className="rounded-lg overflow-hidden border border-[rgba(71,90,122,0.2)] bg-[rgba(255,253,248,0.5)]" style={{ filter: "saturate(1.05)" }}>
              <MiniClimateStrip place={place} />
            </div>
          </div>
        )}

        <div className="pt-3">
          <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Core numbers</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-[rgba(71,90,122,0.15)] bg-[rgba(255,253,248,0.45)] px-2 py-2">
            <Stat label="JJA high" value={fmtTemp(summerHighC, temp)} tone="ochre" />
            <Stat label="Jan low" value={fmtTemp(janLowC, temp)} tone="glacier" />
            <Stat label="Annual precip" value={fmtPrecip(annualP, dist)} tone="sage" />
            <Stat label="Uniqueness" value={place.scores.microclimateUniqueness.toString()} tone="ice" />
          </div>

          {/* Extended stats row: sunshine, humidity, frost-free days */}
          {!compact && (annualSunshinePct != null || avgHumidity != null || frostFreeDays != null) && (
            <div className="place-card__ext-stats">
              {annualSunshinePct != null && (
                <span className="place-card__ext-stat" title="Mean annual sunshine % of possible">
                  <Sun className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#c4a020" }} />
                  <span className="font-mono-num">{annualSunshinePct}%</span>
                  <span className="text-stone-readable/60">sun</span>
                </span>
              )}
              {avgHumidity != null && (
                <span className="place-card__ext-stat" title="Mean annual relative humidity">
                  <Droplets className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#1a8fa8" }} />
                  <span className="font-mono-num">{avgHumidity}%</span>
                  <span className="text-stone-readable/60">RH</span>
                </span>
              )}
              {frostFreeDays != null && (
                <span className="place-card__ext-stat" title="Approximate frost-free days per year">
                  <Leaf className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#3d8f55" }} />
                  <span className="font-mono-num">{frostFreeDays}</span>
                  <span className="text-stone-readable/60">frost-free days</span>
                </span>
              )}
            </div>
          )}

          {/* "This Month" live chip */}
          {!compact && (() => {
            const monthHigh = place.climate.tempHighC[CURRENT_MONTH];
            const monthPrecip = place.climate.precipMm[CURRENT_MONTH];
            const monthSnow = place.climate.snowCm?.[CURRENT_MONTH];
            const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
            const currentColor = tempToColor(monthHigh);
            return (
              <div className="place-card__this-month" style={{ borderColor: `${currentColor}55` }}>
                <span className="place-card__this-month__dot" style={{ background: currentColor }} aria-hidden />
                <span className="place-card__this-month__label">
                  <strong>{MONTH_NAMES[CURRENT_MONTH]}</strong>
                  {" "}
                  <span className="font-mono-num">{fmtTemp(monthHigh, temp)}</span>
                  <span className="text-stone-readable/70"> highs · </span>
                  <span className="font-mono-num">{fmtPrecip(monthPrecip, dist)}</span>
                  {monthSnow && monthSnow > 0.5 ? <span className="text-stone-readable/70"> · {fmtSnow(monthSnow, dist)} snow</span> : null}
                </span>
              </div>
            );
          })()}

          {corpusTeaser ? (
            <p className="text-[10px] leading-snug text-stone-readable mt-2 pl-0.5 border-t border-dashed border-[rgba(71,90,122,0.12)] pt-2" title={prose(corpusTeaser)}>
              {prose(corpusTeaser)}
            </p>
          ) : null}
        </div>

        {/* Livability score bar */}
        {!compact && livabilityResult ? (
          <div className="place-card__livability-bar mt-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-readable">Livability</span>
              <span className="font-mono-num text-xs text-frost">{Math.round(livabilityResult.score)}<span className="text-stone-readable/60">/100</span></span>
            </div>
            <div className="place-card__livability-bar__track">
              <div
                className="place-card__livability-bar__fill"
                style={{ width: `${livabilityResult.score}%` }}
                role="progressbar"
                aria-valuenow={Math.round(livabilityResult.score)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Livability score: ${Math.round(livabilityResult.score)}/100`}
              />
            </div>
            {livabilityResult.components.length > 0 && (
              <div className="place-card__livability-components mt-1.5">
                {livabilityResult.components.slice(0, 3).map(c => (
                  <span key={c.key} className="place-card__livability-component" title={`${c.label}: ${Math.round(c.value)}/100`}>
                    <span
                      className="place-card__livability-component__dot"
                      style={{ background: c.value >= 70 ? "#3d8f55" : c.value >= 50 ? "#e89b20" : "#e05030" }}
                      aria-hidden
                    />
                    {c.label}
                    <span className="font-mono-num text-frost">{Math.round(c.value)}</span>
                  </span>
                ))}
              </div>
            )}
            {comfortRead ? (
              <p className="text-[10px] leading-snug text-stone-readable mt-1.5 line-clamp-2" title={prose(comfortRead.summary)}>
                {prose(comfortRead.summary)}
              </p>
            ) : null}
            {place.liveSignals ? (
              <div className="place-card__livability-components mt-1.5" aria-label="Lived-friction signals">
                {(["costPressure","socialStress","accessFriction"] as const).map(axis => {
                  const value = place.liveSignals?.[axis];
                  if (value == null) return null;
                  const label = axis === "costPressure" ? "Cost" : axis === "socialStress" ? "Social" : "Access";
                  const tone = value <= 35 ? "#3d8f55" : value <= 60 ? "#e89b20" : "#e05030";
                  return (
                    <span key={axis} className="place-card__livability-component" title={`${label} friction (0 easy, 100 severe): ${Math.round(value)}/100${place.liveSignals?.note ? ` · ${prose(place.liveSignals.note)}` : ""}`}>
                      <span className="place-card__livability-component__dot" style={{ background: tone }} aria-hidden />
                      {label}
                      <span className="font-mono-num text-frost">{Math.round(value)}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {liveFit ? (
          <div className="mt-3 rounded-lg border border-[rgba(26,143,168,0.22)] bg-[rgba(232,248,251,0.55)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-stone-readable">Live-here fit</span>
              <span className="font-mono-num text-sm text-ice">{liveFit.score}/100</span>
            </div>
            <p className="text-[11px] leading-snug text-frost mt-1">{prose(liveFit.reasons[0] ?? "Balanced scouting signal.")}</p>
            {liveFit.cautions.length > 0 ? (
              <p className="text-[10px] leading-snug text-stone-readable mt-1">Watch: {prose(liveFit.cautions[0])}</p>
            ) : null}
          </div>
        ) : null}

        {!compact && place.archetypes.length > 0 && (
          <div className="pt-3 border-t border-[rgba(71,90,122,0.12)]">
            <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1.5">Also tagged</div>
            <div className="flex flex-wrap gap-1">
              {place.archetypes.slice(0, 3).map(a => (
                <span key={a} className="chip" data-tone={ARCHETYPE_BY_ID[a]?.tone ?? "ice"}>
                  {ARCHETYPE_BY_ID[a]?.label ?? a}
                </span>
              ))}
            </div>
          </div>
        )}

        {topWindow && (
          <div className="pt-3">
            <div
              className="best-window-pill"
              data-resonant={resonantWindow && topWindow.id === resonantWindow ? "true" : "false"}
              title={resonantWindow && topWindow.id === resonantWindow
                ? `${topWindow.note ? prose(topWindow.note) : ""} Aligned with current ranking.`
                : topWindow.note ? prose(topWindow.note) : undefined}
            >
              <span aria-hidden="true">{topWindow.glyph}</span>
              <span className="uppercase tracking-wider">{topWindow.label}</span>
              <span className="font-mono-num text-frost">{topWindow.range}</span>
            </div>
          </div>
        )}

        {note && <div className="text-xs text-stone-readable italic pt-2 border-t border-[rgba(71,90,122,0.1)] mt-2">{prose(note)}</div>}
      </button>

      {onBookmarkToggle && (
        <BookmarkButton
          pinned={Boolean(bookmarked)}
          placeName={place.name}
          onToggle={handleBookmark}
          className="place-card__bookmark-btn"
        />
      )}

      {onCompareToggle && (
        <button
          type="button"
          onClick={handleCompare}
          className={`btn-ghost place-card__compare-btn !px-3 !py-2 !text-xs ${inCompare ? "!border-[rgba(240,210,156,0.8)] !text-ochre-300" : ""}`}
          title="Add to comparison"
          aria-label={inCompare ? `Remove ${place.name} from comparison` : `Add ${place.name} to comparison`}
          aria-pressed={inCompare}
        >
          {inCompare ? "− Compare" : "+ Compare"}
        </button>
      )}
    </article>
  );
});

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const color: Record<string, string> = {
    ochre: "#c17d0a",
    glacier: "#1a8fa8",
    sage: "#3d8f55",
    ice: "#2491b8",
  };
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-stone-readable">{label}</span>
      <span className="font-mono-num text-sm" style={{ color: color[tone] ?? "#2a4a58" }}>{value}</span>
    </div>
  );
}
