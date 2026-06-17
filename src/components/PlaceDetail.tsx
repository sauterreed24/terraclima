import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { drawerPanelTransition, scrimFadeTransition } from "../lib/device-profile";
import { useState, useEffect, useMemo, useRef, useId, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
import { useUnits, fmtTemp, fmtPrecip, fmtElev, fmtDelta, useProse } from "../lib/units";
import { getBestMonths } from "../lib/best-months";
import { CopyPlaceLink } from "./place-detail/CopyPlaceLink";
import { PlaceClimateTwins } from "./place-detail/PlaceClimateTwins";
import { composeFieldStory } from "../lib/place-story";
import { getPlaceHeroMedia, openStreetMapUrl } from "../lib/place-hero-media";
import { mergeDeepSections } from "../lib/place-appendix-sections";
import { clearDossierHash } from "../lib/dossier-url-hash";
import { CLIMATE_NORMALS_PERIOD, EARTH_OBSERVATION_SOURCES, GEOSPATIAL_ANALYSIS_METHOD, STRUCTURAL_BASELINE_NOTE } from "../lib/atlas-metadata";
import { getCorpusSynthesisLines, getCorpusContextPanelRows } from "../lib/atlas-corpus-stats";
import { buildGeospatialAnalysis } from "../lib/geospatial-analysis";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";
import { formatLivedSources } from "../lib/lived-sources";
import { buildComfortPrecisionProfile } from "../lib/comfort-precision";
import { describeHumanComfort, scoreLivability } from "../lib/livability-score";
import { getPlaceVisualSignature, type PlaceVisualSignature } from "../lib/place-visual-signature";
import { safeExternalHref } from "../lib/safe-url";
import { useDetailReadingSpy } from "../hooks/use-detail-reading-spy";
import { scrollDetailRootToSection } from "../lib/detail-scroll-spy";
import { useMediaQuery } from "../hooks/use-media-query";
import { PlaceDeepSections } from "./place-detail/PlaceDeepSections";
import { PD, buildPlaceDetailNavItems } from "./place-detail/place-detail-nav";
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
import { Section, KeyValue, LabelRow, Legend, ScorePill, ZoneDivider, titleCaseLocal } from "./place-detail/place-detail-ui";
import { synthesizePlaceSignals } from "../lib/place-signals";
import { buildNearbyContextRows, buildPracticalActivities, buildSettlementAnchors } from "../lib/practical-read";
import { buildGrowabilityRationale } from "../lib/growability-score";
import {
  X, ArrowLeftRight, BookOpen, MapPin, Mountain, Sparkles, Leaf, CloudRain, Wind,
  TrendingUp, Thermometer, Droplets, Sun, ChevronRight, HelpCircle, Calendar, Link2,
  Users, Compass, ExternalLink, Scale, Satellite, Clock3, Home, FileText,
} from "lucide-react";
import { PlaceVersusHome } from "./place-detail/PlaceVersusHome";
import { BookmarkButton } from "./BookmarkButton";
import { scenarioMeta } from "../lib/climate-projection";

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
}

