import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { drawerPanelTransition, scrimFadeTransition } from "../lib/device-profile";
import { use, useState, useEffect, useMemo, useRef, useId, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useElementIsolation } from "../hooks/use-element-isolation";
import type { Place, MicroclimateArchetype, TopographicDriver, ScenarioId } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { PrecipBars } from "./charts/PrecipBars";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { RiskProfile } from "./charts/RiskProfile";
import { ContrastChart } from "./charts/ContrastChart";
import { ClimateChangeDelta } from "./charts/ClimateChangeDelta";
import { ComfortMatrix } from "./charts/ComfortMatrix";
import { MiniClimateStrip, tempColor } from "./charts/MiniClimateStrip";
import { PLACES, PLACES_BY_ID, PLACE_COUNTS } from "../data/places";
import { CONCEPTS } from "../data/glossary";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../lib/climate-metrics";
import { fourthHeroStat, precipHeroLabel } from "../lib/hero-glance";
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtDelta, useProse } from "../lib/units";
import { getBestMonths } from "../lib/best-months";
import { CopyPlaceLink } from "./place-detail/CopyPlaceLink";
import { PlaceClimateTwins } from "./place-detail/PlaceClimateTwins";
import { composeFieldStory } from "../lib/place-story";
import { externalMapLinks, getPlaceHeroMedia } from "../lib/place-hero-media";
import { composePlaceExperience } from "../lib/place-overview";
import { mergeDeepSections } from "../lib/place-appendix-sections";
import { withSiteHistoryDeepSections } from "../data/site-history/apply";
import { retryFailedSiteHistory, siteHistoryThenable } from "../data/site-history/registry";
import { climateDataBasis } from "../lib/climate-data-basis";
import { profileExtrasThenable, retryFailedProfileExtras, withProfileExtras } from "../data/profile-extras/registry";
import { clearDossierHash } from "../lib/dossier-url-hash";
import { CLIMATE_NORMALS_PERIOD, EARTH_OBSERVATION_SOURCES, GEOSPATIAL_ANALYSIS_METHOD, STRUCTURAL_BASELINE_NOTE } from "../lib/atlas-metadata";
import { getCorpusSynthesisLines, getCorpusContextPanelRows } from "../lib/atlas-corpus-stats";
import { buildGeospatialAnalysis, FT_PER_MI_PER_M_PER_KM } from "../lib/geospatial-analysis";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { formatLivedSources } from "../lib/lived-sources";
import { effectiveAccessRemoteness, effectiveHousingPressure } from "../lib/research/lived-indicators";
import { buildComfortPrecisionProfile } from "../lib/comfort-precision";
import { describeHumanComfort, SCORE_DEFINITIONS, scoreLivability } from "../lib/livability-score";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "../lib/place-visual-signature";
import { safeExternalHref } from "../lib/safe-url";
import { useDetailReadingSpy } from "../hooks/use-detail-reading-spy";
import { scrollDetailRootToSection } from "../lib/detail-scroll-spy";
import { useMediaQuery } from "../hooks/use-media-query";
import { PlaceDeepSections } from "./place-detail/PlaceDeepSections";
import { PD, PD_ALL_IDS, PD_NAV_GROUP, buildLocalContrastRows, buildPlaceDetailNavItems } from "./place-detail/place-detail-nav";
import { PlaceDetailReadingNav } from "./place-detail/PlaceDetailReadingNav";
import { PlaceAtAGlance } from "./place-detail/PlaceAtAGlance";
import { PlaceOverviewSpotlight } from "./place-detail/PlaceOverviewSpotlight";
import { PlaceFeelRead } from "./place-detail/PlaceFeelRead";
import { PlaceBioclimaticIndices } from "./place-detail/PlaceBioclimaticIndices";
import { PlacePracticalRead } from "./place-detail/PlacePracticalRead";
import { PlaceTourismRead } from "./place-detail/PlaceTourismRead";
import { PlaceResidencyBrief, type ResidencyFitContext } from "./place-detail/PlaceResidencyBrief";
import { PlaceComfortPrecision } from "./place-detail/PlaceComfortPrecision";
import { PlaceBackToTop } from "./place-detail/PlaceBackToTop";
import { PlaceReadingProgress } from "./place-detail/PlaceReadingProgress";
import { Section, KeyValue, LabelRow, Legend, ScorePill, ScoreDetails, ZoneDivider, titleCaseLocal } from "./place-detail/place-detail-ui";
import { synthesizePlaceSignals } from "../lib/place-signals";
import { buildPracticalActivities, buildSettlementAnchors } from "../lib/practical-read";
import { buildGrowabilityRationale } from "../lib/growability-score";
import {
  X, ArrowLeftRight, BookOpen, MapPin, Mountain, Sparkles, Leaf, CloudRain, Wind,
  TrendingUp, Thermometer, Droplets, Sun, ChevronRight, HelpCircle, Calendar, Link2,
  Users, Compass, ExternalLink, Scale, Satellite, Clock3, Home, FileText,
} from "lucide-react";
import { PlaceVersusHome } from "./place-detail/PlaceVersusHome";
import { EvidenceClassLabel, PlaceEvidenceSummary } from "./place-detail/PlaceEvidenceSummary";
import { BookmarkButton } from "./BookmarkButton";
import { scenarioMeta } from "../lib/climate-projection";
import { classifyDossierSection } from "../lib/evidence-summary";

/** Solid leading edge on the detail drawer — instant place identity without re-tinting the whole panel. */
const SETTLEMENT_ROLE_LABEL: Record<string, string> = {
  hub: "Hub",
  town: "Town",
  village: "Village",
  hamlet: "Hamlet",
  resort: "Resort",
  ranching: "Ranching",
  tribal: "Tribal land",
  waypoint: "Waypoint",
  "ghost-town": "Ghost town",
};

const SETTLEMENT_ROLE_TONE: Record<string, string> = {
  hub: "glacier",
  town: "ice",
  village: "sage",
  hamlet: "sage",
  resort: "aurora",
  ranching: "ochre",
  tribal: "ember",
  waypoint: "ice",
  "ghost-town": "ember",
};

const SETTLEMENT_ROLE_COLOR: Record<string, string> = {
  hub: "#8cc8e0",
  town: "#c3e4f1",
  village: "#c6dcbd",
  hamlet: "#b6c8b0",
  resort: "#c7b5ea",
  ranching: "#f0d29c",
  tribal: "#efb49a",
  waypoint: "#9badc2",
  "ghost-town": "#7c8796",
};

const ACTIVITY_KIND_LABEL: Record<string, string> = {
  nature: "Nature",
  trail: "Trail",
  vista: "Vista",
  water: "Water",
  stargazing: "Stargazing",
  wildlife: "Wildlife",
  culture: "Culture",
  "food-drink": "Food & drink",
  seasonal: "Seasonal",
  "winter-sport": "Winter sport",
  urban: "Urban",
  historic: "Historic",
};

const ACTIVITY_KIND_TONE: Record<string, string> = {
  nature: "sage",
  trail: "sage",
  vista: "ochre",
  water: "ice",
  stargazing: "aurora",
  wildlife: "sage",
  culture: "aurora",
  "food-drink": "ember",
  seasonal: "ochre",
  "winter-sport": "glacier",
  urban: "ice",
  historic: "ochre",
};

const ACTIVITY_KIND_GLYPH: Record<string, string> = {
  nature: "🌲",
  trail: "🥾",
  vista: "🏔️",
  water: "💧",
  stargazing: "✨",
  wildlife: "🦅",
  culture: "🎭",
  "food-drink": "🍷",
  seasonal: "🍂",
  "winter-sport": "❄️",
  urban: "🏙️",
  historic: "🏛️",
};

// Build a lookup from driver id → glossary short def where we have one.
const DRIVER_CONCEPT_MAP: Partial<Record<TopographicDriver, string>> = {
  "orographic-lift": "orographic-lift",
  "rain-shadow": "rain-shadow",
  "elevation-lapse-rate": "lapse-rate",
  "cold-air-drainage": "cold-air-pooling",
  "marine-layer": "marine-layer",
  "upwelling": "upwelling",
  "chinook-foehn": "chinook",
  "lake-effect": "lake-effect",
  "gap-winds": "gap-wind",
  "inversion": "inversion",
  "aspect-slope": "aspect",
  "monsoon-lift": "monsoon",
  "karst-infiltration": "karst",
  "river-moderation": "continentality",
  "santa-ana": "santa-ana",
  "katabatic-flow": "katabatic",
  "continentality": "continentality",
  "trade-wind": "continentality",
};


