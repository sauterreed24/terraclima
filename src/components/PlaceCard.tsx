import { memo, useCallback, useId, useMemo, type MouseEvent } from "react";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../lib/climate-metrics";
import { observedSunnyDaysPerYear, precipHeroLabel } from "../lib/hero-glance";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtSnow, useProse } from "../lib/units";
import { getBioclimCardSignal, getCorpusCardTeaser } from "../lib/atlas-corpus-stats";
import { getBestMonths, type BestWindow } from "../lib/best-months";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { buildHomeBaseComparison, formatHomeDeltaValue, pickHomeDeltaChips } from "../lib/home-base";
import { ArrowRight, Droplets, Home, Leaf, Sun } from "lucide-react";
import { BookmarkButton } from "./BookmarkButton";
import { describeHumanComfort, scoreLivability } from "../lib/livability-score";
import { effectiveAccessRemoteness, effectiveHousingPressure } from "../lib/research/lived-indicators";
import { getPlaceVisualSignature } from "../lib/place-visual-signature";
import type { RankingProfile } from "../lib/scoring";
import { shouldShowPlaceCardScreeningScores } from "../lib/place-card-screening";

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

/** 0-based month index for deterministic tests; production uses the real calendar. */
export function getReferenceMonth(now: Date = new Date()): number {
  return now.getMonth();
}