export function PlaceDetail({ place, onClose, onCompareToggle, inCompareIds, onPickArchetype, onOpenPlace, liveFitFilters, residencyFitContext, bookmarked, onBookmarkToggle, homePlace, onHomeBaseToggle, occluded = false, scenario = "now", animateEntry = true }: Props) {
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
            <h1 id={dialogTitleId} className="sr-only">{place.name} climate dossier</h1>
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
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const reduceMotion = useReducedMotion();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "ice";
  const summerHigh = meanSummerHigh(place);
  const janLow = meanJanLow(place);
  const annualP = getAnnualPrecipMm(place);
  const sunshine = place.climate.sunshinePct
    ? Math.round(place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12)
    : null;
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";
  const hero = useMemo(() => getPlaceHeroMedia(place.id), [place.id]);
  // Tracked by src (not a boolean) so switching places resets the fallback.
  const [failedHeroSrc, setFailedHeroSrc] = useState<string | null>(null);
  const heroFailed = hero != null && failedHeroSrc === hero.src;
  const osmHref = safeExternalHref(openStreetMapUrl(place.lat, place.lon, 10)) ?? "https://www.openstreetmap.org/";
  const homeBaseLabel = isHome
    ? `Clear ${place.name} as your home base`
    : `Set ${place.name} as your home base for climate deltas`;
  const compareLabel = inCompare ? `Remove ${place.name} from compare` : `Add ${place.name} to compare`;
  const residencyBriefLabel = `Jump to ${place.name} residency brief`;

  return (
    <div
      data-tone={tone}
      className="detail-drawer-header md:sticky md:top-0 z-10 panel !rounded-none !border-x-0 !border-t-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 tc-surface-elevated backdrop-blur relative border-b tc-border-warm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-stone mb-1 flex-wrap">
            <span className="chip" data-tone={place.tier === "A" ? "ochre" : place.tier === "B" ? "ice" : "sage"}>{tierLabel}</span>
            <MapPin className="w-3 h-3" aria-hidden />
            <span>{place.municipality ? `${place.municipality}, ` : ""}{place.region}, {place.country}</span>
            <span className="text-shadow">·</span>
            <Mountain className="w-3 h-3" aria-hidden />
            <span className="font-mono-num">{fmtElev(place.elevationM, dist)}</span>
            <span className="text-shadow">·</span>
            <span>{place.koppen}</span>
            <span className="text-shadow">·</span>
            <span className="font-mono-num">{place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°</span>
          </div>
          <h2 id={titleId} className="font-atlas text-[1.65rem] md:text-3xl text-ice tracking-tight leading-[1.15]">
            {place.name}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {place.archetypes.map(a => (
              <button
                key={a}
                type="button"
                className="chip chip-btn"
                data-tone={ARCHETYPE_BY_ID[a]?.tone ?? "ice"}
                onClick={(e) => { e.stopPropagation(); onPickArchetype?.(a); onClose(); }}
                title={`Filter to ${ARCHETYPE_BY_ID[a]?.label ?? a}`}
              >
                {ARCHETYPE_BY_ID[a]?.label ?? a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 self-end shrink-0 md:self-start flex-wrap justify-end">
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
            Brief
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
        className="detail-signature-panel"
        style={{ ["--signature-rgb" as string]: visualSignature.mapAccentRgb }}
        aria-label={`${place.name} place signature`}
      >
        <div className="detail-signature-panel__primary">
          <dt>Place signature</dt>
          <dd title={visualSignature.primaryBlurb}>{visualSignature.primaryLabel}</dd>
        </div>
        <div>
          <dt>Feel</dt>
          <dd title={`Place-feel score ${visualSignature.feelScore}/100`}>
            <span>{visualSignature.feelBand}</span>
            <span className="font-mono-num">{visualSignature.feelScore}</span>
          </dd>
        </div>
        <div>
          <dt>Leads with</dt>
          <dd title={visualSignature.strength.rationale}>
            <span>{visualSignature.strength.shortLabel}</span>
            <span className="font-mono-num">{Math.round(visualSignature.strength.value)}</span>
          </dd>
        </div>
        <div>
          <dt>Verify</dt>
          <dd title={visualSignature.verify.rationale}>
            <span>{visualSignature.verify.shortLabel}</span>
            <span className="font-mono-num">{Math.round(visualSignature.verify.value)}</span>
          </dd>
        </div>
      </dl>

      {hero && (
        <figure className="mt-4 rounded-2xl overflow-hidden border border-[rgba(200,160,120,0.45)] shadow-[0_8px_28px_-12px_rgba(62,38,24,0.12)]">
          {heroFailed ? (
            // Hero image failed (offline / 404 / blocked). Stand in with a
            // climate-signature panorama drawn from the place's own monthly
            // normals so the dossier still opens on the place's identity
            // instead of an apologetic empty box. The figcaption keeps the
            // credit so the source page stays one click away.
            <HeroClimateFallback place={place} signatureLabel={visualSignature.primaryLabel} />
          ) : (
            <img
              src={hero.src}
              srcSet={hero.srcSet}
              sizes={hero.sizes}
              alt={hero.alt}
              width={1280}
              height={520}
              className="w-full h-36 md:h-52 object-cover bg-[linear-gradient(135deg,rgba(140,200,224,0.35),rgba(200,170,140,0.35))]"
              loading="eager"
              decoding="async"
              onError={() => setFailedHeroSrc(hero.src)}
            />
          )}
          <figcaption className="tc-hero-credit px-3 py-0 text-[10px] leading-snug">
            <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-glacier-700 hover:underline">
              {hero.creditLine}
            </a>
          </figcaption>
        </figure>
      )}

      <div className="mt-2">
        <a
          href={osmHref}
          target="_blank"
          rel="noopener noreferrer"
          className="tc-detail-map-link inline-flex items-center gap-1.5 text-[11px] font-medium text-glacier-700 hover:text-glacier-500 hover:underline"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
          Open this area on a live map (OpenStreetMap)
          <ExternalLink className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="JJA high" value={fmtTemp(summerHigh, temp)} />
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} />} label="Jan low" value={fmtTemp(janLow, temp)} />
        <HeroStat icon={<Droplets className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />} label="Annual precip" value={fmtPrecip(annualP, dist)} />
        {sunshine != null ? (
          <HeroStat icon={<Sun className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="Sunshine" value={`${sunshine}%`} />
        ) : place.climate.hardinessZone ? (
          <HeroStat icon={<Leaf className="w-3.5 h-3.5" style={{ color: "#c6dcbd" }} />} label="Hardiness" value={place.climate.hardinessZone} />
        ) : (
          <HeroStat icon={<Mountain className="w-3.5 h-3.5" style={{ color: "#c3e4f1" }} />} label="Biome" value={place.biome.split(" / ")[0]} />
        )}
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
 * Designed stand-in for a hero photo that cannot load (offline PWA, blocked
 * CDN, 404): a January→December temperature panorama from the place's own
 * authored normals, labelled with the place name and primary signature.
 */
function HeroClimateFallback({ place, signatureLabel }: { place: Place; signatureLabel: string }) {
  const { tempHighC, tempLowC } = place.climate;
  const ribbon = useMemo(() => {
    const months = Math.max(tempHighC.length, 2);
    const stops = tempHighC.map((high, i) => {
      const mean = (high + (tempLowC[i] ?? high)) / 2;
      return `${tempColor(mean)} ${((i / (months - 1)) * 100).toFixed(1)}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [tempHighC, tempLowC]);

  return (
    <div
      className="tc-hero-fallback h-36 md:h-52"
      style={{ ["--tc-hero-ribbon" as string]: ribbon }}
      role="img"
      aria-label={`${place.name} — photo unavailable; showing its January-to-December temperature palette instead`}
    >
      <div className="tc-hero-fallback__plate">
        <span className="tc-hero-fallback__kicker">{signatureLabel}</span>
        <span className="tc-hero-fallback__name font-atlas">{place.name}</span>
      </div>
      <div className="tc-hero-fallback__scale" aria-hidden>
        <span>Jan</span>
        <span>Monthly temperature palette</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="atlas-hero-stat panel-thin px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-stone flex items-center gap-1">{icon}{label}</div>
      <div className="font-mono-num text-sm text-ice">{value}</div>
    </div>
  );
}

function DetailBody({
  place, onOpenPlace, liveFitFilters, residencyFitContext, visualSignature, onCompareToggle, inCompare, bookmarked, onBookmarkToggle, homePlace, onHomeBaseToggle, scenario = "now",
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
  const driverGlossaryCloseLabel = "Close glossary explanation";
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
        c => fmtDelta(c, temp, { signed: false }),
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
  const nearbyContextRows = useMemo(() => buildNearbyContextRows(place), [place]);
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
      {scenario !== "now" ? (
        <div className="compare-scenario-banner dossier-scenario-banner" role="note">
          <Clock3 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>
            Explorer and Compare use the <strong>{scenarioMeta(scenario).label}</strong> illustrative regional projection. This dossier shows present-day normals ({CLIMATE_NORMALS_PERIOD}).
          </span>
        </div>
      ) : null}
      <PlaceOverviewSpotlight place={place} anchorId={PD.overview} seasonsAnchorId={PD.seasons} />

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

      {homePlace ? (
        <PlaceVersusHome place={place} home={homePlace} onHomeBaseToggle={onHomeBaseToggle} />
      ) : null}

      <PlaceAtAGlance place={place} anchorId={PD.atAGlance} />

      <PlaceFeelRead place={place} anchorId={PD.placeFeel} />

      <PlaceComfortPrecision profile={comfortPrecision} />

      <PlaceBioclimaticIndices place={place} anchorId={PD.bioclimaticIndices} />

      <Section title="Livability lens v3" icon={<Scale className="w-4 h-4" style={{ color: "#5ec4dc" }} />}>
        <div className="panel-thin p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone">Blended livability score</div>
              <div className="font-mono-num text-3xl text-ice mt-0.5">
                {livability.score}<span className="text-sm text-stone">/100</span>
              </div>
            </div>
            <div className="text-[11px] text-stone-readable max-w-lg leading-snug">
              Human-felt thermal comfort, atmosphere (sky, wind, humidity, smoke, and solar load), tail-risk-aware hazard cushion, U-shaped precip moderation, curated lived friction, and derived place feel. Hover a row for its formula.
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
                title={c.rationale}
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
              </li>
            ))}
          </ul>
          {(livability.drivers.length > 0 || livability.drags.length > 0) ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {livability.drivers.length > 0 ? (
                <div className="rounded-lg border border-[rgba(61,143,85,0.28)] bg-[rgba(236,248,232,0.55)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-sage-700 mb-0.5">Drivers</div>
                  <div className="text-frost">{livability.drivers.map(k => livability.components.find(c => c.key === k)?.label).filter(Boolean).join(" · ")}</div>
                </div>
              ) : null}
              {livability.drags.length > 0 ? (
                <div className="rounded-lg border border-[rgba(232,90,50,0.28)] bg-[rgba(255,236,228,0.55)] px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-ember-700 mb-0.5">Drags</div>
                  <div className="text-frost">{livability.drags.map(k => livability.components.find(c => c.key === k)?.label).filter(Boolean).join(" · ")}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Section>

      {place.liveSignals ? (
        <Section title="Lived signals" icon={<Scale className="w-4 h-4" style={{ color: "#dcc4ff" }} />}>
          <div className="panel-thin p-4">
            <div className="text-[11px] text-stone-readable leading-snug mb-3 max-w-2xl">
              Editorial reads on three axes climate normals cannot capture: cost pressure, social-fabric stress, and daily-services access. 0 = no friction, 100 = severe. These are screening signals anchored to public sources, not appraisals or insurance underwriting.
            </div>
            <ul className="tc-livability-signal-grid">
              {(["costPressure", "socialStress", "accessFriction"] as const).map(axis => {
                const value = place.liveSignals?.[axis];
                if (value == null) return null;
                const label = axis === "costPressure" ? "Cost pressure" : axis === "socialStress" ? "Social stress" : "Access friction";
                const desc = axis === "costPressure"
                  ? "Housing burden & cost-of-living."
                  : axis === "socialStress"
                    ? "Crime, homelessness, civic distress."
                    : "Distance to hospital, airport, daily services.";
                const level = value <= 35 ? "high" : value <= 60 ? "mid" : "low";
                return (
                  <li key={axis} className="tc-livability-row tc-livability-row--signal" title={`${label}: ${Math.round(value)}/100`}>
                    <div className="tc-livability-row__label">{label}<span className="block text-[10px] text-stone-readable font-normal">{desc}</span></div>
                    <div className="tc-livability-row__bar">
                      <div className="tc-livability-row__bar-fill" data-level={level} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                    </div>
                    <div className="tc-livability-row__value font-mono-num">{Math.round(value)}<span className="text-stone text-[10px]">/100</span></div>
                  </li>
                );
              })}
            </ul>
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

      <Section title="Live-here fit" icon={<Scale className="w-4 h-4" style={{ color: "#5ec4dc" }} />}>
        <div className="grid md:grid-cols-[11rem_1fr] gap-3">
          <div className="panel-thin p-4">
            <div className="text-[10px] uppercase tracking-wider text-stone">Current match</div>
            <div className="font-mono-num text-3xl text-ice mt-1">{liveFit.score}<span className="text-sm text-stone">/100</span></div>
            <div className="mt-2 flex flex-wrap gap-1">
              {liveFit.badges.map(b => <span key={b} className="chip" data-tone="glacier">{b}</span>)}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#5ec4dc" }}>
              <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Why it fits</div>
              <ul className="space-y-1.5 text-sm text-frost">
                {liveFit.reasons.map(r => <li key={r}>{prose(r)}</li>)}
              </ul>
            </div>
            <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#e89b20" }}>
              <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Watch this</div>
              {liveFit.cautions.length ? (
                <ul className="space-y-1.5 text-sm text-frost">
                  {liveFit.cautions.map(c => <li key={c}>{prose(c)}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-frost">No single hard warning dominates the structured profile; still read risks, water, and fit before shortlisting.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <PlacePracticalRead place={place} anchorId={PD.practical} />

      <PlaceTourismRead place={place} anchorId={PD.tourism} />

      <Section anchorId={PD.fieldStory} icon={<Compass className="w-4 h-4" style={{ color: "#dcc4ff" }} />} title={fieldStory.title}>
        <div className="panel-field-story p-4 md:p-5 space-y-3.5 rounded-2xl border border-[rgba(199,181,234,0.22)]">
          {fieldStory.paragraphs.map((p, i) => (
            <p key={i} className="text-[color:var(--color-frost-strong)] leading-[1.72] text-[15px] tracking-[0.012em]">
              {prose(p)}
            </p>
          ))}
        </div>
        <p className="text-[11px] text-stone italic mt-2">
          Woven from this place&apos;s terrain, climate, and community notes — read it together with the summaries above, not instead of them.
        </p>
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

      <ZoneDivider
        eyebrow="The data lab"
        title="Climate, terrain & measurements"
        blurb="Everything above is the lived read. From here down the dossier turns analytical — the mechanisms, monthly numbers, atlas-wide context, and remote-sensing checks behind the feel."
        icon={<TrendingUp className="w-3.5 h-3.5" aria-hidden />}
      />

      <Section anchorId={PD.whyHere} icon={<Sparkles className="w-4 h-4" style={{ color: "#f0d29c" }} />} title="Why this climate is different here">
        <p className="text-[color:var(--color-frost-strong)] leading-relaxed">{prose(place.whyDistinct)}</p>

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
                <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">Under the hood ·</span> {prose(activeConcept.mechanism)}</div>
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
                  <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">Under the hood ·</span> {prose(activeConcept.mechanism)}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="text-sm text-stone mt-3 italic">Relief context: {prose(place.reliefContext)}</div>
      </Section>

      <Section anchorId={PD.rhythm} icon={<Wind className="w-4 h-4" style={{ color: "#8cc8e0" }} />} title="Seasonal rhythm">
        <div className="space-y-4">
          <div>
            <LabelRow label={`Monthly highs & lows (°${temp})`} />
            <ClimateRibbon highs={place.climate.tempHighC} lows={place.climate.tempLowC} />
          </div>
          <div>
            <LabelRow label={`Monthly precipitation · snow band shown where applicable`} />
            <PrecipBars precip={place.climate.precipMm} snow={place.climate.snowCm} />
          </div>
          <div>
            <LabelRow label="Month-by-month comfort" />
            <ComfortMatrix place={place} />
            <div className="text-[10px] text-stone-readable mt-2 flex items-center gap-3 flex-wrap">
              <Legend color="#89af88" text="Ideal" />
              <Legend color="#c6dcbd" text="Very good" />
              <Legend color="#f0d29c" text="Good" />
              <Legend color="#d37c5b" text="Stressed" />
              <Legend color="#9a4a2a" text="Harsh" />
            </div>
          </div>
        </div>
      </Section>

      {bestMonths.length > 0 && (
        <Section anchorId={PD.bestMonths} title="Best months for…" icon={<Calendar className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {bestMonths.map(w => (
              <div key={w.label} className="panel-thin p-3 flex items-start gap-3">
                <div className="text-xl leading-none pt-0.5" aria-hidden="true">{w.glyph}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wider text-stone">{w.label}</div>
                  <div className="text-sm text-ice font-mono-num">{w.range}</div>
                  {w.note && <div className="text-[11px] text-stone italic mt-0.5 leading-snug">{prose(w.note)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-stone italic mt-2">
            Penciled from typical monthly patterns — a rough planning guide, not a forecast.
          </div>
        </Section>
      )}

      <Section anchorId={PD.numbersTogether} title="How the numbers read together" icon={<TrendingUp className="w-4 h-4" style={{ color: "#8cc8e0" }} />}>
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

      <Section anchorId={PD.corpus} title="How this place sits in the full atlas" icon={<Scale className="w-4 h-4" style={{ color: "var(--color-glacier-500)" }} />}>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          Every row compares this stop to the other <span className="font-mono-num text-frost">{PLACE_COUNTS.total}</span> curated places on the same map — same fields as the header stats and comfort matrix. A high &ldquo;wetter than&rdquo; share means annual totals here beat most other entries, not that more rain is intrinsically &ldquo;better.&rdquo;
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
      </Section>

      <Section anchorId={PD.geospatial} title="Geospatial analysis" icon={<Satellite className="w-4 h-4" style={{ color: "#c7b5ea" }} />}>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          Screening blends atlas terrain, climate seasonality, risks, and corpus ranks. Sentinel-2 and Landsat appear below as <span className="text-frost font-medium">reference</span> sensor families for the spectral checks a field analyst would queue — not live scenes from this app. Relief texture is a separate atlas proxy for where fine-scale topography would usually matter.
        </p>
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-3">
          <div className="panel-thin p-4 space-y-2">
            <KeyValue label="Geospatial signal score" value={`${geospatial.geospatialSignalScore}/100`} />
            <KeyValue label="EO observability" value={`${geospatial.eoObservabilityScore}/100`} />
            <KeyValue label="Analysis confidence" value={titleCaseLocal(geospatial.analysisConfidence)} />
            <KeyValue
              label="Relief energy"
              value={`${Math.round(geospatial.reliefEnergyMPerKm)} m/km`}
            />
            <KeyValue
              label="Hydro seasonality"
              value={`${geospatial.hydroSeasonalityRatio.toFixed(1)}x wettest/driest month`}
            />
            <KeyValue
              label="Thermal amplitude"
              value={fmtDelta(geospatial.annualThermalAmplitudeC, temp, { signed: false })}
            />
            <KeyValue
              label="Terrain exposure index"
              value={geospatial.terrainExposureIndex.toFixed(1)}
            />
            <KeyValue
              label="Relief texture (atlas proxy)"
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
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Likely spectral checks</div>
          <div className="grid md:grid-cols-2 gap-2">
            {geospatial.spectralSignals.map(signal => (
              <div key={`${signal.sourceId}-${signal.index}-${signal.label}`} className="tc-inset-panel px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-ice font-medium">{signal.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-stone">{signal.sourceId === "sentinel-2" ? "Sentinel-2" : "Landsat"}</span>
                </div>
                <div className="font-mono-num text-[12px] text-frost mt-0.5">{signal.index}</div>
                <p className="text-[12px] text-stone leading-snug mt-1">{signal.reason}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 panel-thin p-3">
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5">Earth-observation stack</div>
          <ul className="space-y-1.5 text-sm text-frost">
            {EARTH_OBSERVATION_SOURCES.map(source => (
              <li key={source.id}>
                <span className="font-medium text-ice">{source.label}</span>{" "}
                <span className="text-stone">({source.operator}, {source.nominalResolutionM} m, {source.revisitDays})</span>
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
      </Section>

      <Section anchorId={PD.signature} title="Climate signature (radar chart)" icon={<Sparkles className="w-4 h-4" style={{ color: "#8cc8e0" }} />}>
        <div className="grid md:grid-cols-[1fr_260px] gap-6 items-center">
          <div className="space-y-2">
            <KeyValue label="Mean annual precipitation" value={fmtPrecip(annualP, dist)} />
            <KeyValue label="Frost-free days (est.)" value={`${place.climate.frostFreeDays ?? "—"}`} />
            <KeyValue label="Hardiness zone" value={place.climate.hardinessZone ?? place.growability.hardinessZone ?? "—"} />
            <KeyValue label="Chill hours (est.)" value={`${place.climate.chillHours ?? "—"}`} />
            <KeyValue label="Summer diurnal swing" value={place.climate.diurnalSummerC != null ? fmtDelta(place.climate.diurnalSummerC, temp, { signed: false }) : "—"} />
            <KeyValue label="Biome" value={place.biome} />
          </div>
          <MicroclimateFingerprint place={place} />
        </div>
      </Section>

      {nearbyContextRows.length > 0 ? (
        <Section anchorId={PD.contrast} title="Local contrast" icon={<TrendingUp className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          {place.localContrast && <ContrastChart contrasts={place.localContrast} />}
          {nearbyContextRows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone">Nearby contrasts and scouting checks</div>
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
                    <div className="font-medium text-frost text-sm">{n.label}</div>
                    <div className="text-stone text-sm leading-relaxed">{prose(n.note)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <ZoneDivider
        eyebrow="Land & growing"
        title="Agriculture, soil & climate risk"
        blurb="What the ground itself offers — soil, what grows well, and the hazard and long-range outlook a grower or resident plans around."
        icon={<Leaf className="w-3.5 h-3.5" aria-hidden />}
      />

      <Section anchorId={PD.soil} title="Agriculture & soil" icon={<Leaf className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
        <p className="text-sm text-stone leading-relaxed mb-3 max-w-2xl">
          The growing read pairs the soil profile with what the climate envelope rewards or fights. Hardiness, frost-free runway, and chill hours sit in the climate signature below; here the focus is dirt, drainage, and what actually thrives.
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
              <div className="font-mono-num text-lg" style={{ color: "#c6dcbd" }}>{place.growability.score}<span className="text-sm text-stone">/100</span></div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Grows well</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.growsWell.map(g => <span key={g} className="chip max-w-full !whitespace-normal text-left leading-tight" data-tone="sage">{g}</span>)}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Tricky</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.tricky.map(g => <span key={g} className="chip max-w-full !whitespace-normal text-left leading-tight" data-tone="ember">{g}</span>)}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[rgba(61,143,85,0.18)] bg-[rgba(236,248,232,0.42)] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Why this score?</div>
              <div className="space-y-1.5 text-[12px] leading-snug text-frost">
                {growabilityRationale.lines.map(line => <p key={line}>{prose(line)}</p>)}
              </div>
            </div>
            {place.growability.orchard && <div className="text-sm text-ice italic mt-2">{prose(place.growability.orchard)}</div>}
            {place.growability.homeGarden && <div className="text-sm text-frost mt-2">{prose(place.growability.homeGarden)}</div>}
          </div>
        </div>
      </Section>

      <Section anchorId={PD.risk} title="Climate risk" icon={<CloudRain className="w-4 h-4" style={{ color: "#d37c5b" }} />}>
        <RiskProfile place={place} />
      </Section>

      <Section anchorId={PD.outlook} title="Climate-change outlook">
        <ClimateChangeDelta place={place} />
      </Section>

      <ZoneDivider
        eyebrow="Fit, neighbors & sources"
        title="Who it suits, what's nearby & where the numbers come from"
        blurb="Back to the human scale — the people who thrive here, the settlements and outings that anchor the zone, climate twins elsewhere, and the citations behind every figure."
        icon={<Users className="w-3.5 h-3.5" aria-hidden />}
      />

      <Section anchorId={PD.who} title="Who would love this · who might not">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="panel-thin p-3 border-l-2" style={{ borderLeftColor: "#c6dcbd" }}>
            <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Fits best</div>
            <div className="text-sm text-frost">{prose(place.whoWouldLove)}</div>
          </div>
          <div className="panel-thin p-3 border-l-2" style={{ borderLeftColor: "#d37c5b" }}>
            <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Poor fit</div>
            <div className="text-sm text-frost">{prose(place.whoMightNot)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.relocationFit.map(t => <span key={t} className="chip" data-tone="glacier">Relocation · {t}</span>)}
          {place.travelFit.map(t => <span key={t} className="chip" data-tone="sage">Travel · {t}</span>)}
        </div>
      </Section>

      {settlementAnchors.length > 0 && (
        <Section anchorId={PD.settlements} title="Settlements and scouting bases" icon={<Users className="w-4 h-4" style={{ color: "#c3e4f1" }} />}>
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
                    <div className="font-atlas text-sm text-ice truncate">{s.name}</div>
                    <span className="chip" data-tone={SETTLEMENT_ROLE_TONE[s.role] ?? "ice"} style={{ fontSize: "10px" }}>
                      {SETTLEMENT_ROLE_LABEL[s.role] ?? s.role}
                    </span>
                    <span className="chip" data-tone="glacier" style={{ fontSize: "10px" }}>
                      {s.relation}
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

      {practicalActivities.length > 0 && (
        <Section anchorId={PD.activities} title="Things to do nearby" icon={<Compass className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {practicalActivities.map((a, i) => (
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
                        <span className="chip" data-tone="glacier" style={{ fontSize: "10px" }}>
                          {a.season}
                        </span>
                      )}
                      {a.source === "derived" && (
                        <span className="chip" data-tone="ice" style={{ fontSize: "10px" }}>
                          Derived
                        </span>
                      )}
                    </div>
                    {a.note && (
                      <div className="text-[12px] text-frost italic mt-1 leading-snug">{prose(a.note)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section anchorId={PD.similar} title="Climate twins" icon={<Link2 className="w-4 h-4" style={{ color: "#c7b5ea" }} />}>
        <PlaceClimateTwins place={place} onOpenPlace={onOpenPlace} />
      </Section>

      <Section anchorId={PD.verdict} title="Hidden-gem verdict · sources">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <ScorePill label="Hidden gem" value={place.scores.hiddenGem} tone="sage" />
          <ScorePill label="Microclimate uniqueness" value={place.scores.microclimateUniqueness} tone="ochre" />
          <ScorePill label="Comfort" value={place.scores.comfort} tone="glacier" />
          <ScorePill label="Resilience" value={place.scores.resilience} tone="glacier" />
          <ScorePill label="Growability" value={place.scores.growability} tone="sage" />
          <ScorePill label="Tradeoff level" value={place.scores.tradeoff} tone="ember" />
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
            Citations name the station, product, or study behind each number. WMO-style 30-year windows are typically {CLIMATE_NORMALS_PERIOD} when a period appears in the label; mixed or reanalysis sources are called out in the note.
          </p>
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Citations
          </div>
          <ul className="space-y-1 text-sm">
            {place.citations.map((c, i) => {
              const href = safeExternalHref(c.url);
              return (
                <li key={i} className="flex items-start gap-2 text-frost">
                  <span className="chip" data-tone="ice" style={{ fontSize: "10px" }}>{c.kind.toUpperCase()}</span>
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

