import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MOTION_DURATION_BASE_S, scrimFadeTransition } from "../lib/device-profile";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Place, RiskLevel, ScenarioId } from "../types";
import { scenarioMeta } from "../lib/climate-projection";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm, RISK_VALUE } from "../lib/climate-metrics";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, useProse } from "../lib/units";
import { buildGeospatialAnalysis } from "../lib/geospatial-analysis";
import { computeBioclim, type BioclimIndex } from "../lib/bioclim";
import {
  LIVE_FIT_PRESET_BY_ID,
  LIVE_FIT_PRESETS,
  type LiveFitFilters,
} from "../lib/live-fit";
import { apparentComfortIndex } from "../lib/comfort-precision";
import {
  buildCompareDecisionProfiles,
  buildCompareDecisionRead,
  compareLensScore,
  type CompareDecisionProfile,
} from "../lib/compare-finalist-verdict";
import {
  COMPARISON_LENS_OPTIONS,
  DEFAULT_COMPARISON_LENS,
  comparisonLensLabel,
  type CompareCandidateSource,
  type CompareCandidate,
  type ComparisonLensId,
} from "../lib/compare-workbench";
import { buildCompareCoachRecommendations } from "../lib/compare-workbench-coach";
import { buildHomeBaseComparison, formatHomeDeltaValue, pickHomeDeltaChips } from "../lib/home-base";
import { COMPARE_LIMIT } from "../lib/app-url";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useElementIsolation } from "../hooks/use-element-isolation";
import { ChevronRight, Clock3, Home, Link2, X } from "lucide-react";

type CompareShareStatus = "idle" | "copied" | "failed";
type CandidateSourceFilter = "all" | CompareCandidateSource;

const CANDIDATE_SOURCE_FILTERS: readonly { id: CandidateSourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Shortlist", label: "Shortlist" },
  { id: "Recent", label: "Recent" },
  { id: "Ranked", label: "Ranked" },
];