interface Props {
  place: Place;
  selected?: boolean;
  note?: string;
  /** Stable list opener — keeps `memo` effective across parent re-renders. */
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onCompareToggle?: (id: string) => void;
  onPreloadPlaceDetail?: () => void;
  onPreloadCompare?: () => void;
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
  /**
   * When true, show livability / live-fit / Feel–Leads–Verify screening chrome.
   * Defaults from ranking + Live Finder filters when omitted.
   */
  showScreeningScores?: boolean;
  /** Active Explorer ranking — used with liveFitFilters when showScreeningScores is omitted. */
  rankingProfile?: RankingProfile;
  /** The reader's home-base anchor. Non-compact cards show a compact delta strip against it. */
  homePlace?: Place | null;
  rank?: number;
  rankingLabel?: string;
  rankingScore?: number;
  /** Override calendar month for "This month" chip (tests only). */
  referenceMonth?: number;
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
  place, selected, note, onOpenPlace, onCompareToggle, onPreloadPlaceDetail, onPreloadCompare, inCompare, bookmarked, onBookmarkToggle, compact, resonantWindow, liveFitFilters, showScreeningScores, rankingProfile, homePlace, rank, rankingLabel, rankingScore, referenceMonth = getReferenceMonth(),
}: Props) {
  const titleId = useId();
  const rankId = useId();
  const rankingEvidenceId = useId();
  const { temp, dist } = useUnits();
  const prose = useProse();
  const summerHighC = meanSummerHigh(place);
  const janLowC = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const primaryArchetype = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const tone = primaryArchetype?.tone ?? "ice";
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";
  const openTargetLabel = `Open ${place.name} place profile`;
  const screeningScores = showScreeningScores
    ?? (rankingProfile
      ? shouldShowPlaceCardScreeningScores(rankingProfile, liveFitFilters)
      : shouldShowPlaceCardScreeningScores("most-unique", liveFitFilters));

  // Compute the single "best window" teaser for the card. Memoized because
  // PlaceCard is already wrapped in React.memo and `place` is stable — so
  // this cost is paid exactly once per card per session.
  const topWindow = useMemo(() => {
    if (compact) return null;
    return getBestMonths(place, temp).find(w => w.kind === "good") ?? null;
  }, [place, compact, temp]);

  const corpusTeaser = useMemo(() => (compact ? "" : getCorpusCardTeaser(place)), [place, compact]);
  const bioclimSignal = useMemo(() => (compact ? null : getBioclimCardSignal(place)), [place, compact]);
  const liveFit = useMemo(
    () => (compact || !screeningScores ? null : assessLiveFit(place, liveFitFilters)),
    [place, compact, screeningScores, liveFitFilters],
  );
  const livabilityResult = useMemo(
    () => (compact || !screeningScores ? null : scoreLivability(place)),
    [place, compact, screeningScores],
  );
  const homeComparison = useMemo(
    () => (compact || !homePlace ? null : buildHomeBaseComparison(homePlace, place)),
    [place, compact, homePlace],
  );
  const comfortRead = useMemo(
    () => (compact || !screeningScores ? null : describeHumanComfort(place)),
    [place, compact, screeningScores],
  );
  const visualSignature = useMemo(
    () => (compact || !screeningScores ? null : getPlaceVisualSignature(place)),
    [place, compact, screeningScores],
  );

  // Derived at-a-glance extras surfaced on non-compact cards
  const sunnyDays = useMemo(() => {
    if (compact) return null;
    return observedSunnyDaysPerYear(place);
  }, [place, compact]);
  const avgHumidity = useMemo(() => {
    if (compact || !place.climate.humidity) return null;
    return Math.round(place.climate.humidity.reduce((a, b) => a + b, 0) / 12);
  }, [place, compact]);
  const frostFreeDays = place.climate.frostFreeDays ?? null;

  const toneRgb = TONE_RGB[tone] ?? TONE_RGB.ice;
  const rankingEvidenceNote = !compact && note ? prose(note) : null;
  const rankingEvidenceCheck = !compact
    ? liveFit?.cautions[0] ?? visualSignature?.verify.rationale ?? null
    : null;
  const describedBy = [
    rank != null && rankingLabel && rankingScore != null ? rankId : null,
    rankingEvidenceNote ? rankingEvidenceId : null,
  ].filter(Boolean).join(" ") || undefined;

  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onOpenPlace?.(place.id, { trigger: event.currentTarget });
  }, [onOpenPlace, place.id]);

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
            className={`place-card__climate-bar__segment${i === referenceMonth ? " place-card__climate-bar__segment--now" : ""}`}
            style={{ background: tempToColor(tempC) }}
            title={`${MONTH_ABBR[i]}: ${fmtTemp(tempC, temp)}`}
          />
        ))}
      </div>
      <span className="sr-only">
        {`Year at a glance: summer highs near ${fmtTemp(summerHighC, temp)}, January lows near ${fmtTemp(janLowC, temp)}.`}
      </span>

      <button
        type="button"
        onClick={handleOpen}
        onPointerEnter={onPreloadPlaceDetail}
        onFocus={onPreloadPlaceDetail}
        onPointerDown={onPreloadPlaceDetail}
        className="place-card__open-target text-left w-full p-4 pl-[calc(1rem+3px)] flex flex-col gap-0 min-h-0 bg-transparent border-0 cursor-pointer"
        aria-label={openTargetLabel}
        title={openTargetLabel}
        aria-describedby={describedBy}
        aria-current={selected ? "true" : undefined}
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

        <header className="flex items-start justify-between gap-3 pb-3 border-b tc-border-neutral">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id={titleId} className="font-atlas text-lg text-ice truncate">{place.name}</h3>
              <ArrowRight className="w-3 h-3 text-stone opacity-35 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0" aria-hidden />
            </div>
            <p className="text-caption-strong text-stone mt-1 leading-snug">
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

        {rankingEvidenceNote ? (
          <div
            id={rankingEvidenceId}
            className="place-card__ranking-evidence"
            aria-label="Why this place ranked here"
          >
            <p><span>Why this rank</span> {rankingEvidenceNote}</p>
            {rankingEvidenceCheck ? (
              <p><span>First check</span> {prose(rankingEvidenceCheck)}</p>
            ) : null}
          </div>
        ) : null}

        {visualSignature ? (
          <dl
            className="place-card__signature-band"
            style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb }}
            aria-label={`${place.name} visual signature`}
          >
            <div>
              <dt>Signature</dt>
              <dd title={prose(visualSignature.primaryBlurb)}>
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
            <div className="text-caption mb-1.5">Year at a glance</div>
            <div className="place-card__inset-panel rounded-lg overflow-hidden" style={{ filter: "saturate(1.05)" }}>
              <MiniClimateStrip place={place} />
            </div>
          </div>
        )}

        <div className="pt-3">
          <div className="text-caption mb-1.5">Core numbers</div>
          <div className="place-card__inset-panel grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg px-2 py-2">
            <Stat label="Summer high" value={fmtTemp(summerHighC, temp)} tone="ochre" />
            <Stat label="January low" value={fmtTemp(janLowC, temp)} tone="glacier" />
            <Stat label={precipHeroLabel(place)} value={fmtPrecip(annualP, dist)} tone="sage" />
            <Stat label="Uniqueness" value={place.scores.microclimateUniqueness.toString()} tone="ice" />
          </div>

          {/* Extended stats row: solar resource, humidity, frost-free days */}
          {!compact && (sunnyDays != null || avgHumidity != null || frostFreeDays != null) && (
            <div className="place-card__ext-stats">
              {sunnyDays != null && (
                <span className="place-card__ext-stat" title="Estimated from percent of possible sunshine">
                  <Sun className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#c4a020" }} />
                  <span className="font-mono-num">{sunnyDays}</span>
                  <span className="text-stone-readable/60">sunny days</span>
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

          {bioclimSignal ? (
            <div className="place-card__bioclim-row" aria-label="Bioclimatic signature">
              <span className="chip place-card__bioclim-chip" data-tone={bioclimSignal.tone} title={bioclimSignal.title}>
                <Droplets className="w-3 h-3 shrink-0" aria-hidden />
                <span>{bioclimSignal.label}</span>
              </span>
            </div>
          ) : null}

          {/* "This Month" live chip */}
          {!compact && (() => {
            const monthHigh = place.climate.tempHighC[referenceMonth];
            const monthPrecip = place.climate.precipMm[referenceMonth];
            const monthSnow = place.climate.snowCm?.[referenceMonth];
            const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
            const currentColor = tempToColor(monthHigh);
            return (
              <div
                className="place-card__this-month"
                style={{ ["--month-accent" as string]: currentColor, borderColor: `color-mix(in srgb, ${currentColor} 33%, transparent)` }}
              >
                <span className="place-card__this-month__dot" style={{ background: currentColor }} aria-hidden />
                <span className="place-card__this-month__label">
                  <strong>{MONTH_NAMES[referenceMonth]}</strong>
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

          {homeComparison ? (
            <div
              className="place-card__home-delta"
              aria-label={homeComparison.isSame
                ? `${place.name} is your home base`
                : `Climate versus your home base, ${homeComparison.home.name}`}
              title={prose(homeComparison.headline)}
            >
              <span className="place-card__home-delta__label">
                <Home className="w-3 h-3 shrink-0" aria-hidden />
                {homeComparison.isSame ? "Home base" : `vs ${homeComparison.home.name}`}
              </span>
              {homeComparison.isSame ? (
                <span className="chip" data-tone="glacier">your climate baseline</span>
              ) : (
                (() => {
                  const chips = pickHomeDeltaChips(homeComparison);
                  return chips.length === 0 ? (
                    <span className="chip" data-tone="sage" title="Every major climate signal lands within a rounding error of home.">
                      climate sibling
                    </span>
                  ) : (
                    chips.map(signal => (
                      <span
                        key={signal.id}
                        className="chip"
                        data-tone={signal.tone}
                        title={`${signal.label}: ${signal.descriptor} than home. ${signal.basis}`}
                      >
                        {signal.shortLabel}{" "}
                        <span className="font-mono-num">{formatHomeDeltaValue(signal, temp, dist)}</span>
                      </span>
                    ))
                  );
                })()
              )}
            </div>
          ) : null}
        </div>

        {/* Livability score bar */}
        {!compact && livabilityResult ? (
          <div className="place-card__livability-bar mt-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-caption">Livability</span>
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
                {([
                  { key: "housing", label: "Housing", value: effectiveHousingPressure(place.liveSignals) },
                  { key: "access", label: "Access", value: effectiveAccessRemoteness(place.liveSignals) },
                ] as const).map(axis => {
                  const value = axis.value;
                  if (value == null) return null;
                  const tone = value <= 35 ? "#3d8f55" : value <= 60 ? "#e89b20" : "#e05030";
                  return (
                    <span key={axis.key} className="place-card__livability-component" title={`${axis.label} friction (0 easy, 100 severe): ${Math.round(value)}/100${place.liveSignals?.note ? ` · ${prose(place.liveSignals.note)}` : ""}`}>
                      <span className="place-card__livability-component__dot" style={{ background: tone }} aria-hidden />
                      {axis.label}
                      <span className="font-mono-num text-frost">{Math.round(value)}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {liveFit ? (
          <div className="place-card__live-fit-panel mt-3 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption">Live-here fit</span>
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

        {!rankingEvidenceNote && note ? (
          <div className="text-xs text-stone-readable italic pt-2 border-t border-[rgba(71,90,122,0.1)] mt-2">{prose(note)}</div>
        ) : null}
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
          onPointerEnter={onPreloadCompare}
          onFocus={onPreloadCompare}
          onPointerDown={onPreloadCompare}
          className={`btn-ghost place-card__compare-btn !px-3 !py-2 !text-xs ${inCompare ? "compare-toggle--active" : ""}`}
          title={inCompare ? `Remove ${place.name} from comparison` : `Add ${place.name} to comparison`}
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
  return (
    <div className="flex flex-col">
      <span className="text-caption">{label}</span>
      <span className="font-mono-num text-sm place-card__stat-value" data-tone={tone}>{value}</span>
    </div>
  );
}
