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
import { LIVE_FIT_PRESETS, type LiveFitAssessment, type LiveFitFilters } from "../../lib/live-fit";
import type { LivabilityResult } from "../../lib/livability-score";
import type { PlaceVisualSignature } from "../../lib/place-visual-signature";
import { fmtTemp, useProse, useUnits, type TempUnit } from "../../lib/units";
import { BookmarkButton } from "../BookmarkButton";

function describeSignatureVerification(signature: PlaceVisualSignature): string {
  switch (signature.verify.key) {
    case "sensoryComfort":
      return "Thermal envelope, easy months, and sky or air cues are the first comfort check.";
    case "dailyEase":
      return "Services, access, lived friction, and risk load set the daily-life verification floor.";
    case "placeIdentity":
      return "Authored texture, distinctness, and hidden-gem signal determine how legible the place feels.";
    case "scoutingClarity":
      return "Sources, settlement anchors, nearby contrasts, and confidence determine how easy it is to verify.";
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
    filters?.maxSummerHighC != null ? `summer <= ${fmtTemp(filters.maxSummerHighC, temp)}` : null,
    filters?.minWinterLowC != null ? `winter >= ${fmtTemp(filters.minWinterLowC, temp)}` : null,
    filters?.minGrowability != null ? `growability >= ${filters.minGrowability}` : null,
    filters?.maxFireRisk != null ? `fire risk <= ${riskLabel(filters.maxFireRisk)}` : null,
    filters?.maxOverallRisk != null ? `overall risk <= ${riskLabel(filters.maxOverallRisk)}` : null,
  ].filter(Boolean);

  const hasLiveFinderSignals = presetLabels.length > 0 || constraints.length > 0;
  if (!hasLiveFinderSignals) return null;

  const screenContext = context?.bundleLabel
    ? `${context.bundleLabel} path${context.bundleCue ? ` (${context.bundleCue})` : ""} · ${context.rankingLabel}`
    : context?.rankingLabel
      ? `${context.rankingLabel} lens`
      : null;
  const lens = presetLabels.length > 0 ? presetLabels.join(" + ") : "manual Live Finder constraints";
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
  const bestWindow = bestMonths.find(w => w.kind === "good") ?? null;
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
    "No single hard warning dominates; still verify risk, services, and fit before shortlisting.";
  const cautionLabel = liveFit.cautions.length > 0 ? "Verify on the ground" : `${visualSignature.verify.shortLabel} check`;
  const scoreBand =
    liveFit.score >= 82 ? "Prime shortlist" :
    liveFit.score >= 72 ? "Strong prospect" :
    liveFit.score >= 60 ? "Specialist fit" :
    "Needs scrutiny";
  const goodReason = liveFit.reasons[0] ?? "Balanced climate, risk, and terrain scores make it worth a closer look.";
  const hasScoutActions = Boolean(onCompareToggle || onBookmarkToggle);
  const compareScoutLabel = inCompare
    ? `Remove ${place.name} from Compare from residency brief`
    : `Add ${place.name} to Compare from residency brief`;
  const lanes = [
    { label: "Live fit", value: liveFit.score, note: goodReason, tone: "glacier" },
    {
      label: "Livability",
      value: livability.score,
      note: leadDriver ? `${leadDriver.label} is the leading contributor.` : "Balanced blend.",
      tone: "sage",
    },
    { label: "Place feel", value: visualSignature.feelScore, note: visualSignature.primaryLabel, tone: "aurora" },
    {
      label: visualSignature.verify.label,
      value: Math.round(visualSignature.verify.value),
      note: describeSignatureVerification(visualSignature),
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
            Residency brief
          </div>
          <p className="residency-brief__headline">
            {place.name} reads as a <span>{scoreBand}</span> under the current living lens.
          </p>
        </div>
        <div
          className="residency-brief__score"
          style={{ ["--score-deg" as string]: `${Math.round(liveFit.score * 3.6)}deg` }}
          aria-label={`Live-here fit ${liveFit.score} out of 100`}
        >
          <span className="font-mono-num">{liveFit.score}</span>
          <span>fit</span>
        </div>
      </div>

      {fitContextRead ? (
        <div className="residency-brief__context" aria-label="Active fit context">
          <p><span>Current screen</span> {prose(fitContextRead)}</p>
        </div>
      ) : null}

      {hasScoutActions ? (
        <div className="residency-brief__actions" aria-label={`Residency actions for ${place.name}`}>
          <div className="residency-brief__action-read">
            <span>Scout handoff</span>
            <p>Keep this candidate in your shortlist, then compare tradeoffs before planning a visit.</p>
          </div>
          <div className="residency-brief__action-buttons">
            {onBookmarkToggle ? (
              <BookmarkButton
                pinned={bookmarked}
                placeName={place.name}
                onToggle={() => onBookmarkToggle(place.id)}
                size="header"
                ariaContext="from residency brief"
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
          <div className="residency-brief__primary-label">Why it belongs on the shortlist</div>
          <p>{prose(goodReason)}</p>
          <div className="residency-brief__chips" aria-label="Shortlist tags">
            {liveFit.badges.slice(0, 4).map(badge => (
              <span key={badge}>{badge}</span>
            ))}
            <span>{visualSignature.primaryLabel}</span>
          </div>
        </div>

        <div className="residency-brief__fact">
          <Calendar className="w-4 h-4" aria-hidden />
          <span>Best timing</span>
          <strong>{bestWindow ? `${bestWindow.label} · ${bestWindow.range}` : "Read monthly rhythm"}</strong>
          {cautionWindow ? <small>Watch {cautionWindow.range.toLowerCase()}</small> : null}
        </div>

        <div className="residency-brief__fact">
          <ShieldAlert className="w-4 h-4" aria-hidden />
          <span>First caution</span>
          <strong>{cautionLabel}</strong>
          <small>{prose(mainDrag)}</small>
        </div>
      </div>

      <div className="residency-brief__lanes" aria-label={`${place.name} decision signal lanes`}>
        {lanes.map(lane => (
          <div key={lane.label} className="residency-brief__lane" data-tone={lane.tone} title={prose(lane.note)}>
            <div className="residency-brief__lane-top">
              <span>{lane.label}</span>
              <strong className="font-mono-num">{Math.round(lane.value)}</strong>
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
