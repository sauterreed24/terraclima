/**
 * "Residency brief" — the short shortlist-grade decision summary that
 * sits near the top of every place dossier. Translates the place's live-
 * here fit, livability, comfort, and verify signals into four readable
 * lanes plus a "Why it belongs on the shortlist" panel + the best
 * timing window + the first caution to verify.
 *
 * Extracted from PlaceDetail.tsx during the dossier refactor; no
 * behavior change.
 */
import { ArrowLeftRight, Calendar, ShieldAlert } from "lucide-react";
import type { Place } from "../../types";
import type { BestWindow } from "../../lib/best-months";
import { formatVisitWindow, pickVisitWindow } from "../../lib/best-months";
import { LIVE_FIT_PRESETS, type LiveFitAssessment, type LiveFitFilters } from "../../lib/live-fit";
import { SCORE_DEFINITIONS, type LivabilityResult } from "../../lib/livability-score";
import type { PlaceVisualSignature } from "../../lib/place-visual-signature";
import { fmtTemp, useProse, useUnits, type TempUnit } from "../../lib/units";
import { BookmarkButton } from "../BookmarkButton";

function describeSignatureVerification(signature: PlaceVisualSignature): string {
  switch (signature.verify.key) {
    case "sensoryComfort":
      return "Temperature range, comfortable months, and sky and air quality.";
    case "dailyEase":
      return "Services, travel times, housing cost and hazards: what daily life depends on.";
    case "placeIdentity":
      return "How distinctive the place and its climate are.";
    case "scoutingClarity":
      return "How well sourced the entry is and how easy the place is to check in person.";
  }
}

function riskLabel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export interface ResidencyFitContext {
  rankingLabel: string;
  bundleLabel?: string | null;
  bundleCue?: string | null;
}

function buildFitContextRead(
  filters: LiveFitFilters | undefined,
  temp: TempUnit,
  context: ResidencyFitContext | undefined,
): string | null {
  const presetLabels = LIVE_FIT_PRESETS
    .filter(preset => filters?.fitPresets?.has(preset.id))
    .map(preset => preset.label);
  const constraints = [
    filters?.maxSummerHighC != null ? `summer ≤ ${fmtTemp(filters.maxSummerHighC, temp)}` : null,
    filters?.minWinterLowC != null ? `winter ≥ ${fmtTemp(filters.minWinterLowC, temp)}` : null,
    filters?.minGrowability != null ? `growability ≥ ${filters.minGrowability}` : null,
    filters?.maxFireRisk != null ? `fire risk ≤ ${riskLabel(filters.maxFireRisk)}` : null,
    filters?.maxOverallRisk != null ? `overall risk ≤ ${riskLabel(filters.maxOverallRisk)}` : null,
  ].filter(Boolean);

  const hasLiveFinderSignals = presetLabels.length > 0 || constraints.length > 0;
  if (!hasLiveFinderSignals) return null;

  const screenContext = context?.bundleLabel
    ? `${context.bundleLabel} goal${context.bundleCue ? ` (${context.bundleCue})` : ""} · ${context.rankingLabel}`
    : context?.rankingLabel
      ? `${context.rankingLabel} ranking`
      : null;
  const lens = presetLabels.length > 0 ? presetLabels.join(" + ") : "your must-have limits";
  const scoredContext = constraints.length > 0
    ? `Scored for ${lens}, with ${constraints.join(", ")}.`
    : `Scored for ${lens}.`;

  return screenContext ? `${screenContext}. ${scoredContext}` : scoredContext;
}

