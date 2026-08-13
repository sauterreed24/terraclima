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
import { buildCompareCandidateSwapInsight, buildCompareCoachRecommendations } from "../lib/compare-workbench-coach";
import { buildHomeBaseComparison, formatHomeDeltaValue, pickHomeDeltaChips } from "../lib/home-base";
import { COMPARE_LIMIT } from "../lib/app-url";
import type { ShareStatus } from "../lib/app-constants";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useElementIsolation } from "../hooks/use-element-isolation";
import { ChevronRight, Clock3, Home, Link2, Plus, RefreshCcw, X } from "lucide-react";
import { effectiveAccessRemoteness, effectiveHousingPressure } from "../lib/research/lived-indicators";

type CandidateSourceFilter = "all" | CompareCandidateSource;
type CandidateSortId = "curated" | "lens" | "risk" | "easy" | "name";

const CANDIDATE_SOURCE_FILTERS: readonly { id: CandidateSourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Shortlist", label: "Shortlist" },
  { id: "Recent", label: "Recent" },
  { id: "Ranked", label: "Ranked" },
];

const CANDIDATE_SORT_OPTIONS: readonly { id: CandidateSortId; label: string }[] = [
  { id: "curated", label: "Curated" },
  { id: "lens", label: "Lens score" },
  { id: "risk", label: "Lowest risk" },
  { id: "easy", label: "Easy months" },
  { id: "name", label: "A-Z" },
];