interface Props {
  place: Place | null;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompareIds?: Set<string>;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  liveFitFilters?: LiveFitFilters;
  residencyFitContext?: ResidencyFitContext;
  /** Whether this place is currently pinned. Hides the control when callback absent. */
  bookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  /** The reader's home-base anchor (present-day normals). Enables the vs-home delta read. */
  homePlace?: Place | null;
  /** Set / clear the given place as home base. Hides the header control when absent. */
  onHomeBaseToggle?: (id: string) => void;
  occluded?: boolean;
  scenario?: ScenarioId;
  animateEntry?: boolean;
  /** When "surprise", scroll once to the mechanism section after open. */
  entryIntent?: "surprise" | null;
  /** Clears entryIntent after the surprise scroll nudge runs. */
  onEntryIntentConsumed?: () => void;
}

export function PlaceDetail({ place, onClose, onCompareToggle, inCompareIds, onPickArchetype, onOpenPlace, liveFitFilters, residencyFitContext, bookmarked, onBookmarkToggle, homePlace, onHomeBaseToggle, occluded = false, scenario = "now", animateEntry = true, entryIntent = null, onEntryIntentConsumed }: Props) {
  const reduceMotion = useReducedMotion();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const panelRef = useRef<HTMLElement>(null);
  const dialogTitleId = useId();
  const titleId = useId();
  const placeId = place?.id ?? null;
  useElementIsolation(panelRef, occluded);
  useFocusTrap(panelRef, Boolean(place) && !occluded);
  // Computed once for the entire drawer; both DetailHeader and DetailBody
  // (which forwards it to DetailDecisionBrief) read from the same memo.
  const visualSignature = useMemo<PlaceVisualSignature | null>(
    () => (place ? getPlaceVisualSignature(place) : null),
    [place],
  );

  const hadOpenPlaceRef = useRef(false);
  useEffect(() => {
    if (place) {
      hadOpenPlaceRef.current = true;
      return;
    }
    if (typeof window === "undefined" || !hadOpenPlaceRef.current) return;
    hadOpenPlaceRef.current = false;
    clearDossierHash();
  }, [place]);

  useEffect(() => {
    if (!placeId || occluded) return;
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = 0;
    let didResolveHash = false;
    let hashResolveAttempts = 0;
    const focusPanelStart = () => {
      const hash = window.location.hash;
      if (didResolveHash && hash.startsWith("#deep-")) return;
      const closeBtn = el.querySelector<HTMLElement>("[data-place-detail-close]");
      (closeBtn ?? el).focus({ preventScroll: true });
      if (didResolveHash) return;
      if (hash.startsWith("#deep-")) {
        hashResolveAttempts += 1;
        const target = el.querySelector<HTMLElement>(hash);
        if (target) {
          didResolveHash = true;
          const er = el.getBoundingClientRect();
          const tr = target.getBoundingClientRect();
          const top = el.scrollTop + (tr.top - er.top) - 12;
          el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
          const focusTarget = target.querySelector<HTMLElement>("[data-deep-chapter-title]") ?? target;
          if (focusTarget.tabIndex < 0) {
            focusTarget.setAttribute("tabindex", "-1");
          }
          focusTarget.focus({ preventScroll: true });
          return;
        }
        if (hashResolveAttempts < 4) return;
        didResolveHash = true;
        // D7: stale hash (e.g. user navigated between places via similar-places)
        // Drop the hash and try to anchor at the dossier opener so they at
        // least land on the deep-sections region of the new place. If even
        // that's missing (no deepSections), the panel stays at scrollTop=0.
        clearDossierHash();
        const dossier = el.querySelector<HTMLElement>(`#${PD.deepDives}`);
        if (dossier) {
          const er = el.getBoundingClientRect();
          const dr = dossier.getBoundingClientRect();
          const top = el.scrollTop + (dr.top - er.top) - 12;
          el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        }
        return;
      }
      // Legacy/shared `#pd-*` section anchors (from before the five-chapter
      // reorg, or from a copied section link): scroll straight to the
      // section. The reading nav then expands the right chapter on its own,
      // since chapter expansion follows the scroll-spy's active anchor.
      const rawLegacyId = hash.slice(1);
      // The twins teaser was folded into the Climate twins section.
      const legacyId = rawLegacyId === PD.similarTeaser ? PD.similar : rawLegacyId;
      if (legacyId && (PD_ALL_IDS as readonly string[]).includes(legacyId)) {
        didResolveHash = true;
        // Opens collapsed score `<details>` (#pd-at-a-glance, #pd-place-feel,
        // #pd-signature) before scrolling so shared hashes land on the body.
        scrollDetailRootToSection(legacyId, { behavior: "auto" });
        return;
      }
      didResolveHash = true;
    };
    focusPanelStart();
    const rafId = window.requestAnimationFrame(focusPanelStart);
    const focusRetryId = window.setTimeout(focusPanelStart, 120);
    const settledFocusRetryId = window.setTimeout(focusPanelStart, 500);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(focusRetryId);
      window.clearTimeout(settledFocusRetryId);
    };
  }, [placeId, occluded]);

  useEffect(() => {
    if (!placeId || occluded || entryIntent !== "surprise") return;
    if (typeof window !== "undefined" && window.location.hash.startsWith("#deep-")) {
      onEntryIntentConsumed?.();
      return;
    }
    const behavior = reduceMotion ? "auto" : "smooth";
    const t = window.setTimeout(() => {
      scrollDetailRootToSection(PD.whyHere, { behavior });
      onEntryIntentConsumed?.();
    }, 180);
    return () => window.clearTimeout(t);
  }, [placeId, occluded, entryIntent, reduceMotion, onEntryIntentConsumed]);

  return (
    <AnimatePresence>
      {place && (
        <>
          <motion.div
            initial={animateEntry ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={scrimFadeTransition(!!reduceMotion)}
            className="tc-modal-scrim fixed inset-0 z-30"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            key={place.id}
            data-place-detail
            tabIndex={-1}
            role="dialog"
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            initial={animateEntry ? { opacity: 0.98 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.4 }}
            transition={drawerPanelTransition(!!reduceMotion, coarsePointer)}
            className="place-detail-drawer fixed top-0 right-0 h-full w-full md:w-[min(92vw,900px)] max-w-full z-40 panel !rounded-none !border-y-0 !border-r-0 overflow-y-auto overflow-x-hidden outline-none border-l"
          >
            <h1 id={dialogTitleId} className="sr-only">{place.name} climate profile</h1>
            <PlaceReadingProgress panelRef={panelRef} />
            <DetailHeader
              place={place}
              titleId={titleId}
              onClose={onClose}
              onCompareToggle={onCompareToggle}
              inCompare={inCompareIds?.has(place.id) ?? false}
              onPickArchetype={onPickArchetype}
              bookmarked={Boolean(bookmarked)}
              onBookmarkToggle={onBookmarkToggle}
              isHome={homePlace?.id === place.id}
              onHomeBaseToggle={onHomeBaseToggle}
              visualSignature={visualSignature!}
            />
            <DetailBody
              place={place}
              onOpenPlace={onOpenPlace}
              liveFitFilters={liveFitFilters}
              residencyFitContext={residencyFitContext}
              visualSignature={visualSignature!}
              onCompareToggle={onCompareToggle}
              inCompare={inCompareIds?.has(place.id) ?? false}
              bookmarked={Boolean(bookmarked)}
              onBookmarkToggle={onBookmarkToggle}
              homePlace={homePlace}
              onHomeBaseToggle={onHomeBaseToggle}
              scenario={scenario}
            />
            <PlaceBackToTop panelRef={panelRef} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailHeader({
  place, titleId, onClose, onCompareToggle, inCompare, onPickArchetype, bookmarked, onBookmarkToggle, isHome, onHomeBaseToggle, visualSignature,
}: {
  place: Place;
  titleId: string;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompare: boolean;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  bookmarked: boolean;
  onBookmarkToggle?: (id: string) => void;
  isHome?: boolean;
  onHomeBaseToggle?: (id: string) => void;
  visualSignature: PlaceVisualSignature;
}) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const reduceMotion = useReducedMotion();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "ice";
  const primaryArchetype = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const [archetypeGuideOpen, setArchetypeGuideOpen] = useState(false);
  const summerHigh = meanSummerHigh(place);
  const janLow = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const fourthStat = fourthHeroStat(place);
  const dataBasis = climateDataBasis(place);
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";
  const lede = useMemo(() => composePlaceExperience(place).lede, [place]);
  const hero = useMemo(() => getPlaceHeroMedia(place.id), [place.id]);
  // Tracked by src (not a boolean) so switching places resets the fallback.
  const [failedHeroSrc, setFailedHeroSrc] = useState<string | null>(null);
  const heroFailed = hero != null && failedHeroSrc === hero.src;
  const mapLinks = useMemo(
    () => externalMapLinks(place.lat, place.lon, place.name).flatMap(link => {
      const href = safeExternalHref(link.href);
      return href ? [{ ...link, href }] : [];
    }),
    [place.lat, place.lon, place.name],
  );
  const homeBaseLabel = isHome
    ? `Clear ${place.name} as your home base`
    : `Set ${place.name} as your home base, to compare other places against it`;
  const compareLabel = inCompare ? `Remove ${place.name} from compare` : `Add ${place.name} to compare`;
  const residencyBriefLabel = `Jump to the fit summary for ${place.name}`;

  return (
    <div
      data-tone={tone}
      className="detail-drawer-header relative z-10 panel !rounded-none !border-x-0 !border-t-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 tc-surface-elevated border-b tc-border-warm"
    >
      {/* Title + actions share a row only from lg up: the drawer is ~706-830px
          across the md band and the six header actions (~540px, shrink-0)
          would squeeze the place name into a sliver and clip the archetype
          chips mid-word. */}
      <div className="detail-drawer-header__row flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-stone mb-1 flex-wrap">
            <MapPin className="w-3 h-3" aria-hidden />
            <span>{place.municipality ? `${place.municipality}, ` : ""}{place.region}, {place.country}</span>
            <span className="text-shadow">·</span>
            <Mountain className="w-3 h-3" aria-hidden />
            <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span>
            <span className="text-shadow">·</span>
            <span>{place.koppen}</span>
            <span className="text-shadow">·</span>
            <span className="font-mono-num">{place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°</span>
            {/* Tier is a curation note, not the lead identity signal — kept
               plain-text at the tail of the meta line instead of a bright
               chip so location and coordinates read first. */}
            <span className="text-shadow">·</span>
            <span className="text-stone-readable/80">{tierLabel}</span>
          </div>
          <h2 id={titleId} className="font-atlas text-[1.65rem] md:text-3xl text-ice tracking-tight leading-[1.15]">
            {place.name}
          </h2>
          <p className="detail-drawer-header__lede text-sm text-frost leading-snug mt-1.5 max-w-2xl">
            {prose(lede)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {place.archetypes.map(a => {
              const meta = ARCHETYPE_BY_ID[a];
              const isPrimary = a === place.archetypes[0];
              const chipTitle = meta
                ? `${meta.label}: ${prose(meta.blurb)}${isPrimary ? " (explained below)" : ""}`
                : a;
              return (
                <button
                  key={a}
                  type="button"
                  className="chip chip-btn"
                  data-tone={meta?.tone ?? "ice"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPrimary && meta?.guide) {
                      setArchetypeGuideOpen(open => !open);
                      return;
                    }
                    onPickArchetype?.(a);
                    onClose();
                  }}
                  title={chipTitle}
                  aria-label={chipTitle}
                  aria-expanded={isPrimary && meta?.guide ? archetypeGuideOpen : undefined}
                  aria-controls={isPrimary && meta?.guide ? "place-archetype-guide" : undefined}
                >
                  {meta?.label ?? a}
                </button>
              );
            })}
          </div>
          {primaryArchetype?.guide ? (
            <div
              id="place-archetype-guide"
              role="region"
              aria-label={`About ${primaryArchetype.label} climates`}
              className="mt-2.5 panel-thin p-2.5 border-l-2"
              style={{ borderLeftColor: "rgba(240, 210, 156, 0.65)" }}
              hidden={!archetypeGuideOpen}
            >
              <div className="text-[10px] uppercase tracking-wider text-stone">
                {primaryArchetype.label} · field guide
              </div>
              <p className="text-xs text-frost leading-relaxed mt-1">{prose(primaryArchetype.guide)}</p>
              <p className="text-[11px] text-stone mt-1.5 leading-snug">{prose(primaryArchetype.blurb)}</p>
              {onPickArchetype && place.archetypes[0] ? (
                <button
                  type="button"
                  className="btn-ghost !text-[11px] !py-1 mt-2"
                  aria-label={`Show only ${primaryArchetype.label} places in the atlas`}
                  title={`Show only ${primaryArchetype.label} places in the atlas`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickArchetype(place.archetypes[0]!);
                    onClose();
                  }}
                >
                  Filter atlas to {primaryArchetype.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="detail-drawer-header__actions flex items-center gap-1 self-end shrink-0 lg:self-start flex-wrap justify-end">
          <a
            href={`#${PD.residency}`}
            onClick={(event) => {
              if (scrollDetailRootToSection(PD.residency, { behavior: reduceMotion ? "auto" : "smooth" })) {
                event.preventDefault();
              }
            }}
            aria-label={residencyBriefLabel}
            title={residencyBriefLabel}
            className="btn-ghost !text-xs"
          >
            <FileText className="w-3 h-3" aria-hidden />
            Fit
          </a>
          <CopyPlaceLink placeId={place.id} placeName={place.name} />
          {onHomeBaseToggle && (
            <button
              type="button"
              onClick={() => onHomeBaseToggle(place.id)}
              aria-pressed={Boolean(isHome)}
              aria-label={homeBaseLabel}
              title={homeBaseLabel}
              className={`btn-ghost !text-xs ${isHome ? "!border-[rgba(140,200,224,0.8)] !text-glacier-700" : ""}`}
            >
              <Home className="w-3 h-3" aria-hidden />
              {isHome ? "Home base" : "Set home"}
            </button>
          )}
          {onBookmarkToggle && (
            <BookmarkButton
              pinned={bookmarked}
              placeName={place.name}
              onToggle={() => onBookmarkToggle(place.id)}
              size="header"
            />
          )}
          {onCompareToggle && (
            <button
              type="button"
              onClick={() => onCompareToggle(place.id)}
              aria-pressed={inCompare}
              aria-label={compareLabel}
              title={compareLabel}
              className={`btn-ghost !text-xs ${inCompare ? "compare-toggle--active" : ""}`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              {inCompare ? "In compare" : "Compare"}
            </button>
          )}
          <button
            type="button"
            data-place-detail-close
            onClick={onClose}
            className="btn-ghost !p-2"
            aria-label="Close profile"
            title="Close profile"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      <dl
        className="detail-signature-panel detail-signature-panel--quiet"
        style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb }}
        aria-label={`${place.name} place feel`}
      >
        <div className="detail-signature-panel__primary">
          <dt>{SCORE_DEFINITIONS.placeFeel.label}</dt>
          <dd title={`${SCORE_DEFINITIONS.placeFeel.definition} ${prose(visualSignature.primaryBlurb)}`}>
            <span>{visualSignature.feelBand} · <span className="font-mono-num">{visualSignature.feelScore}/100</span></span>
            <span className="text-frost font-normal">{visualSignature.primaryLabel}</span>
          </dd>
        </div>
      </dl>

      <figure className="mt-4 rounded-2xl overflow-hidden border border-[rgba(200,160,120,0.45)] shadow-[0_8px_28px_-12px_rgba(62,38,24,0.12)]">
        {hero && !heroFailed ? (
          <img
            src={hero.src}
            srcSet={hero.srcSet}
            sizes={hero.sizes}
            alt={hero.alt}
            width={1600}
            height={727}
            className="tc-place-hero-frame bg-[linear-gradient(135deg,rgba(140,200,224,0.35),rgba(200,170,140,0.35))]"
            style={{ objectPosition: hero.objectPosition }}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedHeroSrc(hero.src)}
          />
        ) : (
          <HeroClimateFallback
            place={place}
            signatureLabel={visualSignature.primaryLabel}
            photoFailed={heroFailed}
          />
        )}
        <figcaption className="tc-hero-credit px-3 py-0 text-[10px] leading-snug">
          {hero && !heroFailed ? (
            <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-glacier-700 hover:underline">
              {hero.creditLine}
            </a>
          ) : (
            <span>Colors show this place&apos;s average temperature for each month, January to December.</span>
          )}
        </figcaption>
      </figure>

      <div className="tc-detail-maps mt-2" role="group" aria-labelledby={`${place.id}-maps-label`}>
        <span id={`${place.id}-maps-label`} className="tc-detail-maps__label">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
          See this area on a live map
        </span>
        {mapLinks.map(link => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="tc-detail-map-link"
            data-primary={link.id === "google" || undefined}
            aria-label={`Open ${place.name} in ${link.label} (new tab)`}
          >
            {link.label}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
          </a>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-stone-readable mt-4 flex items-center gap-1.5">
        <Calendar className="w-3 h-3 shrink-0" aria-hidden />
        Climate normals · <span className="font-mono-num">{CLIMATE_NORMALS_PERIOD}</span>
        {" · "}
        <span title={dataBasis.detail} data-basis={dataBasis.status}>{dataBasis.label}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1.5">
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="Summer high" value={fmtTemp(summerHigh, temp)} />
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} />} label="Winter low" value={fmtTemp(janLow, temp)} />
        <HeroStat icon={<Droplets className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />} label={precipHeroLabel(place)} value={fmtPrecip(annualP, dist)} />
        <HeroStat
          icon={
            fourthStat.kind === "sunshine" ? <Sun className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />
            : fourthStat.kind === "humidity" ? <Droplets className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} />
            : fourthStat.kind === "biome" ? <Mountain className="w-3.5 h-3.5" style={{ color: "#c3e4f1" }} />
            : <Leaf className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />
          }
          label={fourthStat.label}
          value={fourthStat.value}
          hint={fourthStat.hint}
        />
      </div>

      {!coarsePointer ? (
        <div className="mt-3">
          <MiniClimateStrip place={place} height={22} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Climate-palette visual used only when a Commons photo fails to load.
 */
function HeroClimateFallback({
  place,
  signatureLabel,
  photoFailed,
}: {
  place: Place;
  signatureLabel: string;
  photoFailed: boolean;
}) {
  const { tempHighC, tempLowC } = place.climate;
  const ribbon = useMemo(() => {
    const months = Math.max(tempHighC.length, 2);
    const stops = tempHighC.map((high, i) => {
      const mean = (high + (tempLowC[i] ?? high)) / 2;
      return `${tempColor(mean)} ${((i / (months - 1)) * 100).toFixed(1)}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [tempHighC, tempLowC]);

  const ariaLabel = photoFailed
    ? `${place.name}: no photo available. The colors show its average temperature for each month, January to December.`
    : `${place.name}: colors show its average temperature for each month, January to December.`;

  return (
    <div
      className="tc-hero-fallback tc-place-hero-frame"
      style={{ ["--tc-hero-ribbon" as string]: ribbon }}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="tc-hero-fallback__plate">
        <span className="tc-hero-fallback__kicker">{signatureLabel}</span>
        <span className="tc-hero-fallback__name font-atlas">{place.name}</span>
      </div>
      <div className="tc-hero-fallback__scale" aria-hidden>
        <span>Jan</span>
        <span>Monthly temperatures as color</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="atlas-hero-stat panel-thin px-3 py-2" title={hint}>
      <div className="text-[10px] uppercase tracking-wider text-stone-readable flex items-center gap-1">{icon}{label}</div>
      <div className="font-mono-num text-sm text-ice">{value}</div>
    </div>
  );
}

function DetailBody({
  place: placeRaw, onOpenPlace, liveFitFilters, residencyFitContext, visualSignature, onCompareToggle, inCompare, bookmarked, onBookmarkToggle, homePlace, onHomeBaseToggle, scenario = "now",
}: {
  place: Place;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  liveFitFilters?: LiveFitFilters;
  residencyFitContext?: ResidencyFitContext;
  visualSignature: PlaceVisualSignature;
  onCompareToggle?: (id: string) => void;
  inCompare: boolean;
  bookmarked: boolean;
  onBookmarkToggle?: (id: string) => void;
  homePlace?: Place | null;
  onHomeBaseToggle?: (id: string) => void;
  scenario?: ScenarioId;
}) {
  // Waits (inside the profile's Suspense fallback) for this place's site
  // history file; already-loaded files do not suspend.
  // Start both downloads before waiting on either, so they run side by side.
  const historyPending = siteHistoryThenable(placeRaw.id);
  const extrasPending = profileExtrasThenable(placeRaw);
  const siteHistory = use(historyPending);
  use(extrasPending);
  const [, setExtrasRetried] = useState(0);
  useEffect(() => {
    if (withProfileExtras(placeRaw) !== placeRaw || placeRaw.citations !== undefined) return;
    let live = true;
    void retryFailedProfileExtras(placeRaw).then(arrived => {
      if (live && arrived) setExtrasRetried(n => n + 1);
    });
    return () => {
      live = false;
    };
  }, [placeRaw]);
  const placeWithExtras = withProfileExtras(placeRaw);
  // Rendered without history because its download failed: retry once, and
  // re-render when it arrives (a reopen, Back or Forward retries again).
  const [, setHistoryRetried] = useState(0);
  useEffect(() => {
    if (siteHistory !== null) return;
    let live = true;
    void retryFailedSiteHistory(placeRaw.id).then(arrived => {
      if (live && arrived) setHistoryRetried(n => n + 1);
    });
    return () => {
      live = false;
    };
  }, [placeRaw.id, siteHistory]);
  const place = useMemo(
    () => withSiteHistoryDeepSections(placeWithExtras, siteHistory ?? undefined),
    [placeWithExtras, siteHistory],
  );
  const { temp, dist } = useUnits();
  const prose = useProse();
  const reduceMotion = useReducedMotion();
  const driverPanelId = useId();
  const annualP = getAnnualPrecipMm(place);
  const [activeDriver, setActiveDriver] = useState<TopographicDriver | null>(null);
  const activeDriverTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeConcept = activeDriver
    ? CONCEPTS.find(c => c.id === DRIVER_CONCEPT_MAP[activeDriver])
    : null;
  const driverGlossaryCloseLabel = "Close explanation";
  const closeDriverGlossary = useCallback(() => {
    setActiveDriver(null);
    window.setTimeout(() => {
      try {
        activeDriverTriggerRef.current?.focus({ preventScroll: true });
      } catch {
        activeDriverTriggerRef.current?.focus();
      }
    }, 0);
  }, []);
  const onDriverGlossaryKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeDriverGlossary();
  }, [closeDriverGlossary]);

  const synthesized = useMemo(() => {
    const s = synthesizePlaceSignals(place, temp, dist);
    return { topRisks: s.topRisks, lines: [...s.lines, ...getCorpusSynthesisLines(place, temp)] };
  }, [place, temp, dist]);
  const corpusMatrixRows = useMemo(
    () =>
      getCorpusContextPanelRows(
        place,
        c => fmtTemp(c, temp),
        m => fmtElev(m, dist),
        mm => fmtPrecip(mm, dist),
        c => fmtDelta(c, temp, { digits: 0, signed: false }),
        temp,
      ),
    [place, temp, dist],
  );
  const bestMonths = useMemo(() => getBestMonths(place, temp), [place, temp]);
  const fieldStory = useMemo(() => composeFieldStory(place, temp, dist), [place, temp, dist]);
  const geospatial = useMemo(() => buildGeospatialAnalysis(place), [place]);
  const liveFit = useMemo(() => assessLiveFit(place, liveFitFilters), [place, liveFitFilters]);
  const livability = useMemo(() => scoreLivability(place), [place]);
  const livedSources = useMemo(() => formatLivedSources(place.liveSignals?.sources), [place.liveSignals?.sources]);
  const comfortPrecision = useMemo(() => buildComfortPrecisionProfile(place, { humidityAnalogPool: PLACES }), [place]);
  const comfortRead = useMemo(() => describeHumanComfort(place), [place]);
  const settlementAnchors = useMemo(() => buildSettlementAnchors(place), [place]);
  const practicalActivities = useMemo(() => buildPracticalActivities(place), [place]);
  const nearbyContextRows = useMemo(() => buildLocalContrastRows(place), [place]);
  const growabilityRationale = useMemo(() => buildGrowabilityRationale(place), [place]);
  const navItems = useMemo(() => buildPlaceDetailNavItems(place), [place]);
  const navDomIds = useMemo(() => navItems.map(i => i.id), [navItems]);
  const readingActiveAnchor = useDetailReadingSpy(navDomIds);
  const deepMerged = useMemo(() => mergeDeepSections(place), [place]);

  const readingActiveRef = useRef<string | null>(readingActiveAnchor);
  readingActiveRef.current = readingActiveAnchor;
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (readingActiveRef.current === PD.deepDives) return;
      clearDossierHash();
    }, 130);
    return () => clearTimeout(t);
  }, [readingActiveAnchor]);

  return (
    <div className="detail-body-shell mx-auto w-full px-4 py-6 md:px-7 md:py-8 lg:grid lg:grid-cols-[11.25rem_minmax(0,1fr)] lg:gap-x-10 lg:px-8">
      <PlaceDetailReadingNav items={navItems} activeAnchorId={readingActiveAnchor} />
      <div className="min-w-0 space-y-10 tc-detail-prose">
      <PlaceOverviewSpotlight place={place} anchorId={PD.overview} seasonsAnchorId={PD.seasons} />

      {/* The overview's "Why it feels different" essay carries the mechanism in
          prose; this section names the drivers and explains each on demand. */}
      <Section anchorId={PD.whyHere} icon={<Sparkles className="w-4 h-4" style={{ color: "#f0d29c" }} />} title="What shapes the climate here">
        <p className="text-sm text-stone-readable">Select a driver to read how it works.</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.drivers.map(d => {
            const hasConcept = DRIVER_CONCEPT_MAP[d] != null;
            const active = activeDriver === d;
            return (
              <button
                key={d}
                className="chip chip-btn tc-driver-chip"
                data-tone="ochre"
                data-active={active}
                onClick={(event) => {
                  activeDriverTriggerRef.current = event.currentTarget;
                  setActiveDriver(active ? null : d);
                }}
                onKeyDown={active ? onDriverGlossaryKeyDown : undefined}
                aria-label={hasConcept ? `Explain ${DRIVER_LABELS[d]}` : DRIVER_LABELS[d]}
                title={hasConcept ? `Explain ${DRIVER_LABELS[d]}` : DRIVER_LABELS[d]}
                {...(hasConcept
                  ? {
                      "aria-expanded": active,
                      "aria-controls": active ? driverPanelId : undefined,
                    }
                  : {})}
              >
                {DRIVER_LABELS[d]}
                {hasConcept && <HelpCircle className="w-3 h-3 opacity-70" />}
              </button>
            );
          })}
        </div>

        {/* Under reduced-motion the height/opacity tween is wasted work and a
           subtle source of layout shift — render the panel statically and skip
           AnimatePresence entirely so users get an instant expand/collapse. */}
        {reduceMotion ? (
          activeConcept ? (
            <div id={driverPanelId} className="mt-3 panel-warm p-4 overflow-hidden">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-atlas text-base text-ice">{activeConcept.term}</div>
                <button type="button" onClick={closeDriverGlossary} onKeyDown={onDriverGlossaryKeyDown} className="tc-driver-glossary-close text-stone hover:text-ice" aria-label={driverGlossaryCloseLabel} title={driverGlossaryCloseLabel}><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-sm text-frost">{prose(activeConcept.short)}</div>
              <div className="text-sm text-ice leading-relaxed mt-2">{prose(activeConcept.long)}</div>
              {activeConcept.mechanism && (
                <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">How it works ·</span> {prose(activeConcept.mechanism)}</div>
              )}
            </div>
          ) : null
        ) : (
          <AnimatePresence>
            {activeConcept && (
              <motion.div
                id={driverPanelId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 panel-warm p-4 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-atlas text-base text-ice">{activeConcept.term}</div>
                  <button type="button" onClick={closeDriverGlossary} onKeyDown={onDriverGlossaryKeyDown} className="tc-driver-glossary-close text-stone hover:text-ice" aria-label={driverGlossaryCloseLabel} title={driverGlossaryCloseLabel}><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-sm text-frost">{prose(activeConcept.short)}</div>
                <div className="text-sm text-ice leading-relaxed mt-2">{prose(activeConcept.long)}</div>
                {activeConcept.mechanism && (
                  <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">How it works ·</span> {prose(activeConcept.mechanism)}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="text-sm text-stone mt-3 italic">Terrain: {prose(place.reliefContext)}</div>
      </Section>

      {deepMerged.length > 0 ? (
        <div id={PD.deepDives} className="detail-doc-section scroll-mt-28">
          <PlaceDeepSections
            sections={deepMerged}
            hasBestMonthsGuide={bestMonths.length > 0}
            syncDossierHash={readingActiveAnchor === PD.deepDives}
          />
        </div>
      ) : null}

      {nearbyContextRows.length > 0 || place.localContrast?.length ? (
        <Section anchorId={PD.contrast} title="Local contrast" icon={<TrendingUp className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          {place.localContrast && <ContrastChart contrasts={place.localContrast} />}
          {nearbyContextRows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-readable">More nearby contrasts</div>
              {nearbyContextRows.map((n, i) => {
                const linked = n.placeId && PLACES_BY_ID[n.placeId];
                return linked ? (
                  <button
                    key={i}
                    onClick={event => onOpenPlace?.(n.placeId!, { trigger: event.currentTarget })}
                    className="panel-thin p-3 reveal-row w-full text-left flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-frost text-sm">{linked.name}</div>
                      <div className="text-stone text-sm leading-relaxed">{prose(n.note)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone mt-0.5 shrink-0" />
                  </button>
                ) : (
                  <div key={i} className="panel-thin p-3">
                    <div className="font-medium text-frost text-sm">{prose(n.label)}</div>
                    <div className="text-stone text-sm leading-relaxed">{prose(n.note)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section anchorId={PD.fieldStory} icon={<Compass className="w-4 h-4" style={{ color: "#dcc4ff" }} />} title={fieldStory.title}>
        <div className="panel-field-story p-4 md:p-5 space-y-3.5 rounded-2xl border border-[rgba(199,181,234,0.22)]">
          {fieldStory.paragraphs.map((p, i) => (
            <p key={i} className="text-[color:var(--color-frost-strong)] leading-[1.72] text-[15px] tracking-[0.012em]">
              {prose(p)}
            </p>
          ))}
        </div>
        <p className="text-[11px] text-stone italic mt-2">
          Plain-language numbers and starting points from this place&apos;s climate normals and community notes.
        </p>
      </Section>

      <ZoneDivider
        eyebrow="Chapter 2"
        title={PD_NAV_GROUP.liveOrVisit}
        blurb="For residents and for visitors: how it compares with your home, similar climates, fit scores, cost and access, nearby towns and things to do."
        icon={<Users className="w-3.5 h-3.5" aria-hidden />}
      />

      {/* Versus-home carries its own "set home" call to action, and the twins
          section opens on the closest match, so neither needs a teaser above it. */}
      <PlaceVersusHome place={place} home={homePlace ?? null} onHomeBaseToggle={onHomeBaseToggle} scenario={scenario} />

      <Section phoneCollapse anchorId={PD.similar} title="Climate twins" icon={<Link2 className="w-4 h-4" style={{ color: "#c7b5ea" }} />}>
        <PlaceClimateTwins place={place} onOpenPlace={onOpenPlace} />
      </Section>

      {/* Decision lens — the consolidated shortlist-grade verdict. Folds the
         previously separate "Live-here fit" and "Livability lens" score
         cards into one place so readers see every score, driver, and
         caution behind the residency call without hunting through repeated
         cards further down the dossier. */}
      <div className="detail-doc-section detail-decision-lens anim-fade-in">
        <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
          <Scale className="w-4 h-4 shrink-0" style={{ color: "#5ec4dc" }} aria-hidden />
          Fit summary
        </h3>
        <p className="text-[12px] text-stone-readable leading-relaxed mb-3.5 max-w-2xl">
          One score for living here, live-here fit, with the best season and the first thing to check. Each score runs from 0 to 100 and higher is better. The reasons and the livability breakdown follow.
        </p>
        <PlaceResidencyBrief
          place={place}
          anchorId={PD.residency}
          liveFit={liveFit}
          livability={livability}
          bestMonths={bestMonths}
          visualSignature={visualSignature}
          liveFitFilters={liveFitFilters}
          fitContext={residencyFitContext}
          inCompare={inCompare}
          bookmarked={bookmarked}
          onCompareToggle={onCompareToggle}
          onBookmarkToggle={onBookmarkToggle}
        />
        <div id={PD.liveHereFit} className="detail-decision-lens__detail scroll-mt-28">
          <h4 className="detail-decision-lens__detail-title font-atlas text-sm text-ice mb-2.5 flex items-center gap-1.5 tracking-tight opacity-90">
            Live-here fit in detail
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#5ec4dc" }}>
              <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-2">Why it fits</div>
              <ul className="space-y-1.5 text-sm text-frost">
                {liveFit.reasons.map(r => <li key={r}>{prose(r)}</li>)}
              </ul>
            </div>
            <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#e89b20" }}>
              <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-2">Watch this</div>
              {liveFit.cautions.length ? (
                <ul className="space-y-1.5 text-sm text-frost">
                  {liveFit.cautions.map(c => <li key={c}>{prose(c)}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-frost">No single warning stands out. Still read the risk, water and fit sections before you save it.</p>
              )}
            </div>
          </div>
        </div>
        <div id={PD.livability} className="detail-decision-lens__detail scroll-mt-28">
          <h4 className="detail-decision-lens__detail-title font-atlas text-sm text-ice mb-2.5 flex items-center gap-1.5 tracking-tight opacity-90">
            Livability breakdown
          </h4>
          <div className="panel-thin p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <EvidenceClassLabel cls={classifyDossierSection("livability")} />
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-readable">Livability score</div>
                <div className="font-mono-num text-3xl text-ice mt-0.5">
                  {livability.score}<span className="text-sm text-stone">/100</span>
                </div>
              </div>
              <div className="text-[11px] text-stone-readable max-w-lg leading-snug">
                {SCORE_DEFINITIONS.livability.definition} Hazards count the worst single risk as well as the average, and rainfall scores best in the middle: neither desert-dry nor very wet. Hover a row to see how it is worked out.
              </div>
            </div>
            <div className="divider-contour my-3" />
            <div className="tc-accent-panel px-3 py-2.5 mb-3">
              <div className="text-[10px] uppercase tracking-wider text-glacier-700 mb-1">{comfortRead.headline}</div>
              <p className="text-[12px] leading-snug text-frost">{prose(comfortRead.summary)}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {livability.components.map(c => (
                <li
                  key={c.key}
                  className="tc-livability-row"
                  title={prose(c.rationale)}
                >
                  <div className="tc-livability-row__label">{c.label}</div>
                  <div className="tc-livability-row__bar">
                    <div
                      className="tc-livability-row__bar-fill"
                      data-level={c.value >= 68 ? "high" : c.value >= 38 ? "mid" : "low"}
                      style={{ width: `${Math.max(0, Math.min(100, c.value))}%` }}
                    />
                  </div>
                  <div className="tc-livability-row__value font-mono-num">
                    {Math.round(c.value)}
                    <span className="text-stone text-[10px]">/100</span>
                  </div>
                  <span className="sr-only">{prose(c.rationale)}</span>
                </li>
              ))}
            </ul>
            {(livability.drivers.length > 0 || livability.drags.length > 0) ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {livability.drivers.length > 0 ? (
                  <div className="tc-livability-note--helps rounded-lg border border-[rgba(61,143,85,0.28)] bg-[rgba(236,248,232,0.55)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-sage-700 mb-0.5">Helps</div>
                    <div className="text-frost">{livability.drivers.map(k => livability.components.find(c => c.key === k)?.label).filter(Boolean).join(" · ")}</div>
                  </div>
                ) : null}
                {livability.drags.length > 0 ? (
                  <div className="tc-livability-note--hurts rounded-lg border border-[rgba(232,90,50,0.28)] bg-[rgba(255,236,228,0.55)] px-3 py-2">
                    <div className="tc-livability-note__label text-[10px] uppercase tracking-wider text-ember-700 mb-0.5">Hurts</div>
                    <div className="text-frost">{livability.drags.map(k => livability.components.find(c => c.key === k)?.label).filter(Boolean).join(" · ")}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {place.liveSignals ? (
        <Section phoneCollapse anchorId={PD.livedSignals} title="Cost and access" icon={<Scale className="w-4 h-4" style={{ color: "#dcc4ff" }} />}>
          <div className="panel-thin p-4">
            <div className="text-[11px] text-stone-readable leading-snug mb-3 max-w-2xl">
              Housing cost and travel times, which climate figures do not show. Each is scored from 0 (easy) to 100 (severe) from public sources. These are not appraisals or insurance assessments.
            </div>
            <ul className="tc-livability-signal-grid">
              {([
                { key: "housing", label: "Housing pressure", desc: "Housing cost against income, ranked within the country. Higher is harder.", value: effectiveHousingPressure(place.liveSignals) },
                { key: "access", label: "Remoteness", desc: "Travel time to a hospital, an airport and a service town. Higher is farther.", value: effectiveAccessRemoteness(place.liveSignals) },
              ] as const).map(axis => {
                const value = axis.value;
                if (value == null) return null;
                const level = value <= 35 ? "high" : value <= 60 ? "mid" : "low";
                return (
                  <li key={axis.key} className="tc-livability-row tc-livability-row--signal" title={`${axis.label}: ${Math.round(value)}/100`}>
                    <div className="tc-livability-row__label">{axis.label}<span className="block text-[11px] text-stone-readable font-normal normal-case tracking-normal mt-0.5">{axis.desc}</span></div>
                    <div className="tc-livability-row__bar">
                      <div className="tc-livability-row__bar-fill" data-level={level} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                    </div>
                    <div className="tc-livability-row__value font-mono-num">{Math.round(value)}<span className="text-stone text-[10px]">/100</span></div>
                  </li>
                );
              })}
            </ul>
            {(() => {
              const ls = place.liveSignals!;
              const factualRows: { label: string; value: string }[] = [];
              if (ls.hospitalRouteMinutes != null) {
                factualRows.push({ label: "Hospital route", value: `${Math.round(ls.hospitalRouteMinutes)} min` });
              }
              if (ls.airportRouteMinutes != null) {
                factualRows.push({ label: "Airport route", value: `${Math.round(ls.airportRouteMinutes)} min` });
              }
              if (ls.housingCostBurdenPct != null) {
                const year = ls.housingCostBurdenYear ? ` (${ls.housingCostBurdenYear})` : "";
                factualRows.push({ label: "Housing cost burden", value: `${Math.round(ls.housingCostBurdenPct)}%${year}` });
              }
              if (ls.serviceHubClass) {
                const hubLabel = { local: "Local hub", regional: "Regional hub", remote: "Remote", isolated: "Isolated" }[ls.serviceHubClass];
                factualRows.push({ label: "Service hub", value: hubLabel });
              }
              const constraints = ls.transportConstraints?.filter(c => c !== "none") ?? [];
              if (constraints.length > 0) {
                const constraintLabel = {
                  "ferry-only": "Ferry only",
                  "seasonal-road": "Seasonal road",
                  "single-access-road": "Single access road",
                } as const;
                factualRows.push({
                  label: "Transport constraints",
                  value: constraints.map(c => constraintLabel[c]).join(" · "),
                });
              }
              if (factualRows.length === 0) return null;
              return (
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] border-t border-dashed border-[rgba(71,90,122,0.18)] pt-3">
                  {factualRows.map(row => (
                    <div key={row.label} className="flex items-baseline justify-between gap-2">
                      <dt className="text-stone-readable">{row.label}</dt>
                      <dd className="font-mono-num text-frost text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}
            {place.liveSignals.note ? (
              <p className="mt-3 text-[12px] leading-snug text-frost border-t border-dashed border-[rgba(71,90,122,0.18)] pt-2">{prose(place.liveSignals.note)}</p>
            ) : null}
            {livedSources.length > 0 ? (
              <div className="mt-2 text-[11px] text-stone-readable">
                Sources:
                {" "}
                {livedSources.map((source, i) => (
                  <span key={source.key}>
                    {i > 0 ? " · " : ""}
                    {source.href ? <a href={source.href} className="tc-detail-source-link underline decoration-dotted hover:text-frost" target="_blank" rel="noreferrer noopener">{source.label}</a> : source.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {settlementAnchors.length > 0 && (
        <Section phoneCollapse anchorId={PD.settlements} title="Nearby towns" icon={<Users className="w-4 h-4" style={{ color: "#c3e4f1" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {settlementAnchors.map(s => (
              <div key={s.name} className="panel-thin p-3 flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className="mt-0.5 w-2 h-2 rounded-full shrink-0"
                  style={{ background: SETTLEMENT_ROLE_COLOR[s.role] ?? "#9badc2" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-atlas text-sm text-ice truncate">{prose(s.name)}</div>
                    <span className="chip" data-tone={SETTLEMENT_ROLE_TONE[s.role] ?? "ice"} style={{ fontSize: "10px" }}>
                      {SETTLEMENT_ROLE_LABEL[s.role] ?? s.role}
                    </span>
                    <span className="chip" data-tone="glacier" style={{ fontSize: "10px" }}>
                      {prose(s.relation)}
                    </span>
                  </div>
                  {s.population && (
                    <div className="text-[11px] text-stone font-mono-num mt-0.5">pop. {s.population}</div>
                  )}
                  {s.note && (
                    <div className="text-[12px] text-frost italic mt-1 leading-snug">{prose(s.note)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-stone italic mt-2">
            Authored settlements share the zone; derived bases are practical anchors for comparing access, services, and nearby climate gradients.
          </div>
        </Section>
      )}

      {practicalActivities.length > 0 && (() => {
        // Listed attractions and derived scouting chores are different
        // things; keep the chores out of "Things to do" and say what they are.
        const attractions = practicalActivities.filter(a => a.source !== "derived");
        const tasks = practicalActivities.filter(a => a.source === "derived");
        const card = (a: (typeof practicalActivities)[number], i: number) => (
          <div key={`${a.label}-${i}`} className="panel-thin p-3">
            <div className="flex items-start gap-2">
              <div className="text-lg leading-none pt-0.5" aria-hidden="true">
                {ACTIVITY_KIND_GLYPH[a.kind] ?? "✶"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ice leading-snug">{a.label}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="chip" data-tone={ACTIVITY_KIND_TONE[a.kind] ?? "ice"} style={{ fontSize: "10px" }}>
                    {ACTIVITY_KIND_LABEL[a.kind] ?? a.kind}
                  </span>
                  {a.season && (
                    <span className="chip chip--multiline" data-tone="glacier" style={{ fontSize: "10px" }}>
                      {a.season}
                    </span>
                  )}
                </div>
                {a.note && (
                  <div className="text-[12px] text-frost italic mt-1 leading-snug">{prose(a.note)}</div>
                )}
              </div>
            </div>
          </div>
        );
        return (
          <Section
            phoneCollapse
            anchorId={PD.activities}
            title={attractions.length > 0 ? "Things to do nearby" : "Things to check in person"}
            icon={<Compass className="w-4 h-4" style={{ color: "#c6dcbd" }} />}
          >
            {attractions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-2">{attractions.map(card)}</div>
            ) : null}
            {tasks.length > 0 ? (
              <>
                {attractions.length > 0 ? (
                  <h4 className="text-[11px] uppercase tracking-wider text-stone-readable mt-4 mb-2">Things to check in person</h4>
                ) : null}
                <p className="text-[12px] text-stone-readable mb-2">
                  Suggested from this place's climate and terrain, for anyone visiting to judge it in person.
                </p>
                <div className="grid md:grid-cols-2 gap-2">{tasks.map(card)}</div>
              </>
            ) : null}
          </Section>
        );
      })()}

      <PlacePracticalRead place={place} anchorId={PD.practical} />

      <PlaceTourismRead place={place} anchorId={PD.tourism} />

      {/* "Who might not" already closes the overview, so this keeps only the
          best-fit read and the relocation / travel tags. */}
      <Section phoneCollapse anchorId={PD.who} title="Who it suits">
        <div className="panel-thin p-3 border-l-2" style={{ borderLeftColor: "#7ea182" }}>
          <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1">Fits best</div>
          <div className="text-sm text-frost">{prose(place.whoWouldLove)}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.relocationFit.map(t => <span key={t} className="chip" data-tone="glacier">Relocation · {t}</span>)}
          {place.travelFit.map(t => <span key={t} className="chip" data-tone="sage">Travel · {t}</span>)}
        </div>
      </Section>

      <ZoneDivider
        eyebrow="Chapter 3"
        title={PD_NAV_GROUP.climateLand}
        blurb="The measurements: month-by-month climate, comfort scores, how this place ranks against the rest of the atlas, terrain, and soil."
        icon={<TrendingUp className="w-3.5 h-3.5" aria-hidden />}
      />

      <PlaceAtAGlance place={place} anchorId={PD.atAGlance} />

      <PlaceFeelRead place={place} anchorId={PD.placeFeel} />

      <ScoreDetails
        id={PD.signature}
        title="Climate basics"
        icon={<Sparkles className="w-4 h-4" style={{ color: "#8cc8e0" }} />}
      >
        <div className="grid md:grid-cols-[1fr_260px] gap-6 items-center">
          <div className="space-y-2">
            <KeyValue label="Mean annual precipitation" value={fmtPrecip(annualP, dist)} />
            <KeyValue label="Frost-free days (est.)" value={`${place.climate.frostFreeDays ?? "—"}`} />
            <KeyValue label="Hardiness zone" value={place.climate.hardinessZone ?? place.growability.hardinessZone ?? "—"} />
            <KeyValue label="Chill hours (est.)" value={`${place.climate.chillHours ?? "—"}`} />
            <KeyValue label="Summer day-to-night swing" value={place.climate.diurnalSummerC != null ? fmtDelta(place.climate.diurnalSummerC, temp, { digits: 0, signed: false }) : "—"} />
            <KeyValue label="Biome" value={prose(place.biome)} />
          </div>
          <MicroclimateFingerprint place={place} />
        </div>
      </ScoreDetails>

      <Section phoneCollapse anchorId={PD.rhythm} icon={<Wind className="w-4 h-4" style={{ color: "#8cc8e0" }} />} title="Seasonal rhythm">
        <div className="space-y-4">
          <div>
            <LabelRow label={`Monthly highs & lows (°${temp})`} />
            <ClimateRibbon highs={place.climate.tempHighC} lows={place.climate.tempLowC} />
          </div>
          <div>
            <LabelRow label={place.climate.snowCm?.some(v => v > 1) ? "Monthly precipitation (rain and melted snow) · ❄ row: snowfall depth" : "Monthly precipitation"} />
            <PrecipBars precip={place.climate.precipMm} snow={place.climate.snowCm} />
          </div>
          <div>
            <LabelRow label="Month-by-month comfort" />
            <ComfortMatrix place={place} />
            <div className="text-[10px] text-stone-readable mt-2 flex items-center gap-3 flex-wrap">
              <Legend color="#7ea182" text="Ideal" />
              <Legend color="#b9cdb4" text="Very good" />
              <Legend color="#e6c990" text="Good" />
              <Legend color="#d48c66" text="Stressed" />
              <Legend color="#8b3f22" text="Harsh" />
            </div>
          </div>
        </div>
      </Section>

      {bestMonths.length > 0 && (
        <Section phoneCollapse anchorId={PD.bestMonths} title="Best months for…" icon={<Calendar className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {bestMonths.map(w => (
              <div key={w.label} className="panel-thin p-3 flex items-start gap-3">
                <div className="text-xl leading-none pt-0.5" aria-hidden="true">{w.glyph}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wider text-stone-readable">{w.label}</div>
                  <div className="text-sm text-ice font-mono-num">{w.range}</div>
                  {w.note && <div className="text-[11px] text-stone italic mt-0.5 leading-snug">{prose(w.note)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-stone italic mt-2">
            Worked out from average monthly conditions. A planning guide, not a forecast.
          </div>
        </Section>
      )}

      <PlaceComfortPrecision profile={comfortPrecision} />

      <PlaceBioclimaticIndices place={place} anchorId={PD.bioclimaticIndices} />

      <Section phoneCollapse anchorId={PD.numbersTogether} title="How the numbers read together" icon={<TrendingUp className="w-4 h-4" style={{ color: "#8cc8e0" }} />}>
        <div className="panel-thin p-4 space-y-2">
          {synthesized.lines.map((line, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-sm border-b last:border-0 pb-2 last:pb-0 border-[rgba(200,160,120,0.28)]">
              <span className="text-stone">{line.label}</span>
              <span className="text-frost text-right font-mono-num">{line.value}</span>
            </div>
          ))}
          {synthesized.topRisks.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Main risks called out here</div>
              <div className="flex flex-wrap gap-1.5">
                {synthesized.topRisks.map(r => (
                  <span key={r} className="chip" data-tone="ember">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      <ScoreDetails id={PD.corpus} title="How this place sits in the full atlas" icon={<Scale className="w-4 h-4" style={{ color: "var(--color-glacier-500)" }} />}>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          Each row compares this place with the <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> places in the atlas, using the same figures as the header. &ldquo;Wetter than 80%&rdquo; means four in five atlas places get less rain and snow in a year. It does not mean wetter is better.
        </p>
        <div className="atlas-corpus-matrix panel-thin overflow-hidden p-0">
          <div className="atlas-corpus-matrix__head grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] gap-x-2 gap-y-1 px-3 py-2.5 text-[10px] uppercase tracking-wider text-stone bg-[linear-gradient(90deg,rgba(94,196,220,0.14),rgba(255,196,214,0.08))] border-b border-[rgba(200,160,120,0.3)]">
            <span>Signal</span>
            <span className="text-right">Here</span>
            <span>vs atlas</span>
          </div>
          {corpusMatrixRows.map(row => (
            <div
              key={row.metric}
              className="atlas-corpus-matrix__row grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] gap-x-2 gap-y-1 px-3 py-2.5 text-sm border-b last:border-0 border-[rgba(200,160,120,0.2)]"
            >
              <span className="text-stone min-w-0">{row.metric}</span>
              <span className="text-ice font-mono-num text-right tabular-nums shrink-0 self-start">{row.you}</span>
              <span className="text-frost text-[12px] min-[480px]:text-[13px] leading-snug min-w-0">{row.context}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-stone italic mt-2">
          Percent shares count strict inequalities in the same snapshot distribution (not a parametric fit). Ties in rounded normals are common, so 50/50-style splits are normal in dense Köppen classes.
        </p>
      </ScoreDetails>

      <Section anchorId={PD.geospatial} title="Geospatial analysis" icon={<Satellite className="w-4 h-4" style={{ color: "#c7b5ea" }} />}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidenceClassLabel cls={classifyDossierSection("geospatial")} />
        </div>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          These figures estimate how strongly terrain shapes the climate here, from elevation, seasonality, hazards and how the place ranks in the atlas. Sentinel-2 and Landsat are listed as the <span className="text-frost font-medium">satellites an analyst would use</span> to check the pattern. The atlas does not load live satellite images.
        </p>
        <details className="place-geospatial-details">
          <summary className="place-geospatial-details__summary cursor-pointer text-sm text-frost font-medium py-2 px-3 rounded-lg border border-[rgba(200,160,120,0.28)] bg-[rgba(255,248,240,0.35)] list-none [&::-webkit-details-marker]:hidden">
            Show the detailed figures
          </summary>
          <div className="mt-3 space-y-3">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-3">
          <div className="panel-thin p-4 space-y-2">
            <KeyValue label="Terrain signal score" value={`${geospatial.geospatialSignalScore}/100`} />
            <KeyValue label="Satellite visibility" value={`${geospatial.eoObservabilityScore}/100`} />
            <KeyValue label="Analysis confidence" value={titleCaseLocal(geospatial.analysisConfidence)} />
            <KeyValue
              label="Relief (elevation change)"
              value={`${Math.round(geospatial.reliefEnergyMPerKm * FT_PER_MI_PER_M_PER_KM)} ft/mi`}
            />
            <KeyValue
              label="Rain seasonality"
              value={`${geospatial.hydroSeasonalityRatio.toFixed(1)}x wettest/driest month`}
            />
            <KeyValue
              label="Annual temperature range"
              value={fmtDelta(geospatial.annualThermalAmplitudeC, temp, { digits: 0, signed: false })}
            />
            <KeyValue
              label="Terrain exposure index"
              value={geospatial.terrainExposureIndex.toFixed(1)}
            />
            <KeyValue
              label="Fine-scale terrain (estimate)"
              value={`${geospatial.structuralTextureScore}/100`}
            />
          </div>
          <div className="panel-thin p-4">
            <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Sensor fit</div>
            <div className="space-y-2">
              {geospatial.sourceFits.map(source => (
                <div key={source.sourceId} className="tc-inset-panel px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ice">{source.sourceId === "sentinel-2" ? "Sentinel-2" : "Landsat"}</span>
                    <span className="font-mono-num text-sm text-frost">{source.score}/100</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-stone">{source.label} fit</div>
                  <p className="text-[12px] text-stone leading-snug mt-1">{prose(source.note)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-stone italic mt-2">
          {prose(geospatial.contextLine)}
        </p>
        <div className="mt-3 panel-thin p-3">
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Satellite checks an analyst would run</div>
          <div className="grid md:grid-cols-2 gap-2">
            {geospatial.spectralSignals.map(signal => (
              <div key={`${signal.sourceId}-${signal.index}-${signal.label}`} className="tc-inset-panel px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-ice font-medium">{signal.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-stone">{signal.sourceId === "sentinel-2" ? "Sentinel-2" : "Landsat"}</span>
                </div>
                <div className="font-mono-num text-[12px] text-frost mt-0.5">{signal.index}</div>
                <p className="text-[12px] text-stone leading-snug mt-1">{prose(signal.reason)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 panel-thin p-3">
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Satellite sources</div>
          <ul className="space-y-1.5 text-sm text-frost">
            {EARTH_OBSERVATION_SOURCES.map(source => (
              <li key={source.id}>
                <span className="font-medium text-ice">{source.label}</span>{" "}
                <span className="text-stone">({source.operator}, {fmtElev(source.nominalResolutionM, dist)} pixels, {source.revisitDays})</span>
                <span className="text-stone"> — {source.role}</span>
              </li>
            ))}
            <li className="pt-1.5 mt-1 border-t border-[rgba(200,160,120,0.22)]">
              <span className="font-medium text-ice">Topography context</span>
              <span className="text-stone"> — {STRUCTURAL_BASELINE_NOTE}</span>
            </li>
          </ul>
          <p className="text-[11px] text-stone italic mt-2">{GEOSPATIAL_ANALYSIS_METHOD}</p>
          <p className="text-[11px] text-stone italic mt-1">{geospatial.limitNote}</p>
        </div>
          </div>
        </details>
      </Section>

      <Section phoneCollapse anchorId={PD.soil} title="Agriculture & soil" icon={<Leaf className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          Soil, drainage and what grows well here. Hardiness zone, frost-free days and chill hours are under Climate basics above.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-thin p-4">
            <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Soil profile</div>
            <KeyValue label="Texture" value={place.soil.texture} />
            <KeyValue label="Drainage" value={place.soil.drainage} />
            <KeyValue label="pH range" value={`${place.soil.phRange[0]}–${place.soil.phRange[1]}`} />
            {place.soil.organicMatterPct && (
              <KeyValue label="Organic matter" value={`${place.soil.organicMatterPct[0]}–${place.soil.organicMatterPct[1]}%`} />
            )}
            <KeyValue label="Water holding" value={place.soil.waterHolding} />
            {place.soil.notes && <div className="text-sm text-stone italic mt-2">{prose(place.soil.notes)}</div>}
          </div>
          <div className="panel-thin p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-stone">Growability</div>
              <div className="font-mono-num text-lg text-[color:var(--color-sage-700)]">{place.growability.score}<span className="text-sm text-stone">/100</span></div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Grows well</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.growsWell.map(g => <span key={g} className="chip max-w-full !whitespace-normal text-left leading-tight" data-tone="sage">{prose(g)}</span>)}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Tricky</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.tricky.map(g => <span key={g} className="chip max-w-full !whitespace-normal text-left leading-tight" data-tone="ember">{prose(g)}</span>)}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[rgba(61,143,85,0.18)] bg-[color:var(--tc-surface-muted)] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-stone-readable mb-1">Why this score?</div>
              <div className="space-y-1.5 text-[12px] leading-snug text-frost">
                {growabilityRationale.lines.map(line => <p key={line}>{prose(line)}</p>)}
              </div>
            </div>
            {place.growability.orchard && <div className="text-sm text-ice italic mt-2">{prose(place.growability.orchard)}</div>}
            {place.growability.homeGarden && <div className="text-sm text-frost mt-2">{prose(place.growability.homeGarden)}</div>}
          </div>
        </div>
      </Section>

      <ZoneDivider
        eyebrow="Chapter 4"
        title={PD_NAV_GROUP.risksFuture}
        blurb="Hazards, the change already measured, and the outlook to 2050 with how much confidence it deserves."
        icon={<CloudRain className="w-3.5 h-3.5" aria-hidden />}
      />

      {scenario !== "now" ? (
        <div className="compare-scenario-banner dossier-scenario-banner" role="note">
          <Clock3 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>
            Explorer and Compare use the <strong>{scenarioMeta(scenario).label}</strong> projection layer. This profile always shows recent averages ({CLIMATE_NORMALS_PERIOD}).
          </span>
        </div>
      ) : null}

      <Section anchorId={PD.risk} title="Climate risk" icon={<CloudRain className="w-4 h-4" style={{ color: "#d37c5b" }} />}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidenceClassLabel cls={classifyDossierSection("risk")} />
        </div>
        <RiskProfile place={place} />
      </Section>

      <Section phoneCollapse anchorId={PD.outlook} title="Climate-change outlook">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidenceClassLabel cls={classifyDossierSection("outlook")} />
        </div>
        <ClimateChangeDelta place={place} />
      </Section>

      <ZoneDivider
        eyebrow="Chapter 5"
        title={PD_NAV_GROUP.evidenceMethods}
        blurb="Which figures are measured and which are estimated, when the entry was reviewed, the sources, and a raw data export."
        icon={<BookOpen className="w-3.5 h-3.5" aria-hidden />}
      />

      <PlaceEvidenceSummary place={place} anchorId={PD.evidence} />

      <Section phoneCollapse anchorId={PD.verdict} title="Scores and sources">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EvidenceClassLabel cls={classifyDossierSection("scores")} />
        </div>
        <p className="text-[11px] text-stone leading-relaxed mb-3 max-w-2xl">
          These scores are editorial ratings from 0 to 100, used for ranking and comparison. Higher is better for all but tradeoff level, where lower is better. They are not measurements and not an appraisal of the place. Hover a score for what goes into it.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <ScorePill label={SCORE_DEFINITIONS.hiddenGem.label} definition={SCORE_DEFINITIONS.hiddenGem.definition} value={place.scores.hiddenGem} tone="sage" />
          <ScorePill label={SCORE_DEFINITIONS.uniqueness.label} definition={SCORE_DEFINITIONS.uniqueness.definition} value={place.scores.microclimateUniqueness} tone="ochre" />
          <ScorePill label={SCORE_DEFINITIONS.editorComfort.label} definition={SCORE_DEFINITIONS.editorComfort.definition} value={place.scores.comfort} tone="glacier" />
          <ScorePill label={SCORE_DEFINITIONS.resilience.label} definition={SCORE_DEFINITIONS.resilience.definition} value={place.scores.resilience} tone="glacier" />
          <ScorePill label={SCORE_DEFINITIONS.growability.label} definition={SCORE_DEFINITIONS.growability.definition} value={place.scores.growability} tone="sage" />
          <ScorePill label="Tradeoff level" definition="Tradeoff level, 0–100, lower is better. An editor's rating of how much you give up to live here: isolation, cost, hard seasons or hazards." value={place.scores.tradeoff} tone="ember" />
        </div>

        <div className="panel-thin p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone">Confidence</div>
            <div className="text-sm text-ice capitalize">{place.confidence}</div>
          </div>
          {place.confidenceNotes && <div className="text-xs text-stone italic max-w-[70%] text-right">{prose(place.confidenceNotes)}</div>}
        </div>

        <div className="mt-3">
          <p className="text-[11px] text-stone leading-relaxed mb-2">
            Citations name the station, product, or study behind each number. Current charts use Daymet rolling {CLIMATE_NORMALS_PERIOD} climatology (not a WMO standard normal); official 1991–2020 normals remain the comparison period.
          </p>
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Citations
          </div>
          <ul className="space-y-1 text-sm">
            {place.citations === undefined ? (
              <li className="text-xs text-stone-readable">
                The sources for this place could not be downloaded. They load the next time you open it with a connection.
              </li>
            ) : null}
            {(place.citations ?? []).map((c, i) => {
              const href = safeExternalHref(c.url);
              return (
                <li key={i} className="flex items-start gap-2 text-frost">
                  <span className="chip shrink-0" data-tone="ice" style={{ fontSize: "10px" }}>{c.kind.toUpperCase()}</span>
                  <span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="tc-detail-source-link underline decoration-[rgba(140,200,224,0.55)] decoration-dotted hover:text-ice"
                      >
                        {c.label}
                      </a>
                    ) : c.label}
                    {c.note ? <span className="text-stone italic"> — {prose(c.note)}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>
      </div>
    </div>
  );
}