export function PlaceResidencyBrief({
  place,
  anchorId,
  liveFit,
  livability,
  bestMonths,
  visualSignature,
  liveFitFilters,
  fitContext,
  inCompare = false,
  bookmarked = false,
  onCompareToggle,
  onBookmarkToggle,
}: {
  place: Place;
  anchorId: string;
  liveFit: LiveFitAssessment;
  livability: LivabilityResult;
  bestMonths: BestWindow[];
  visualSignature: PlaceVisualSignature;
  liveFitFilters?: LiveFitFilters;
  fitContext?: ResidencyFitContext;
  inCompare?: boolean;
  bookmarked?: boolean;
  onCompareToggle?: (id: string) => void;
  onBookmarkToggle?: (id: string) => void;
}) {
  const { temp } = useUnits();
  const prose = useProse();
  const bestWindow = pickVisitWindow(bestMonths);
  const cautionWindow = bestMonths.find(w => w.kind === "caution") ?? null;
  const fitContextRead = buildFitContextRead(liveFitFilters, temp, fitContext);
  const leadDriver =
    livability.drivers
      .map(key => livability.components.find(component => component.key === key))
      .find(Boolean) ??
    [...livability.components].sort((a, b) => b.value - a.value)[0];
  const mainDrag =
    liveFit.cautions[0] ??
    livability.drags
      .map(key => livability.components.find(component => component.key === key))
      .find(Boolean)?.rationale ??
    "No single warning stands out. Still check risk, services and fit before you save it.";
  const cautionLabel = liveFit.cautions.length > 0 ? "Check in person" : `${visualSignature.verify.shortLabel} check`;
  const scoreBand =
    liveFit.score >= 82 ? "top candidate" :
    liveFit.score >= 72 ? "strong candidate" :
    liveFit.score >= 60 ? "niche fit" :
    "weak fit";
  const goodReason = liveFit.reasons[0] ?? "Balanced climate, risk, and terrain scores make it worth a closer look.";
  const hasScoutActions = Boolean(onCompareToggle || onBookmarkToggle);
  const compareScoutLabel = inCompare
    ? `Remove ${place.name} from Compare from the fit summary`
    : `Add ${place.name} to Compare from the fit summary`;
  const lanes = [
    // Live-here fit is the ring above; Livability (a near-duplicate a few
    // points away) is in "Livability breakdown" below. The lanes show what
    // the fit score does not: its leading contributor, place feel, and the
    // weakest part of place feel.
    {
      label: leadDriver?.label ?? SCORE_DEFINITIONS.feltComfort.label,
      value: leadDriver?.value ?? 0,
      note: leadDriver ? "The largest contributor to this place's scores." : "No single factor leads.",
      definition: `${leadDriver?.label ?? "This factor"}, 0–100, higher is better. ${leadDriver?.rationale ?? ""}`,
      tone: "glacier",
    },
    {
      label: SCORE_DEFINITIONS.placeFeel.label,
      value: visualSignature.feelScore,
      note: `${visualSignature.feelBand}: ${visualSignature.primaryLabel}`,
      definition: SCORE_DEFINITIONS.placeFeel.definition,
      tone: "aurora",
    },
    {
      label: visualSignature.verify.label,
      value: Math.round(visualSignature.verify.value),
      note: describeSignatureVerification(visualSignature),
      definition: `${visualSignature.verify.label}, 0–100, higher is better. The weakest part of place feel here.`,
      tone: "ochre",
    },
  ] as const;

  return (
    <section
      id={anchorId}
      className="detail-doc-section residency-brief anim-fade-in"
      style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb }}
      aria-labelledby="residency-brief-title"
    >
      <div className="residency-brief__head">
        <div className="min-w-0">
          <div id="residency-brief-title" className="residency-brief__eyebrow">
            Living here
          </div>
          <p className="residency-brief__headline">
            {place.name} rates as a <span>{scoreBand}</span> on live-here fit.
          </p>
        </div>
        <div
          className="residency-brief__score"
          style={{ ["--score-deg" as string]: `${Math.round(liveFit.score * 3.6)}deg` }}
          aria-label={`Live-here fit ${liveFit.score} out of 100`}
          title={SCORE_DEFINITIONS.liveFit.definition}
        >
          <span className="font-mono-num">{liveFit.score}</span>
          <span>fit</span>
        </div>
      </div>

      {fitContextRead ? (
        <div className="residency-brief__context" aria-label="What this score is based on">
          <p><span>Based on</span> {prose(fitContextRead)}</p>
        </div>
      ) : null}

      {hasScoutActions ? (
        <div className="residency-brief__actions" aria-label={`Actions for ${place.name}`}>
          <div className="residency-brief__action-read">
            <span>Next step</span>
            <p>Save it to your saved places, then compare it with others before planning a visit.</p>
          </div>
          <div className="residency-brief__action-buttons">
            {onBookmarkToggle ? (
              <BookmarkButton
                pinned={bookmarked}
                placeName={place.name}
                onToggle={() => onBookmarkToggle(place.id)}
                size="header"
                ariaContext="from the fit summary"
                className="residency-brief__action-button"
              />
            ) : null}
            {onCompareToggle ? (
              <button
                type="button"
                onClick={() => onCompareToggle(place.id)}
                aria-pressed={inCompare}
                aria-label={compareScoutLabel}
                title={compareScoutLabel}
                className={`btn-ghost residency-brief__action-button ${inCompare ? "residency-brief__action-button--active compare-toggle--active" : ""}`}
              >
                <ArrowLeftRight className="w-3 h-3" aria-hidden />
                <span>{inCompare ? "In compare" : "Compare"}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="residency-brief__grid">
        <div className="residency-brief__primary">
          <div className="residency-brief__primary-label">Main reason to consider it</div>
          <p>{prose(goodReason)}</p>
          <div className="residency-brief__chips" aria-label="What it offers">
            {liveFit.badges.slice(0, 4).map(badge => (
              <span key={badge}>{badge}</span>
            ))}
            <span>{visualSignature.primaryLabel}</span>
          </div>
        </div>

        <div className="residency-brief__fact">
          <Calendar className="w-4 h-4" aria-hidden />
          <span>Best season</span>
          <strong>{bestWindow ? formatVisitWindow(bestWindow) : "See Seasonal rhythm"}</strong>
          {cautionWindow ? <small>Watch {cautionWindow.range.toLowerCase()}</small> : null}
        </div>

        <div className="residency-brief__fact">
          <ShieldAlert className="w-4 h-4" aria-hidden />
          <span>Check first</span>
          <strong>{cautionLabel}</strong>
          <small>{prose(mainDrag)}</small>
        </div>
      </div>

      <div className="residency-brief__lanes" aria-label={`${place.name} scores by area`}>
        {lanes.map(lane => (
          <div key={lane.label} className="residency-brief__lane" data-tone={lane.tone} title={prose(lane.definition)}>
            <div className="residency-brief__lane-top">
              <span>{lane.label}</span>
              <strong className="font-mono-num">{Math.round(lane.value)}<span className="text-[10px] font-normal opacity-70">/100</span></strong>
            </div>
            <div className="residency-brief__track" aria-hidden>
              <span style={{ width: `${Math.max(0, Math.min(100, lane.value))}%` }} />
            </div>
            <p>{prose(lane.note)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