interface Props {
  places: Place[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onCopyView?: () => void;
  shareStatus?: ShareStatus;
  shareFallbackUrl?: string | null;
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
  shareFallbackUrl = null,
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
  const candidateSearchRef = useRef<HTMLInputElement>(null);
  const shareFallbackInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const candidateSearchId = useId();
  const candidateSortId = useId();
  const candidateSearchLabel = "Find Workbench candidates by name, region, source, or scouting note";
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateSourceFilter, setCandidateSourceFilter] = useState<CandidateSourceFilter>("all");
  const [candidateSort, setCandidateSort] = useState<CandidateSortId>("curated");
  const activeComparisonLens = comparisonLens ?? DEFAULT_COMPARISON_LENS;
  const activeComparisonLensLabel = comparisonLensLabel(activeComparisonLens);
  const placeCount = `${places.length} ${places.length === 1 ? "place" : "places"}`;
  const isSinglePlace = places.length === 1;
  const title = isSinglePlace ? `${placeCount} saved to compare` : `${placeCount} side by side`;
  const helperText = isSinglePlace
    ? "Add another place from any card or profile to start a side-by-side comparison."
    : "Compare climate fingerprints, seasonal ranges, and screening scores across the saved places.";
  const copyComparisonLabel =
    shareStatus === "failed"
      ? "Retry copy or use the selected manual comparison URL"
      : "Copy or share comparison link";
  const decisionProfiles = useMemo<CompareDecisionProfile[]>(
    () => buildCompareDecisionProfiles(places, liveFitFilters),
    [places, liveFitFilters],
  );
  const decisionById = useMemo(
    () => new Map(decisionProfiles.map(profile => [profile.place.id, profile])),
    [decisionProfiles],
  );
  const columnMetricsById = useMemo(() => {
    const map = new Map<string, {
      geo: ReturnType<typeof buildGeospatialAnalysis>;
      bio: ReturnType<typeof computeBioclim>;
      utci: ReturnType<typeof apparentComfortIndex>;
    }>();
    for (const place of places) {
      map.set(place.id, {
        geo: buildGeospatialAnalysis(place),
        bio: computeBioclim(place),
        utci: apparentComfortIndex(place),
      });
    }
    return map;
  }, [places]);
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
  const candidateDecisionProfiles = useMemo<CompareDecisionProfile[]>(
    () => buildCompareDecisionProfiles(candidateTray.map(candidate => candidate.place), liveFitFilters),
    [candidateTray, liveFitFilters],
  );
  const candidateDecisionById = useMemo(
    () => new Map(candidateDecisionProfiles.map(profile => [profile.place.id, profile])),
    [candidateDecisionProfiles],
  );
  const activeCandidateTray = useMemo(
    () => candidateTray.filter(candidate => candidate.source === "Active"),
    [candidateTray],
  );
  const inactiveCandidateTray = useMemo(
    () => candidateTray.filter(candidate => candidate.source !== "Active"),
    [candidateTray],
  );
  const filteredInactiveCandidateTray = useMemo(() => {
    const query = candidateQuery.trim().toLowerCase();
    const filtered = inactiveCandidateTray.filter(candidate => {
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
    if (candidateSort !== "curated") {
      filtered.sort((a, b) => {
        const profileA = candidateDecisionById.get(a.place.id);
        const profileB = candidateDecisionById.get(b.place.id);
        const nameTie = a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id);
        if (!profileA || !profileB) return nameTie;
        switch (candidateSort) {
          case "lens":
            return compareLensScore(profileB, activeComparisonLens) - compareLensScore(profileA, activeComparisonLens) || nameTie;
          case "risk":
            return profileA.riskLoad - profileB.riskLoad || nameTie;
          case "easy":
            return profileB.easyMonths - profileA.easyMonths || nameTie;
          case "name":
            return nameTie;
          default:
            return 0;
        }
      });
    }
    return filtered;
  }, [activeComparisonLens, candidateDecisionById, candidateQuery, candidateSort, candidateSourceFilter, inactiveCandidateTray]);
  const filteredCandidateTray = useMemo(
    () => [...activeCandidateTray, ...filteredInactiveCandidateTray],
    [activeCandidateTray, filteredInactiveCandidateTray],
  );
  const candidateFinderActive = candidateQuery.trim().length > 0 || candidateSourceFilter !== "all";
  const resetCandidateFinder = () => {
    setCandidateQuery("");
    setCandidateSourceFilter("all");
    candidateSearchRef.current?.focus({ preventScroll: true });
  };
  const candidateMatchWord = filteredInactiveCandidateTray.length === 1 ? "match" : "matches";
  const candidateCountRead = candidateFinderActive
    ? `${filteredInactiveCandidateTray.length}/${inactiveCandidateTray.length} ${candidateMatchWord}`
    : `${candidateTray.length} candidates`;
  const candidateTrayHelper = candidateFinderActive
    ? "Active places stay pinned; finder matches appear after them."
    : "Shortlist, recent places, and current leaders stay in reach.";
  const noInactiveCandidateMatches =
    candidateFinderActive && filteredInactiveCandidateTray.length === 0 && inactiveCandidateTray.length > 0;
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
  const evidenceReadiness = useMemo(
    () => buildCompareEvidenceReadiness(places),
    [places],
  );
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
  // App owns focus restore to compareTriggerRef with retries; leave trap restore off
  // so the two mechanisms do not race on close.
  useFocusTrap(panelRef, open && places.length > 0 && !occluded, false);

  useEffect(() => {
    if (!open || places.length === 0 || occluded) return;
    closeBtnRef.current?.focus({ preventScroll: true });
  }, [occluded, open, places.length]);

  useEffect(() => {
    if (shareStatus !== "failed" || !shareFallbackUrl || occluded) return;
    const focusTimer = window.setTimeout(() => {
      const input = shareFallbackInputRef.current;
      input?.focus({ preventScroll: true });
      input?.select();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [occluded, shareFallbackUrl, shareStatus]);

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
             * The frame only contributes safe-area padding and max width. Keep
             * it pass-through so clicks in empty modal padding reach the scrim;
             * the inner content wrapper owns pointer events for real controls.
             */}
            <div
              role="presentation"
              className="compare-dialog__frame max-w-[1280px] mx-auto"
            >
            <div className="compare-dialog__content">
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
                    aria-label={copyComparisonLabel}
                    title={copyComparisonLabel}
                  >
                    <Link2 className="w-3.5 h-3.5 text-[rgba(26,143,168,0.9)]" aria-hidden />
                    <span aria-live="polite">
                      {shareStatus === "shared" ? "Shared" : shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Manual copy" : "Copy comparison"}
                    </span>
                  </button>
                ) : null}
                {shareStatus === "failed" && shareFallbackUrl ? (
                  <div className="tc-share-fallback compare-dialog__share-fallback" role="group" aria-label="Manual comparison share link">
                    <span className="tc-share-fallback__label">Shareable link</span>
                    <input
                      ref={shareFallbackInputRef}
                      type="text"
                      readOnly
                      value={shareFallbackUrl}
                      className="tc-share-fallback__input"
                      aria-label="Shareable comparison URL for manual copy"
                      onFocus={event => event.currentTarget.select()}
                      onClick={event => event.currentTarget.select()}
                    />
                  </div>
                ) : null}
                <button ref={closeBtnRef} type="button" onClick={onClose} className="btn-ghost" aria-label="Close comparison" title="Close comparison">
                  <X className="w-4 h-4" aria-hidden /> Close
                </button>
              </div>
            </div>

            {scenario !== "now" ? (
              <div className="compare-scenario-banner" role="note">
                <Clock3 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>
                  Climate charts and scores use the <strong>{scenarioMeta(scenario).label}</strong> projection layer — the same layer as the Explorer. Place dossiers still show recent observed normals.
                </span>
              </div>
            ) : null}

            <nav className="compare-dialog__shortcuts" aria-label="Compare decision shortcuts">
              {decisionRead ? (
                <a className="compare-dialog__shortcut compare-dialog__shortcut--primary" href="#compare-decision-read" aria-label="Jump to Compare decision read">
                  Decision read
                </a>
              ) : singlePlaceGuide ? (
                <a className="compare-dialog__shortcut compare-dialog__shortcut--primary" href="#compare-setup-guide" aria-label="Jump to Compare setup guide">
                  Setup guide
                </a>
              ) : null}
              {evidenceReadiness.length > 0 ? (
                <a className="compare-dialog__shortcut" href="#compare-evidence-readiness" aria-label="Jump to Compare evidence readiness">
                  Evidence
                </a>
              ) : null}
              <a className="compare-dialog__shortcut" href="#compare-diff-board" aria-label="Jump to Compare difference board">
                Difference board
              </a>
              <a className="compare-dialog__shortcut" href="#compare-candidates" aria-label="Jump to Compare candidate workbench">
                Candidates
              </a>
            </nav>

            <section id="compare-candidates" className="compare-workbench" aria-label="Compare workbench">
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
                  <span>{candidateTrayHelper}</span>
                  {candidateFinderActive ? (
                    <button
                      type="button"
                      className="btn-ghost compare-workbench__candidate-reset"
                      onClick={resetCandidateFinder}
                      aria-label="Reset candidate finder to all sources"
                      title="Clear candidate search and show all source filters"
                    >
                      Reset finder
                    </button>
                  ) : null}
                </div>
                <div className="compare-workbench__candidate-tools" aria-label="Candidate finder">
                  <label className="compare-workbench__candidate-search" htmlFor={candidateSearchId}>
                    <span className="sr-only">{candidateSearchLabel}</span>
                    <input
                      ref={candidateSearchRef}
                      id={candidateSearchId}
                      type="search"
                      value={candidateQuery}
                      onChange={event => setCandidateQuery(event.currentTarget.value)}
                      onKeyDown={event => {
                        if (event.key !== "Escape" || candidateQuery.length === 0) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setCandidateQuery("");
                      }}
                      aria-label={candidateSearchLabel}
                      title={candidateSearchLabel}
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
                        title={`Show ${filter.label.toLowerCase()} compare candidates`}
                        onClick={() => setCandidateSourceFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <label className="compare-workbench__candidate-sort" htmlFor={candidateSortId}>
                    <span aria-hidden="true">Sort</span>
                    <span className="sr-only">Sort Workbench candidates</span>
                    <select
                      id={candidateSortId}
                      value={candidateSort}
                      onChange={event => setCandidateSort(event.currentTarget.value as CandidateSortId)}
                    >
                      {CANDIDATE_SORT_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {noInactiveCandidateMatches ? (
                  <div className="compare-workbench__candidate-empty compare-workbench__candidate-empty--filtered" role="status">
                    No finder matches outside the active set. Reset finder or try a broader place, region, or source.
                  </div>
                ) : null}
                <div className="compare-workbench__candidate-scroll">
                  {filteredCandidateTray.length > 0 ? filteredCandidateTray.map(candidate => {
                    const active = activeCandidateIds.has(candidate.place.id);
                    const candidateProfile = candidateDecisionById.get(candidate.place.id);
                    const candidateInsight = !active && candidateProfile
                      ? buildCompareCandidateSwapInsight({
                        activeProfiles: decisionProfiles,
                        candidateProfile,
                        lens: activeComparisonLens,
                      })
                      : null;
                    const replacementPlace = !active && places.length >= COMPARE_LIMIT ? places[0] : null;
                    const action = active
                      ? `Remove ${candidate.place.name} from active comparison`
                      : places.length >= COMPARE_LIMIT
                        ? `Swap ${candidate.place.name} into active comparison`
                        : `Add ${candidate.place.name} to active comparison`;
                    const actionCue = active
                      ? { label: "Remove", tone: "remove", Icon: X }
                      : places.length >= COMPARE_LIMIT
                        ? { label: "Swap", tone: "swap", Icon: RefreshCcw }
                        : { label: "Add", tone: "add", Icon: Plus };
                    const CandidateActionIcon = actionCue.Icon;
                    const title = [
                      candidate.note ?? `${candidate.place.region}, ${candidate.place.country}`,
                      candidateInsight ? `${candidateInsight.label}: ${candidateInsight.detail}` : null,
                      replacementPlace ? `Replaces oldest active slot: ${replacementPlace.name}.` : null,
                    ].filter(Boolean).join(" ");
                    return (
                      <button
                        key={`${candidate.source}-${candidate.place.id}`}
                        type="button"
                        className="compare-workbench__candidate"
                        data-active={active ? "true" : undefined}
                        data-source={candidate.source.toLowerCase()}
                        aria-pressed={active}
                        aria-label={action}
                        title={title}
                        onClick={() => active ? onRemove(candidate.place.id) : onAddPlace?.(candidate.place.id)}
                      >
                        <span className="compare-workbench__candidate-topline">
                          <span className="compare-workbench__candidate-name">{candidate.place.name}</span>
                          <span className="compare-workbench__candidate-action" data-action={actionCue.tone}>
                            <CandidateActionIcon aria-hidden="true" />
                            <span>{actionCue.label}</span>
                          </span>
                        </span>
                        <span className="compare-workbench__candidate-meta">
                          <span>{candidate.source}</span>
                          <strong>{candidate.place.region}</strong>
                        </span>
                        {candidateProfile ? (
                          <span className="compare-workbench__candidate-read" aria-label={`${candidate.place.name} candidate read`}>
                            <span>
                              <strong>{compareLensScore(candidateProfile, activeComparisonLens)}/100</strong>
                              <em>{activeComparisonLensLabel}</em>
                            </span>
                            <span>{candidateProfile.easyMonths}/12 easy months</span>
                            <span>{candidateProfile.riskLoad}/100 risk load</span>
                          </span>
                        ) : null}
                        {candidateInsight ? (
                          <span
                            className="compare-workbench__candidate-insight"
                            data-tone={candidateInsight.tone}
                            aria-label={`${candidate.place.name} swap insight`}
                          >
                            <strong>{candidateInsight.label}</strong>
                            <span>{candidateInsight.detail}</span>
                          </span>
                        ) : null}
                        {replacementPlace ? (
                          <span className="compare-workbench__candidate-swap">
                            Replaces {replacementPlace.name}
                          </span>
                        ) : null}
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
                          title={action}
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
              <section id="compare-decision-read" className="compare-decision-read" aria-label="Comparison decision read">
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
                          title={`Open first dossier: ${decisionRead.primary.place.name}`}
                          onClick={event => onOpenPlace(decisionRead.primary.place.id, { trigger: event.currentTarget })}
                        >
                          <span>Start dossier</span>
                          <strong title={decisionRead.primary.place.name}>{decisionRead.primary.place.name}</strong>
                        </button>
                        {decisionRead.counterweight ? (
                          <button
                            type="button"
                            className="compare-decision-read__action"
                            aria-label={`Open counterweight dossier: ${decisionRead.counterweight.place.name}`}
                            title={`Open counterweight dossier: ${decisionRead.counterweight.place.name}`}
                            onClick={event => {
                              const counterweight = decisionRead.counterweight;
                              if (counterweight) onOpenPlace(counterweight.place.id, { trigger: event.currentTarget });
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
                          title={`Open ${step.place.name} from scouting sequence: ${step.label}. ${step.why}`}
                          onClick={event => onOpenPlace(step.place.id, { trigger: event.currentTarget })}
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
                <div className="compare-verification-checklist" aria-label="Scout verification checklist">
                  <div className="compare-verification-checklist__head">
                    <span className="compare-verification-checklist__kicker">Scout verification checklist</span>
                    <span>What to prove before booking a visit, comparing housing, or treating a finalist as move-ready.</span>
                  </div>
                  <div className="compare-verification-checklist__grid">
                    {decisionRead.verificationChecklist.map(item => {
                      const card = (
                        <>
                          <span className="compare-verification-checklist__label">{item.label}</span>
                          <strong title={item.place.name}>{item.place.name}</strong>
                          <span className="compare-verification-checklist__action">{prose(item.action)}</span>
                          <span className="compare-verification-checklist__proof">{prose(item.proof)}</span>
                        </>
                      );
                      return onOpenPlace ? (
                        <button
                          key={item.id}
                          type="button"
                          className="compare-verification-checklist__item compare-verification-checklist__item--button"
                          data-tone={item.tone}
                          aria-label={`Open ${item.place.name} from scout verification checklist: ${item.label}`}
                          title={`Open ${item.place.name} from scout verification checklist: ${item.label}`}
                          onClick={event => onOpenPlace(item.place.id, { trigger: event.currentTarget })}
                        >
                          {card}
                        </button>
                      ) : (
                        <div key={item.id} className="compare-verification-checklist__item" data-tone={item.tone}>
                          {card}
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
                                  title={`Open ${row.place.name} from finalist decision table`}
                                  onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
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

            {evidenceReadiness.length > 0 ? (
              <section id="compare-evidence-readiness" className="compare-evidence-readiness" aria-label="Evidence readiness">
                <div className="compare-evidence-readiness__head">
                  <div>
                    <span className="compare-evidence-readiness__eyebrow">Evidence readiness</span>
                    <strong>{evidenceReadiness[0].place.name}: {evidenceReadiness[0].label}</strong>
                  </div>
                  <span>Source depth, lived signals, and climate-measurement gaps before booking a scout trip or comparing housing.</span>
                </div>
                <div className="compare-evidence-readiness__grid">
                  {evidenceReadiness.map(row => (
                    <article
                      key={row.place.id}
                      className="compare-evidence-readiness__card"
                      data-tone={row.tone}
                      aria-label={`${row.place.name} evidence readiness`}
                    >
                      <div className="compare-evidence-readiness__card-head">
                        <span>{row.label}</span>
                        <strong>{row.score}/100</strong>
                      </div>
                      {onOpenPlace ? (
                        <button
                          type="button"
                          className="compare-evidence-readiness__place"
                          aria-label={`Open ${row.place.name} dossier from evidence readiness`}
                          title={`Open ${row.place.name} dossier from evidence readiness`}
                          onClick={event => onOpenPlace(row.place.id, { trigger: event.currentTarget })}
                        >
                          {row.place.name}
                        </button>
                      ) : (
                        <strong className="compare-evidence-readiness__place-text">{row.place.name}</strong>
                      )}
                      <div className="compare-evidence-readiness__facts" aria-label={`${row.place.name} evidence facts`}>
                        {row.facts.map(fact => <span key={fact}>{fact}</span>)}
                      </div>
                      <p>{row.action}</p>
                      <ul>
                        {row.gaps.map(gap => <li key={gap}>{gap}</li>)}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {singlePlaceGuide ? (
              <section id="compare-setup-guide" className="compare-single-guide" aria-label="Single finalist compare setup">
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
                      title={`Review anchor dossier: ${singlePlaceGuide.placeName}`}
                      onClick={event => onOpenPlace(singlePlaceGuide.placeId, { trigger: event.currentTarget })}
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

            <section id="compare-diff-board" className="compare-diff-board" aria-label="Grouped comparison rows">
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
                        aria-label={`Open ${item.place.name} profile from comparison highlight: ${item.label}`}
                        title={`Open ${item.place.name} profile from comparison highlight: ${item.label}`}
                        onClick={event => onOpenPlace(item.place.id, { trigger: event.currentTarget })}
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
                const metrics = columnMetricsById.get(p.id)!;
                const { geo, bio, utci } = metrics;
                const decision = decisionById.get(p.id)!;
                return (
                <div key={p.id} className="panel p-4 relative snap-start tc-compare-col">
                  <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name} from comparison`} title={`Remove ${p.name} from comparison`} className="absolute top-2 right-2 text-stone hover:text-ice min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-xs text-stone">{p.region}, {p.country}</div>
                  {onOpenPlace ? (
                    <button
                      type="button"
                      className="compare-column-title font-atlas text-lg text-ice mb-3 text-left hover:underline focus-visible:underline"
                      aria-label={`Open ${p.name} profile`}
                      title={`Open ${p.name} profile`}
                      onClick={event => onOpenPlace(p.id, { trigger: event.currentTarget })}
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
                    <Row label="De Martonne" value={bio ? bioclimRow(bio.deMartonne, v => v.toFixed(1), prose) : "—"} wide />
                    <Row label="Conrad" value={bio ? bioclimRow(bio.conrad, v => v.toFixed(1), prose) : "—"} wide />
                    <Row label="Selianinov HTC" value={bio ? bioclimRow(bio.selianinov, v => v.toFixed(2), prose) : "—"} wide />
                    <Row label="UNEP P/PET" value={bio ? bioclimRow(bio.unepAridity, v => v.toFixed(2), prose) : "—"} wide />
                    <Row label="Thornthwaite PET" value={bio ? prose(`${Math.round(bio.thornthwaitePet.value)} mm`) : "—"} />
                    <Row label="Summer high" value={fmtTemp(meanSummerHigh(p), temp, { digits: 1 })} />
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

type EvidenceReadinessTone = "strong" | "review" | "thin";

interface CompareEvidenceReadiness {
  place: Place;
  label: string;
  score: number;
  tone: EvidenceReadinessTone;
  facts: string[];
  gaps: string[];
  action: string;
}

function buildCompareEvidenceReadiness(places: readonly Place[]): CompareEvidenceReadiness[] {
  return places.map(place => {
    const httpsCitations = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
    const deepSections = place.deepSections?.length ?? 0;
    const hasLiveSignals = Boolean(place.liveSignals && Object.values(place.liveSignals).some(value => typeof value === "number"));
    const hasHumidity = Boolean(place.climate.humidity?.length);
    const hasSunshine = Boolean(place.climate.solarEnergyMjM2Day?.length || place.climate.sunshinePct?.length);
    const confidenceScore = place.confidence === "high" ? 34 : place.confidence === "moderate" ? 22 : 10;
    const score = Math.min(100, Math.round(
      confidenceScore +
      Math.min(httpsCitations * 8, 24) +
      Math.min(deepSections * 8, 24) +
      (hasLiveSignals ? 8 : 0) +
      (hasHumidity ? 5 : 0) +
      (hasSunshine ? 5 : 0),
    ));
    const gaps = [
      ...(place.confidence === "low" ? ["Low confidence profile"] : place.confidence === "moderate" ? ["Moderate confidence profile"] : []),
      ...(httpsCitations < 2 ? ["Add a second HTTPS source"] : []),
      ...(deepSections < 1 ? ["Expand deep-dive context"] : []),
      ...(!hasLiveSignals ? ["Fill lived-friction signals"] : []),
      ...(!hasHumidity ? ["Source humidity normals"] : []),
      ...(!hasSunshine ? ["Source solar-resource normals"] : []),
    ].slice(0, 4);
    const label = score >= 78 && gaps.length <= 1
      ? "Ready for scout plan"
      : score >= 58
        ? "Verify before booking"
        : "Thin read - source first";
    const tone: EvidenceReadinessTone = label === "Ready for scout plan" ? "strong" : label === "Verify before booking" ? "review" : "thin";
    const action = gaps.length === 0
      ? "Good enough for side-by-side scouting; still verify parcel-level hazards and logistics."
      : `Check ${gaps[0].toLowerCase()} before treating this finalist as travel- or move-ready.`;
    return {
      place,
      label,
      score,
      tone,
      facts: [
        `${place.confidence} confidence`,
        `${httpsCitations} HTTPS source${httpsCitations === 1 ? "" : "s"}`,
        `${deepSections} deep section${deepSections === 1 ? "" : "s"}`,
        hasLiveSignals ? "lived signals" : "lived signals missing",
      ],
      gaps: gaps.length ? gaps : ["No major source gaps in the current profile"],
      action,
    };
  }).sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
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
  const meanSunshine = (place: Place) => {
    if (place.climate.solarEnergyMjM2Day?.length) {
      const mean = place.climate.solarEnergyMjM2Day.reduce((a, b) => a + b, 0) / 12;
      return Number.isFinite(mean) ? `${mean.toFixed(1)} MJ` : "not sourced";
    }
    return meanPercent(place.climate.sunshinePct);
  };
  const meanHumidity = (place: Place) => meanPercent(place.climate.humidity);
  const httpsCitations = (place: Place) => `${place.citations.filter(citation => citation.url?.startsWith("https://")).length}`;

  return [
    row("Comfort", "Priority lens score", places.map(place => {
      const profile = decisionById.get(place.id);
      return profile ? `${compareLensScore(profile, lens)}/100` : "not graded";
    })),
    row("Comfort", "Summer high", places.map(place => fmtTemp(meanSummerHigh(place), tempUnit, { digits: 1 }))),
    row("Comfort", "Jan low", places.map(place => fmtTemp(meanJanLow(place), tempUnit, { digits: 1 }))),
    row("Comfort", "Felt comfort", places.map(place => decisionScore(place, profile => profile.feltComfort))),
    row("Comfort", "Humidity", places.map(meanHumidity)),
    row("Seasonality", "Koppen", places.map(place => place.koppen)),
    row("Seasonality", "Easy months", places.map(place => {
      const profile = decisionById.get(place.id);
      return profile ? `${profile.easyMonths}/12` : "not graded";
    })),
    row("Seasonality", "Annual precip", places.map(place => fmtPrecip(getAnnualPrecipMm(place), distUnit))),
    row("Seasonality", "Solar resource", places.map(meanSunshine)),
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
    row("Access/cost", "Housing pressure", places.map(place => score(effectiveHousingPressure(place.liveSignals)))),
    row("Access/cost", "Access remoteness", places.map(place => score(effectiveAccessRemoteness(place.liveSignals)))),
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

function bioclimRow(idx: BioclimIndex, format: (v: number) => string, localize: (s: string) => string): string {
  if (idx.value === null) {
    return idx.reason === "no_growing_season" ? "— (no growing season)"
      : idx.reason === "mat_below_neg10" ? localize("— (MAT ≤ −10 °C)")
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