interface Props {
  places: Place[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onOpenPlace?: (id: string) => void;
  onCopyView?: () => void;
  shareStatus?: CompareShareStatus;
  liveFitFilters?: LiveFitFilters;
  /** Home-base anchor (projected to the active scenario by the caller). Columns read deltas against it. */
  homePlace?: Place | null;
  /** Add a place to the compare set — used by the "add home base" affordance. */
  onAddPlace?: (id: string) => void;
  /** Local-only workbench candidates from shortlist, recents, and ranked leaders. */
  candidates?: CompareCandidate[];
  comparisonLens?: ComparisonLensId;
  onComparisonLensChange?: (lens: ComparisonLensId) => void;
  scenario?: ScenarioId;
  occluded?: boolean;
}

export function CompareView({
  places,
  open,
  onClose,
  onRemove,
  onOpenPlace,
  onCopyView,
  shareStatus = "idle",
  liveFitFilters,
  homePlace,
  onAddPlace,
  candidates = [],
  comparisonLens = DEFAULT_COMPARISON_LENS,
  onComparisonLensChange,
  scenario = "now",
  occluded = false,
}: Props) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const candidateSearchId = useId();
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateSourceFilter, setCandidateSourceFilter] = useState<CandidateSourceFilter>("all");
  const activeComparisonLens = comparisonLens ?? DEFAULT_COMPARISON_LENS;
  const placeCount = `${places.length} ${places.length === 1 ? "place" : "places"}`;
  const isSinglePlace = places.length === 1;
  const title = isSinglePlace ? `${placeCount} saved to compare` : `${placeCount} side by side`;
  const helperText = isSinglePlace
    ? "Add another place from any card or profile to start a side-by-side comparison."
    : "Compare climate fingerprints, seasonal ranges, and screening scores across the saved places.";
  const decisionProfiles = useMemo<CompareDecisionProfile[]>(
    () => buildCompareDecisionProfiles(places, liveFitFilters),
    [places, liveFitFilters],
  );
  const decisionById = useMemo(
    () => new Map(decisionProfiles.map(profile => [profile.place.id, profile])),
    [decisionProfiles],
  );
  const compareHighlights = useMemo(() => {
    if (places.length < 2) return [];
    const coolestSummer = places.reduce((best, place) => meanSummerHigh(place) < meanSummerHigh(best) ? place : best, places[0]);
    const mildestWinter = places.reduce((best, place) => meanJanLow(place) > meanJanLow(best) ? place : best, places[0]);
    const bestLiveFit = decisionProfiles.reduce((best, profile) => profile.liveFitScore > best.liveFitScore ? profile : best, decisionProfiles[0]);
    const topLivability = decisionProfiles.reduce((best, profile) => profile.livabilityScore > best.livabilityScore ? profile : best, decisionProfiles[0]);
    const lowestRisk = decisionProfiles.reduce((best, profile) => profile.riskLoad < best.riskLoad ? profile : best, decisionProfiles[0]);
    const bestGrowability = places.reduce((best, place) => place.scores.growability > best.scores.growability ? place : best, places[0]);
    return [
      { label: "Coolest summer", place: coolestSummer, value: fmtTemp(meanSummerHigh(coolestSummer), temp, { digits: 1 }) },
      { label: "Mildest winter", place: mildestWinter, value: fmtTemp(meanJanLow(mildestWinter), temp, { digits: 1 }) },
      { label: "Best live-here fit", place: bestLiveFit.place, value: `${bestLiveFit.liveFitScore}/100` },
      { label: "Top livability", place: topLivability.place, value: `${topLivability.livabilityScore}/100` },
      { label: "Lowest risk load", place: lowestRisk.place, value: `${lowestRisk.riskLoad}/100` },
      { label: "Best growability", place: bestGrowability, value: `${bestGrowability.scores.growability}/100` },
    ];
  }, [decisionProfiles, places, temp]);
  const decisionRead = useMemo(
    () => buildCompareDecisionRead(decisionProfiles, activeComparisonLens),
    [activeComparisonLens, decisionProfiles],
  );
  const activeCandidateIds = useMemo(() => new Set(places.map(place => place.id)), [places]);
  const candidateTray = useMemo(() => {
    const seen = new Set<string>();
    const rows: CompareCandidate[] = [];
    for (const place of places) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      rows.push({ place, source: "Active", note: "Active slot" });
    }
    for (const candidate of candidates) {
      if (seen.has(candidate.place.id)) continue;
      seen.add(candidate.place.id);
      rows.push(candidate);
    }
    return rows;
  }, [candidates, places]);
  const filteredCandidateTray = useMemo(() => {
    const query = candidateQuery.trim().toLowerCase();
    return candidateTray.filter(candidate => {
      if (candidate.source === "Active") return true;
      if (candidateSourceFilter !== "all" && candidate.source !== candidateSourceFilter) return false;
      if (!query) return true;
      const place = candidate.place;
      const haystack = [
        place.name,
        place.region,
        place.country,
        ...place.archetypes,
        candidate.source,
        candidate.note ?? "",
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [candidateQuery, candidateSourceFilter, candidateTray]);
  const candidateCountRead = candidateQuery.trim() || candidateSourceFilter !== "all"
    ? `${filteredCandidateTray.length}/${candidateTray.length} shown`
    : `${candidateTray.length} candidates`;
  const candidateDecisionProfiles = useMemo<CompareDecisionProfile[]>(
    () => buildCompareDecisionProfiles(candidateTray.map(candidate => candidate.place), liveFitFilters),
    [candidateTray, liveFitFilters],
  );
  const coachRecommendations = useMemo(
    () => buildCompareCoachRecommendations({
      activePlaces: places,
      candidateProfiles: candidateDecisionProfiles,
      lens: activeComparisonLens,
    }),
    [activeComparisonLens, candidateDecisionProfiles, places],
  );
  const groupedRows = useMemo(
    () => buildGroupedComparisonRows(places, decisionById, activeComparisonLens, temp, dist),
    [activeComparisonLens, decisionById, dist, places, temp],
  );
  const visibleGroupedRows = showDifferencesOnly
    ? groupedRows.filter(row => row.different)
    : groupedRows;
  const singlePlaceGuide = isSinglePlace ? buildSinglePlaceGuide(decisionProfiles[0]) : null;
  const compareLensReceipt = useMemo(
    () => buildCompareLensReceipt(liveFitFilters, scenario, temp),
    [liveFitFilters, scenario, temp],
  );
  /**
   * Mobile (<lg breakpoint via the Tailwind class) gets fixed-width columns
   * with a horizontal scroll snap so 2–4 places stay readable on a phone
   * instead of collapsing the column min-width below 17rem and being
   * essentially unusable. Desktop fills the available width.
   */
  const columnTemplate = useMemo(
    () => `repeat(${places.length}, minmax(min(17rem, 88vw), 1fr))`,
    [places.length],
  );
  useElementIsolation(panelRef, occluded);
  useFocusTrap(panelRef, open && places.length > 0 && !occluded, true);

  useEffect(() => {
    if (!open || places.length === 0 || occluded) return;
    closeBtnRef.current?.focus({ preventScroll: true });
  }, [occluded, open, places.length]);
  return (
    <AnimatePresence>
      {open && places.length > 0 && (
        <>
          {/*
           * Scrim is a sibling of the dialog (not an ancestor) so we can mark
           * it `aria-hidden` without also hiding the dialog from screen
           * readers via the aria-hidden ancestor rule. Clicks on the scrim
           * still dismiss the comparison; clicks on empty space inside the
           * scroll container pass through (pointer-events: none on the
           * dialog frame, pointer-events: auto on the actual card column).
           */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={scrimFadeTransition(!!reduceMotion)}
            className="tc-modal-scrim fixed inset-0 z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 1 } : { y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { y: 30, opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : MOTION_DURATION_BASE_S,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            tabIndex={-1}
            className="fixed inset-0 z-50 overflow-y-auto pointer-events-none"
          >
            {/*
             * `presentation` role + `onClick stopPropagation` prevents clicks
             * on the column-strip padding from bubbling up to the scrim and
             * dismissing the modal. The dialog itself owns Escape via the
             * global keyboard hook and the focus trap, so no keyboard handler
             * is needed on this purely structural container.
             */}
            <div
              role="presentation"
              className="compare-dialog__frame max-w-[1280px] mx-auto pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
            <div className="compare-dialog__head">
              <div className="compare-dialog__title">
                <div className="compare-dialog__eyebrow">Compare</div>
                <h2 id={titleId} className="compare-dialog__title-text">{title}</h2>
                <p className="compare-dialog__helper">{helperText}</p>
                {/* Polite count so screen-reader users hear the set grow/shrink
                    when places are added or removed while the dialog is open
                    (the labelledby title only announces on initial open). */}
                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{`Now comparing ${placeCount}.`}</div>
              </div>
              <div className="compare-dialog__actions">
                {homePlace && onAddPlace && !places.some(pl => pl.id === homePlace.id) && places.length < COMPARE_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => onAddPlace(homePlace.id)}
                    className="btn-ghost !text-xs !py-1.5"
                    aria-label={`Add your home base, ${homePlace.name}, to the comparison`}
                    title={`Put ${homePlace.name} side by side with the finalists so the columns share your baseline.`}
                  >
                    <Home className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
                    Add home ({homePlace.name})
                  </button>
                ) : null}
                {onCopyView ? (
                  <button
                    type="button"
                    onClick={onCopyView}
                    className={`btn-ghost !text-xs !py-1.5 ${shareStatus === "failed" ? "!border-[rgba(232,90,50,0.45)] !text-ember-700" : ""}`}
                    aria-label="Copy comparison link"
                    title="Copy a shareable URL for this comparison"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
                    <span aria-live="polite">
                      {shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Copy failed" : "Copy comparison"}
                    </span>
                  </button>
                ) : null}
                <button ref={closeBtnRef} type="button" onClick={onClose} className="btn-ghost"><X className="w-4 h-4" /> Close</button>
              </div>
            </div>

            {scenario !== "now" ? (
              <div className="compare-scenario-banner" role="note">
                <Clock3 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>
                  Climate charts and scores use the <strong>{scenarioMeta(scenario).label}</strong> illustrative regional projection — the same layer as the Explorer. Place dossiers still show present-day normals.
                </span>
              </div>
            ) : null}

            <section className="compare-workbench" aria-label="Compare workbench">
              <div className="compare-workbench__lens">
                <div className="compare-workbench__lens-copy">
                  <span className="compare-workbench__eyebrow">Priority lens</span>
                  <strong>{comparisonLensLabel(activeComparisonLens)}</strong>
                  <span>{COMPARISON_LENS_OPTIONS.find(option => option.id === activeComparisonLens)?.detail}</span>
                </div>
                <div className="compare-workbench__lens-options" role="group" aria-label="Comparison priority lens">
                  {COMPARISON_LENS_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className="compare-workbench__lens-option"
                      aria-pressed={option.id === activeComparisonLens}
                      title={option.detail}
                      onClick={() => onComparisonLensChange?.(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="compare-workbench__tray" aria-label="Candidate tray">
                <div className="compare-workbench__tray-head">
                  <div>
                    <span className="compare-workbench__eyebrow">Candidates</span>
                    <strong>{places.length}/{COMPARE_LIMIT} active / {candidateCountRead}</strong>
                  </div>
                  <span>Shortlist, recent places, and current leaders stay in reach.</span>
                </div>
                <div className="compare-workbench__candidate-tools" aria-label="Candidate finder">
                  <label className="compare-workbench__candidate-search" htmlFor={candidateSearchId}>
                    <span className="sr-only">Find Workbench candidates</span>
                    <input
                      id={candidateSearchId}
                      type="search"
                      value={candidateQuery}
                      onChange={event => setCandidateQuery(event.currentTarget.value)}
                      placeholder="Find by place, region, source..."
                    />
                  </label>
                  <div className="compare-workbench__source-filter" role="group" aria-label="Candidate source filter">
                    {CANDIDATE_SOURCE_FILTERS.map(filter => (
                      <button
                        key={filter.id}
                        type="button"
                        className="compare-workbench__source-filter-btn"
                        aria-pressed={filter.id === candidateSourceFilter}
                        onClick={() => setCandidateSourceFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="compare-workbench__candidate-scroll">
                  {filteredCandidateTray.length > 0 ? filteredCandidateTray.map(candidate => {
                    const active = activeCandidateIds.has(candidate.place.id);
                    const action = active
                      ? `Remove ${candidate.place.name} from active comparison`
                      : places.length >= COMPARE_LIMIT
                        ? `Swap ${candidate.place.name} into active comparison`
                        : `Add ${candidate.place.name} to active comparison`;
                    return (
                      <button
                        key={`${candidate.source}-${candidate.place.id}`}
                        type="button"
                        className="compare-workbench__candidate"
                        data-active={active ? "true" : undefined}
                        data-source={candidate.source.toLowerCase()}
                        aria-pressed={active}
                        aria-label={action}
                        title={candidate.note ?? `${candidate.place.region}, ${candidate.place.country}`}
                        onClick={() => onAddPlace?.(candidate.place.id)}
                      >
                        <span className="compare-workbench__candidate-name">{candidate.place.name}</span>
                        <span className="compare-workbench__candidate-meta">
                          <span>{candidate.source}</span>
                          <strong>{candidate.place.region}</strong>
                        </span>
                      </button>
                    );
                  }) : (
                    <div className="compare-workbench__candidate-empty" role="status">
                      No candidates match this finder.
                    </div>
                  )}
                </div>
              </div>

              {coachRecommendations.length > 0 ? (
                <div className="compare-workbench__coach" aria-label="Contrast coach">
                  <div className="compare-workbench__coach-head">
                    <div>
                      <span className="compare-workbench__eyebrow">Contrast coach</span>
                      <strong>Best swaps to learn faster</strong>
                    </div>
                    <span>Use these candidates when the active set needs a clearer tradeoff.</span>
                  </div>
                  <div className="compare-workbench__coach-grid">
                    {coachRecommendations.map(recommendation => {
                      const action = places.length >= COMPARE_LIMIT
                        ? `Swap ${recommendation.place.name} into active comparison from Contrast coach: ${recommendation.label}`
                        : `Add ${recommendation.place.name} to active comparison from Contrast coach: ${recommendation.label}`;
                      return (
                        <button
                          key={`${recommendation.lane}-${recommendation.place.id}`}
                          type="button"
                          className="compare-workbench__coach-card"
                          aria-label={action}
                          onClick={() => onAddPlace?.(recommendation.place.id)}
                        >
                          <span className="compare-workbench__coach-label">{recommendation.label}</span>
                          <strong>{recommendation.place.name}</strong>
                          <span className="compare-workbench__coach-metric">{recommendation.metric}</span>
                          <span className="compare-workbench__coach-detail">{recommendation.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            {compareLensReceipt ? (
              <section className="compare-lens-receipt" aria-label="Comparison scoring lens">
                <div className="compare-lens-receipt__copy">
                  <span className="compare-lens-receipt__eyebrow">Score lens</span>
                  <p>{compareLensReceipt.summary}</p>
                  <span>{compareLensReceipt.honesty}</span>
                </div>
                <div className="compare-lens-receipt__chips" aria-label="Active comparison lens ingredients">
                  {compareLensReceipt.chips.map(chip => (
                    <span key={`${chip.label}-${chip.value}`} className="compare-lens-receipt__chip">
                      <span>{chip.label}</span>
                      <strong>{chip.value}</strong>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {decisionRead ? (
              <section className="compare-decision-read" aria-label="Comparison decision read">
                <div className="compare-decision-read__summary">
                  <span className="compare-decision-read__eyebrow">Decision read</span>
                  <p>{decisionRead.summary}</p>
                  <span className="compare-decision-read__caution">{decisionRead.caution}</span>
                  <div className="compare-decision-read__next">
                    <span className="compare-decision-read__next-label">Next action</span>
                    <span className="compare-decision-read__next-copy">{decisionRead.nextAction}</span>
                    {onOpenPlace ? (
                      <div className="compare-decision-read__actions">
                        <button
                          type="button"
                          className="compare-decision-read__action"
                          aria-label={`Open first dossier: ${decisionRead.primary.place.name}`}
                          onClick={() => onOpenPlace(decisionRead.primary.place.id)}
                        >
                          <span>Start dossier</span>
                          <strong title={decisionRead.primary.place.name}>{decisionRead.primary.place.name}</strong>
                        </button>
                        {decisionRead.counterweight ? (
                          <button
                            type="button"
                            className="compare-decision-read__action"
                            aria-label={`Open counterweight dossier: ${decisionRead.counterweight.place.name}`}
                            onClick={() => {
                              const counterweight = decisionRead.counterweight;
                              if (counterweight) onOpenPlace(counterweight.place.id);
                            }}
                          >
                            <span>{decisionRead.counterweight.label}</span>
                            <strong title={decisionRead.counterweight.place.name}>{decisionRead.counterweight.place.name}</strong>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="compare-decision-read__scout-sequence" aria-label="Scouting sequence">
                  <div className="compare-decision-read__scout-head">
                    <span className="compare-decision-read__scout-kicker">Scout sequence</span>
                    <span className="compare-decision-read__scout-copy">Visit order, timing, and the first caveat to verify.</span>
                  </div>
                  <div className="compare-decision-read__scout-steps">
                    {decisionRead.scoutSequence.map((step, index) => {
                      const content = (
                        <>
                          <span className="compare-decision-read__scout-label">{index + 1}. {step.label}</span>
                          <strong title={step.place.name}>{step.place.name}</strong>
                          <span className="compare-decision-read__scout-window">{step.visitWindow}</span>
                          <span className="compare-decision-read__scout-detail">{step.visitDetail}</span>
                          <span className="compare-decision-read__scout-caveat">{step.caveat}</span>
                        </>
                      );
                      return onOpenPlace ? (
                        <button
                          key={`${step.label}-${step.place.id}`}
                          type="button"
                          className="compare-decision-read__scout-step compare-decision-read__scout-step--button"
                          aria-label={`Open ${step.place.name} from scouting sequence: ${step.label}. ${step.why}`}
                          onClick={() => onOpenPlace(step.place.id)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div key={`${step.label}-${step.place.id}`} className="compare-decision-read__scout-step">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="compare-decision-read__lanes">
                  {decisionRead.lanes.map(lane => (
                    <div key={lane.label} className="compare-decision-read__lane">
                      <span className="compare-decision-read__lane-label">{lane.label}</span>
                      <span className="compare-decision-read__lane-place" title={lane.place.name}>{lane.place.name}</span>
                      <span className="compare-decision-read__lane-value">{lane.value}</span>
                      <span className="compare-decision-read__lane-detail">{lane.detail}</span>
                    </div>
                  ))}
                </div>
                <div className="compare-finalist-table" aria-label="Finalist decision table">
                  <div className="compare-finalist-table__head">
                    <span className="compare-finalist-table__kicker">Finalist table</span>
                    <span className="compare-finalist-table__copy">Role, score, timing, and first caution for every saved place.</span>
                  </div>
                  <div className="compare-finalist-table__scroll" aria-label="Scrollable finalist decision table">
                    <table>
                      <caption className="sr-only">Decision table for saved compare finalists</caption>
                      <thead>
                        <tr>
                          <th scope="col">Role</th>
                          <th scope="col">Place</th>
                          <th scope="col">Score</th>
                          <th scope="col">Fit</th>
                          <th scope="col">Risk</th>
                          <th scope="col">Visit</th>
                          <th scope="col">Watch first</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decisionRead.tableRows.map(row => (
                          <tr key={row.place.id}>
                            <td><span className="compare-finalist-table__role">{row.role}</span></td>
                            <td>
                              {onOpenPlace ? (
                                <button
                                  type="button"
                                  className="compare-finalist-table__place"
                                  aria-label={`Open ${row.place.name} from finalist decision table`}
                                  onClick={() => onOpenPlace(row.place.id)}
                                >
                                  {row.place.name}
                                </button>
                              ) : (
                                <span className="compare-finalist-table__place-text">{row.place.name}</span>
                              )}
                            </td>
                            <td className="font-mono-num">{row.decisionScore}/100</td>
                            <td>{row.fitSummary}</td>
                            <td>{row.riskSummary}</td>
                            <td>{row.visitWindow}</td>
                            <td>{prose(row.watch)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : null}

            {singlePlaceGuide ? (
              <section className="compare-single-guide" aria-label="Single finalist compare setup">
                <div className="compare-single-guide__copy">
                  <span className="compare-single-guide__eyebrow">Shortlist setup</span>
                  <p>{singlePlaceGuide.summary}</p>
                  <span>{singlePlaceGuide.nextMove}</span>
                </div>
                <div className="compare-single-guide__checks" aria-label="Next compare contrasts">
                  {singlePlaceGuide.checks.map(check => (
                    <div key={check.label} className="compare-single-guide__check">
                      <span>{check.label}</span>
                      <strong>{check.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="compare-single-guide__actions">
                  {onOpenPlace ? (
                    <button
                      type="button"
                      className="compare-decision-read__action"
                      aria-label={`Review anchor dossier: ${singlePlaceGuide.placeName}`}
                      onClick={() => onOpenPlace(singlePlaceGuide.placeId)}
                    >
                      <span>Review anchor</span>
                      <strong title={singlePlaceGuide.placeName}>{singlePlaceGuide.placeName}</strong>
                    </button>
                  ) : null}
                  <button type="button" className="compare-single-guide__keep-scouting" onClick={onClose}>
                    Keep scouting
                  </button>
                </div>
              </section>
            ) : null}

            <section className="compare-diff-board" aria-label="Grouped comparison rows">
              <div className="compare-diff-board__head">
                <div>
                  <span className="compare-diff-board__eyebrow">Difference board</span>
                  <strong>{showDifferencesOnly ? `${visibleGroupedRows.length} signals differ` : `${groupedRows.length} grouped signals`}</strong>
                </div>
                <button
                  type="button"
                  className="compare-diff-board__toggle"
                  aria-pressed={showDifferencesOnly}
                  onClick={() => setShowDifferencesOnly(value => !value)}
                >
                  Show differences only
                </button>
              </div>
              <div className="compare-diff-board__scroll" aria-label="Scrollable grouped comparison rows">
                <table>
                  <caption className="sr-only">Grouped comparison signals for active places</caption>
                  <thead>
                    <tr>
                      <th scope="col">Group</th>
                      <th scope="col">Signal</th>
                      {places.map(place => (
                        <th key={place.id} scope="col">{place.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGroupedRows.length > 0 ? visibleGroupedRows.map(row => (
                      <tr key={`${row.group}-${row.label}`} data-different={row.different ? "true" : undefined}>
                        <td className="compare-diff-board__group">{row.group}</td>
                        <th scope="row">{row.label}</th>
                        {row.values.map((value, index) => (
                          <td key={`${row.group}-${row.label}-${places[index]?.id ?? index}`}>{value}</td>
                        ))}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={places.length + 2}>All visible grouped signals match across these active places.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {compareHighlights.length > 0 ? (
              <div className="compare-insight-strip" aria-label="Comparison highlights">
                {compareHighlights.map(item => (
                  <div key={item.label} className="compare-insight-strip__item">
                    <span className="compare-insight-strip__label">{item.label}</span>
                    {onOpenPlace ? (
                      <button
                        type="button"
                        className="compare-insight-strip__place compare-insight-strip__place--link"
                        title={`Open profile: ${item.place.name}`}
                        onClick={() => onOpenPlace(item.place.id)}
                      >
                        {item.place.name}
                      </button>
                    ) : (
                      <span className="compare-insight-strip__place" title={item.place.name}>{item.place.name}</span>
                    )}
                    <span className="compare-insight-strip__value">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="text-caption text-stone-readable lg:hidden mb-2 flex items-center gap-1">
              {isSinglePlace ? (
                "Add a second place to unlock the comparison lane."
              ) : (
                <>
                  <span>Swipe sideways to compare</span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
                  <span className="font-mono-num">({placeCount})</span>
                </>
              )}
            </p>
            <details className="compare-bioclim-key lg:hidden">
              <summary>Bioclim key</summary>
              <dl>
                <div>
                  <dt>De Martonne</dt>
                  <dd>annual aridity</dd>
                </div>
                <div>
                  <dt>Conrad</dt>
                  <dd>continentality</dd>
                </div>
                <div>
                  <dt>Selianinov HTC</dt>
                  <dd>growing-season moisture</dd>
                </div>
                <div>
                  <dt>Thornthwaite PET</dt>
                  <dd>evaporative demand</dd>
                </div>
                <div>
                  <dt>UNEP P/PET</dt>
                  <dd>precipitation to PET</dd>
                </div>
              </dl>
            </details>
            <div className="overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scroll-smooth" aria-label="Scrollable comparison columns" style={{ touchAction: "pan-x pan-y" }}>
              <div className="grid gap-4 min-w-full snap-mandatory" style={{ gridTemplateColumns: columnTemplate }}>
              {places.map(p => {
                const geo = buildGeospatialAnalysis(p);
                const decision = decisionById.get(p.id)!;
                const bio = computeBioclim(p);
                const utci = apparentComfortIndex(p);
                return (
                <div key={p.id} className="panel p-4 relative snap-start tc-compare-col">
                  <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name} from comparison`} className="absolute top-2 right-2 text-stone hover:text-ice min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-xs text-stone">{p.region}, {p.country}</div>
                  {onOpenPlace ? (
                    <button
                      type="button"
                      className="font-atlas text-lg text-ice mb-3 text-left hover:underline focus-visible:underline"
                      aria-label={`Open ${p.name} profile`}
                      onClick={() => onOpenPlace(p.id)}
                    >
                      {p.name}
                    </button>
                  ) : (
                    <h3 className="font-atlas text-lg text-ice mb-3">{p.name}</h3>
                  )}

                  <MicroclimateFingerprint place={p} size={220} compactLabels />

                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm tc-compare-stats">
                    <Row label="Elevation" value={fmtElev(p.elevationM, dist)} />
                    <Row label="Köppen" value={p.koppen} wide />
                    <Row label="De Martonne" value={bio ? bioclimRow(bio.deMartonne, v => v.toFixed(1)) : "—"} wide />
                    <Row label="Conrad" value={bio ? bioclimRow(bio.conrad, v => v.toFixed(1)) : "—"} wide />
                    <Row label="Selianinov HTC" value={bio ? bioclimRow(bio.selianinov, v => v.toFixed(2)) : "—"} wide />
                    <Row label="UNEP P/PET" value={bio ? bioclimRow(bio.unepAridity, v => v.toFixed(2)) : "—"} wide />
                    <Row label="Thornthwaite PET" value={bio ? `${Math.round(bio.thornthwaitePet.value)} mm` : "—"} />
                    <Row label="JJA high" value={fmtTemp(meanSummerHigh(p), temp, { digits: 1 })} />
                    <Row label="Jan low" value={fmtTemp(meanJanLow(p), temp, { digits: 1 })} />
                    <Row label="Annual precip" value={fmtPrecip(getAnnualPrecipMm(p), dist)} />
                    <Row label="Frost-free" value={`${p.climate.frostFreeDays ?? "—"} d`} />
                    <Row label="Hardiness" value={p.growability.hardinessZone ?? p.climate.hardinessZone ?? "—"} />
                    <Row label="Chill hrs" value={`${p.climate.chillHours ?? "—"}`} />
                    <Row label="Live-here fit" value={`${decision.liveFitScore}/100`} />
                    <Row label="Livability" value={`${decision.livabilityScore}/100`} />
                    <Row label="Felt comfort" value={`${decision.feltComfort}/100`} />
                    <Row label="Feels-like JJA (UTCI*)" value={`${fmtTemp(utci.warmSeasonApparentHighC, temp, { digits: 0 })} · ${utci.score}/100`} wide />
                    <Row label="Easy months" value={`${decision.easyMonths}/12`} />
                    <Row label="Lived ease" value={`${decision.livedEase}/100`} />
                    <Row label="Uniqueness" value={p.scores.microclimateUniqueness.toString()} />
                    <Row label="Geo signal" value={`${geo.geospatialSignalScore}/100`} />
                    <Row label="EO fit" value={`${geo.eoObservabilityScore}/100`} />
                    <Row label="Hidden gem" value={p.scores.hiddenGem.toString()} />
                    <Row label="Resilience" value={p.scores.resilience.toString()} />
                    <Row label="Growability" value={p.scores.growability.toString()} />
                  </div>

                  {homePlace ? (
                    <HomeDeltaStrip place={p} home={homePlace} />
                  ) : null}

                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Climate ribbon</div>
                    <ClimateRibbon highs={p.climate.tempHighC} lows={p.climate.tempLowC} height={140} />
                  </div>

                  <p className="text-sm text-frost mt-3 leading-snug">{prose(p.summaryShort)}</p>
                </div>
                );
              })}
              </div>
            </div>
            <p className="text-caption text-stone-readable mt-2 px-1 leading-snug">
              * Feels-like (UTCI-style) is a warm-season heat-and-humidity strain screen from air temperature and relative humidity only — no wind, solar, or radiant-temperature inputs. Not a true UTCI value.
            </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface GroupedComparisonRow {
  group: string;
  label: string;
  values: string[];
  different: boolean;
}

function buildGroupedComparisonRows(
  places: readonly Place[],
  decisionById: Map<string, CompareDecisionProfile>,
  lens: ComparisonLensId,
  tempUnit: ReturnType<typeof useUnits>["temp"],
  distUnit: ReturnType<typeof useUnits>["dist"],
): GroupedComparisonRow[] {
  const row = (group: string, label: string, values: string[]): GroupedComparisonRow => ({
    group,
    label,
    values,
    different: new Set(values.map(value => value.toLowerCase())).size > 1,
  });
  const score = (value: number | null | undefined) => value == null ? "not graded" : `${Math.round(value)}/100`;
  const decisionScore = (place: Place, pick: (profile: CompareDecisionProfile) => number) => {
    const profile = decisionById.get(place.id);
    return profile ? `${pick(profile)}/100` : "not graded";
  };
  const meanPercent = (values: readonly number[] | undefined) => values?.length
    ? `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)}%`
    : "not sourced";
  const meanSunshine = (place: Place) => meanPercent(place.climate.sunshinePct);
  const meanHumidity = (place: Place) => meanPercent(place.climate.humidity);
  const httpsCitations = (place: Place) => `${place.citations.filter(citation => citation.url?.startsWith("https://")).length}`;

  return [
    row("Comfort", "Priority lens score", places.map(place => {
      const profile = decisionById.get(place.id);
      return profile ? `${compareLensScore(profile, lens)}/100` : "not graded";
    })),
    row("Comfort", "JJA high", places.map(place => fmtTemp(meanSummerHigh(place), tempUnit, { digits: 1 }))),
    row("Comfort", "Jan low", places.map(place => fmtTemp(meanJanLow(place), tempUnit, { digits: 1 }))),
    row("Comfort", "Felt comfort", places.map(place => decisionScore(place, profile => profile.feltComfort))),
    row("Comfort", "Humidity", places.map(meanHumidity)),
    row("Seasonality", "Koppen", places.map(place => place.koppen)),
    row("Seasonality", "Easy months", places.map(place => {
      const profile = decisionById.get(place.id);
      return profile ? `${profile.easyMonths}/12` : "not graded";
    })),
    row("Seasonality", "Annual precip", places.map(place => fmtPrecip(getAnnualPrecipMm(place), distUnit))),
    row("Seasonality", "Sunshine", places.map(meanSunshine)),
    row("Seasonality", "Frost-free", places.map(place => place.climate.frostFreeDays == null ? "not sourced" : `${place.climate.frostFreeDays} d`)),
    row("Hazards", "Risk load", places.map(place => {
      const profile = decisionById.get(place.id);
      return profile ? `${profile.riskLoad}/100` : "not graded";
    })),
    row("Hazards", "Top hazard", places.map(topRiskValue)),
    row("Hazards", "Extreme heat", places.map(place => RISK_LABELS[place.risks.extremeHeat.level])),
    row("Hazards", "Wildfire / smoke", places.map(place => `${RISK_LABELS[place.risks.wildfire.level]} / ${RISK_LABELS[place.risks.smoke.level]}`)),
    row("Lived friction", "Live-here fit", places.map(place => decisionScore(place, profile => profile.liveFitScore))),
    row("Lived friction", "Livability", places.map(place => decisionScore(place, profile => profile.livabilityScore))),
    row("Lived friction", "Lived ease", places.map(place => decisionScore(place, profile => profile.livedEase))),
    row("Access/cost", "Cost pressure", places.map(place => score(place.liveSignals?.costPressure))),
    row("Access/cost", "Access friction", places.map(place => score(place.liveSignals?.accessFriction))),
    row("Access/cost", "Social stress", places.map(place => score(place.liveSignals?.socialStress))),
    row("Garden/land", "Growability", places.map(place => score(place.scores.growability))),
    row("Garden/land", "Hardiness", places.map(place => place.growability.hardinessZone ?? place.climate.hardinessZone ?? "not sourced")),
    row("Garden/land", "Elevation", places.map(place => fmtElev(place.elevationM, distUnit))),
    row("Garden/land", "Soil drainage", places.map(place => place.soil.drainage)),
    row("Evidence", "Tier", places.map(place => place.tier)),
    row("Evidence", "Confidence", places.map(place => place.confidence)),
    row("Evidence", "HTTPS citations", places.map(httpsCitations)),
    row("Evidence", "Deep sections", places.map(place => `${place.deepSections?.length ?? 0}`)),
  ];
}

function topRiskValue(place: Place): string {
  const [axis, risk] = (Object.entries(place.risks) as Array<
    [keyof Place["risks"], Place["risks"][keyof Place["risks"]]]
  >).sort((a, b) => RISK_VALUE[b[1].level] - RISK_VALUE[a[1].level] || RISK_AXIS_LABELS[a[0]].localeCompare(RISK_AXIS_LABELS[b[0]]))[0]!;
  return `${RISK_AXIS_LABELS[axis]}: ${RISK_LABELS[risk.level]}`;
}

function HomeDeltaStrip({ place, home }: { place: Place; home: Place }) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const comparison = useMemo(() => buildHomeBaseComparison(home, place), [home, place]);
  if (comparison.isSame) {
    return (
      <div className="mt-3" aria-label={`${place.name} is your home base`}>
        <span className="chip" data-tone="glacier">
          <Home className="w-3 h-3" aria-hidden /> Your home base
        </span>
      </div>
    );
  }
  const chips = pickHomeDeltaChips(comparison, 4);
  return (
    <div className="mt-3" aria-label={`${place.name} versus home base ${home.name}`} title={prose(comparison.headline)}>
      <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Vs home · {home.name}</div>
      <div className="flex flex-wrap gap-1">
        {chips.length === 0 ? (
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
              {signal.shortLabel} <span className="font-mono-num">{formatHomeDeltaValue(signal, temp, dist)}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function bioclimRow(idx: BioclimIndex, format: (v: number) => string): string {
  if (idx.value === null) {
    return idx.reason === "no_growing_season" ? "— (no growing season)"
      : idx.reason === "mat_below_neg10" ? "— (MAT ≤ −10 °C)"
      : "— (no PET)";
  }
  return `${format(idx.value)} · ${idx.classLabel}`;
}

const RISK_LABELS: Record<RiskLevel, string> = {
  "very-low": "very low",
  low: "low",
  moderate: "moderate",
  elevated: "elevated",
  high: "high",
  "very-high": "very high",
};

const RISK_AXIS_LABELS: Record<keyof Place["risks"], string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal",
};

function joinReadable(parts: readonly string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function buildCompareLensReceipt(
  filters: LiveFitFilters | undefined,
  scenario: ScenarioId,
  tempUnit: ReturnType<typeof useUnits>["temp"],
): {
  summary: string;
  honesty: string;
  chips: { label: string; value: string }[];
} | null {
  const fitPresets = filters?.fitPresets;
  const presetLabels = LIVE_FIT_PRESETS
    .filter(preset => fitPresets?.has(preset.id))
    .map(preset => LIVE_FIT_PRESET_BY_ID[preset.id].label);
  const thresholds: string[] = [];
  const chips: { label: string; value: string }[] = [];

  if (presetLabels.length > 0) {
    chips.push({ label: "Signals", value: joinReadable(presetLabels.slice(0, 3)) });
  }
  if (filters?.maxSummerHighC != null) {
    const value = `summer <= ${fmtTemp(filters.maxSummerHighC, tempUnit)}`;
    thresholds.push(value);
    chips.push({ label: "Heat cap", value });
  }
  if (filters?.minWinterLowC != null) {
    const value = `winter >= ${fmtTemp(filters.minWinterLowC, tempUnit)}`;
    thresholds.push(value);
    chips.push({ label: "Cold floor", value });
  }
  if (filters?.minGrowability != null) {
    const value = `growability >= ${filters.minGrowability}/100`;
    thresholds.push(value);
    chips.push({ label: "Garden floor", value });
  }
  if (filters?.maxFireRisk) {
    const value = `fire <= ${RISK_LABELS[filters.maxFireRisk]}`;
    thresholds.push(value);
    chips.push({ label: "Fire ceiling", value });
  }
  if (filters?.maxOverallRisk) {
    const value = `risk <= ${RISK_LABELS[filters.maxOverallRisk]}`;
    thresholds.push(value);
    chips.push({ label: "Risk ceiling", value });
  }

  const hasFitLens = presetLabels.length > 0 || thresholds.length > 0;
  const hasScenarioLens = scenario !== "now";
  if (!hasFitLens && !hasScenarioLens) return null;

  const scenarioLabel = hasScenarioLens ? scenarioMeta(scenario).label : "present-day normals";
  chips.push({ label: "Climate layer", value: scenarioLabel });

  const signalRead = presetLabels.length > 0 ? joinReadable(presetLabels.slice(0, 3)) : "the broad Compare blend";
  const thresholdRead = thresholds.length > 0 ? ` with hard checks for ${joinReadable(thresholds.slice(0, 3))}` : "";
  return {
    summary: `Fit and finalist scores are being read through ${signalRead}${thresholdRead}.`,
    honesty: `Use this as a screening lens under ${scenarioLabel}; open dossiers before treating a place as a real-world finalist.`,
    chips,
  };
}

function buildSinglePlaceGuide(profile: CompareDecisionProfile | undefined) {
  if (!profile) return null;
  const { place } = profile;
  return {
    placeId: place.id,
    placeName: place.name,
    summary: `${place.name} is saved as the anchor finalist (${profile.liveFitScore}/100 fit · ${profile.easyMonths}/12 easy months).`,
    nextMove: "Add a peer or counterweight before trusting the comparison read; two places unlock tradeoffs, while three or four make the Scout sequence stronger.",
    checks: [
      { label: "Anchor signal", value: `${profile.livabilityScore}/100 livability` },
      { label: "First contrast", value: "similar goal, different climate" },
      { label: "Counterweight", value: "lower risk or lower friction" },
    ],
  };
}

function Row({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  const columns = wide
    ? "col-span-2 grid-cols-[minmax(0,0.45fr)_minmax(0,1.55fr)]"
    : "grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]";
  return (
    <div className={`grid ${columns} items-baseline gap-2 py-1 border-b last:border-0 border-[rgba(71,90,122,0.3)]`}>
      <span className="min-w-0 text-stone text-xs uppercase tracking-wide leading-snug">{label}</span>
      <span className="min-w-0 text-frost font-mono-num text-right leading-snug break-words">{value}</span>
    </div>
  );
}
