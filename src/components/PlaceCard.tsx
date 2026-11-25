import { memo, useCallback, useId, useMemo, type MouseEvent } from "react";
import type { Place } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../lib/climate-metrics";
import { observedSunshinePct, precipHeroLabel } from "../lib/hero-glance";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtSnow, useProse } from "../lib/units";
import { getBioclimCardSignal, getCorpusCardTeaser } from "../lib/atlas-corpus-stats";
import { getVisitWindow, type BestWindow } from "../lib/best-months";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { buildHomeBaseComparison, pickHomeDeltaChips } from "../lib/home-base";
import { formatHomeDelta } from "./place-detail/home-delta-format";
import { ArrowRight, Droplets, Home, Leaf, Sun } from "lucide-react";
import { BookmarkButton } from "./BookmarkButton";
import { describeHumanComfort, SCORE_DEFINITIONS } from "../lib/livability-score";
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

  // The single "best window" teaser: the window the current ranking is about
  // when the place has one, otherwise the same visit window the profile's
  // residency brief and climate-tourism read lead with.
  const topWindow = useMemo(() => {
    if (compact) return null;
    return getVisitWindow(place, temp, resonantWindow ?? null);
  }, [place, compact, temp, resonantWindow]);

  const corpusTeaser = useMemo(() => (compact ? "" : getCorpusCardTeaser(place)), [place, compact]);
  const bioclimSignal = useMemo(() => (compact ? null : getBioclimCardSignal(place)), [place, compact]);
  const liveFit = useMemo(
    () => (compact || !screeningScores ? null : assessLiveFit(place, liveFitFilters)),
    [place, compact, screeningScores, liveFitFilters],
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
  const sunshinePct = useMemo(() => {
    if (compact) return null;
    return observedSunshinePct(place);
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
      data-ranked={rank != null && rankingLabel && rankingScore != null ? "true" : undefined}
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
        {`Year at a glance: summer highs near ${fmtTemp(summerHighC, temp)}, winter lows near ${fmtTemp(janLowC, temp)}.`}
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

        <header className={`flex items-start justify-between gap-3 border-b tc-border-neutral ${compact ? "pb-2" : "pb-3"}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {/* Two lines before clipping: long dossier names ("Death Valley
                  (Furnace Creek)") otherwise truncate to a stub on phones. */}
              <h3 id={titleId} className="font-atlas text-lg text-ice leading-snug line-clamp-2 min-w-0 [overflow-wrap:anywhere]">{place.name}</h3>
              <ArrowRight className="w-3 h-3 mt-[0.45rem] text-stone opacity-35 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0" aria-hidden />
            </div>
            <p className="text-caption-strong text-stone mt-1 leading-snug">
              {place.region}
              <span className="text-stone"> · </span>
              {place.country === "USA" ? "United States" : place.country === "Canada" ? "Canada" : "Mexico"}
            </p>
            {compact ? (
              <p className="place-card__compact-facts">
                <span>{primaryArchetype?.label ?? place.koppen}</span>
                <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span>
              </p>
            ) : (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-stone-readable max-w-md">
                <dt className="text-stone-readable">Climate type</dt>
                <dd className="text-frost">{primaryArchetype?.label ?? "—"}</dd>
                <dt className="text-stone-readable">Elevation</dt>
                <dd><span className="font-mono-num text-frost">{fmtElev(place.elevationM, dist)}</span></dd>
                <dt className="text-stone-readable" title="Köppen class: a standard letter code for climate type, from temperature and rainfall">Köppen</dt>
                <dd className="font-mono-num text-frost">{place.koppen}</dd>
              </dl>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="chip" data-tone={place.tier === "A" ? "ochre" : place.tier === "B" ? "ice" : "sage"} title={place.tier === "A" ? "Flagship: a full profile with history, risks and sources" : place.tier === "B" ? "Spotlight: a standard profile" : "Index: a shorter entry"}>{tierLabel}</span>
            {/* Spacer to reserve room next to the tier chip so the absolutely-positioned compare/bookmark buttons don't overlap content. */}
            {(onCompareToggle || onBookmarkToggle) ? <span className="place-card__compare-spacer" aria-hidden /> : null}
          </div>
        </header>

        {compact ? (
          <p className="text-[13px] text-frost leading-snug pt-2 line-clamp-1" title={prose(place.summaryShort)}>{prose(place.summaryShort)}</p>
        ) : (
          <p className="text-sm text-frost leading-snug pt-3 line-clamp-2">{prose(place.summaryShort)}</p>
        )}

        {rankingEvidenceNote ? (
          <div
            id={rankingEvidenceId}
            className="place-card__ranking-evidence"
            aria-label="Why this place ranks here"
          >
            <p><span>Why this rank</span> {rankingEvidenceNote}</p>
            {rankingEvidenceCheck ? (
              <p><span>Check first</span> {prose(rankingEvidenceCheck)}</p>
            ) : null}
          </div>
        ) : null}

        {visualSignature ? (
          <dl
            className="place-card__signature-band"
            // Three equal columns: the climate type that used to lead this band
            // is already in the card header, and four columns clipped the labels.
            style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            aria-label={`${place.name} place feel`}
          >
            <div style={{ gridColumn: "auto" }}>
              <dt>{SCORE_DEFINITIONS.placeFeel.label}</dt>
              <dd style={SIGNATURE_DD_STYLE} title={SCORE_DEFINITIONS.placeFeel.definition}>
                <span className="place-card__signature-value">{visualSignature.feelBand}</span>
                <span className="place-card__signature-score font-mono-num">{visualSignature.feelScore}/100</span>
              </dd>
            </div>
            <div>
              <dt>Strongest</dt>
              <dd style={SIGNATURE_DD_STYLE} title={`${visualSignature.strength.label}, the strongest part of place feel, 0–100, higher is better. ${prose(visualSignature.strength.rationale)}`}>
                <span className="place-card__signature-value">{visualSignature.strength.shortLabel}</span>
                <span className="place-card__signature-score font-mono-num">{Math.round(visualSignature.strength.value)}/100</span>
              </dd>
            </div>
            <div>
              <dt>Weakest</dt>
              <dd style={SIGNATURE_DD_STYLE} title={`${visualSignature.verify.label}, the weakest part of place feel, 0–100, higher is better. ${prose(visualSignature.verify.rationale)}`}>
                <span className="place-card__signature-value">{visualSignature.verify.shortLabel}</span>
                <span className="place-card__signature-score font-mono-num">{Math.round(visualSignature.verify.value)}/100</span>
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

        <div className={compact ? "pt-2" : "pt-3"}>
          {compact ? null : <div className="text-caption mb-1.5">Core numbers</div>}
          <div className="place-card__inset-panel grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg px-2 py-2">
            <Stat label="Summer high" value={fmtTemp(summerHighC, temp)} tone="ochre" />
            <Stat label="Winter low" value={fmtTemp(janLowC, temp)} tone="glacier" />
            <Stat label={precipHeroLabel(place)} value={fmtPrecip(annualP, dist)} tone="sage" />
            <Stat label={SCORE_DEFINITIONS.uniqueness.label} value={`${place.scores.microclimateUniqueness}/100`} tone="ice" title={SCORE_DEFINITIONS.uniqueness.definition} />
          </div>

          {/* Extended stats row: sunshine, humidity, frost-free days */}
          {!compact && (sunshinePct != null || avgHumidity != null || frostFreeDays != null) && (
            <div className="place-card__ext-stats">
              {sunshinePct != null && (
                <span className="place-card__ext-stat" title="Share of daylight hours with sun, averaged over the year">
                  <Sun className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#c4a020" }} />
                  <span className="font-mono-num">{sunshinePct}%</span>
                  <span className="text-stone-readable">sunshine</span>
                </span>
              )}
              {avgHumidity != null && (
                <span className="place-card__ext-stat" title="Average relative humidity over the year">
                  <Droplets className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#1a8fa8" }} />
                  <span className="font-mono-num">{avgHumidity}%</span>
                  <span className="text-stone-readable">humidity</span>
                </span>
              )}
              {frostFreeDays != null && (
                <span className="place-card__ext-stat" title="Approximate days a year between the last spring frost and the first fall frost">
                  <Leaf className="w-3 h-3 shrink-0" aria-hidden style={{ color: "#3d8f55" }} />
                  <span className="font-mono-num">{frostFreeDays}</span>
                  <span className="text-stone-readable">frost-free days</span>
                </span>
              )}
            </div>
          )}

          {bioclimSignal ? (
            <div className="place-card__bioclim-row" aria-label="Moisture and seasonal temperature swing">
              <span className="chip place-card__bioclim-chip" data-tone={bioclimSignal.tone} title={prose(bioclimSignal.title)}>
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
                  <span className="text-stone-readable"> highs · </span>
                  <span className="font-mono-num">{fmtPrecip(monthPrecip, dist)}</span>
                  {monthSnow && monthSnow > 0.5 ? <span className="text-stone-readable"> · {fmtSnow(monthSnow, dist)} snow</span> : null}
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
                <span className="chip" data-tone="glacier">your home base</span>
              ) : (
                (() => {
                  const chips = pickHomeDeltaChips(homeComparison);
                  return chips.length === 0 ? (
                    <span className="chip" data-tone="sage" title="Every main climate figure is about the same as at your home base.">
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
                        <span className="font-mono-num">{formatHomeDelta(signal, temp, dist)}</span>
                      </span>
                    ))
                  );
                })()
              )}
            </div>
          ) : null}
        </div>

        {/* One living score per card. Livability sat here as a second bar a few
            points from Live-here fit; it now lives in the profile's
            "Livability breakdown", and the card keeps only the fit score with
            its cost and access figures. */}
        {liveFit ? (
          <div className="place-card__live-fit-panel mt-3 rounded-lg px-3 py-2" title={SCORE_DEFINITIONS.liveFit.definition}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption">{SCORE_DEFINITIONS.liveFit.label}</span>
              <span className="font-mono-num text-sm text-ice">{liveFit.score}/100</span>
            </div>
            <p className="text-[11px] leading-snug text-frost mt-1">{prose(liveFit.reasons[0] ?? "No single strength stands out.")}</p>
            {liveFit.cautions.length > 0 ? (
              <p className="text-[10px] leading-snug text-stone-readable mt-1">Watch: {prose(liveFit.cautions[0])}</p>
            ) : null}
            {comfortRead ? (
              <p className="text-[10px] leading-snug text-stone-readable mt-1.5 line-clamp-2" title={prose(comfortRead.summary)}>
                {prose(comfortRead.summary)}
              </p>
            ) : null}
            {place.liveSignals ? (
              <div className="place-card__livability-components mt-1.5" aria-label="Cost and access">
                {([
                  { key: "housing", label: "Housing", value: effectiveHousingPressure(place.liveSignals) },
                  { key: "access", label: "Access", value: effectiveAccessRemoteness(place.liveSignals) },
                ] as const).map(axis => {
                  const value = axis.value;
                  if (value == null) return null;
                  const tone = value <= 35 ? "#3d8f55" : value <= 60 ? "#e89b20" : "#e05030";
                  return (
                    <span key={axis.key} className="place-card__livability-component" title={`${axis.label} difficulty, 0–100, lower is easier: ${Math.round(value)}/100${place.liveSignals?.note ? ` · ${prose(place.liveSignals.note)}` : ""}`}>
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
                ? `${topWindow.note ? prose(topWindow.note) : ""} Matches the current ranking.`
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

/** Lets a score chip drop under its label instead of clipping it on a narrow card. */
const SIGNATURE_DD_STYLE = { flexWrap: "wrap", rowGap: "0.15rem", whiteSpace: "normal" } as const;

function Stat({ label, value, tone, title }: { label: string; value: string; tone: string; title?: string }) {
  return (
    <div className="flex flex-col" title={title}>
      <span className="text-caption">{label}</span>
      <span className="font-mono-num text-sm place-card__stat-value" data-tone={tone}>{value}</span>
    </div>
  );
}
