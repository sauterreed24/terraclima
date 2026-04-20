import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, useEffect, useMemo, useRef, useId, useCallback } from "react";
import { useFocusTrap } from "../hooks/use-focus-trap";
import type { Place, MicroclimateArchetype, TopographicDriver } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { ClimateRibbon } from "./charts/ClimateRibbon";
import { PrecipBars } from "./charts/PrecipBars";
import { MicroclimateFingerprint } from "./charts/MicroclimateFingerprint";
import { RiskProfile } from "./charts/RiskProfile";
import { ContrastChart } from "./charts/ContrastChart";
import { ClimateChangeDelta } from "./charts/ClimateChangeDelta";
import { ComfortMatrix } from "./charts/ComfortMatrix";
import { MiniClimateStrip } from "./charts/MiniClimateStrip";
import { PLACES, PLACES_BY_ID } from "../data/places";
import { CONCEPTS } from "../data/glossary";
import { meanJanLow, meanJulyHigh } from "../lib/scoring";
import { useUnits, fmtTemp, fmtPrecip, fmtPrecipSmall, fmtElev, fmtDelta, useProse } from "../lib/units";
import { computeBestMonths } from "../lib/best-months";
import { findSimilarPlaces } from "../lib/similarity";
import { composeFieldStory } from "../lib/place-story";
import { getPlaceHeroMedia, openStreetMapUrl } from "../lib/place-hero-media";
import { mergeDeepSections } from "../lib/place-appendix-sections";
import { clearDossierHash } from "../lib/dossier-url-hash";
import { useDetailReadingSpy } from "../hooks/use-detail-reading-spy";
import { PlaceDeepSections } from "./place-detail/PlaceDeepSections";
import { PD, buildPlaceDetailNavItems } from "./place-detail/place-detail-nav";
import { PlaceDetailReadingNav } from "./place-detail/PlaceDetailReadingNav";
import {
  X, ArrowLeftRight, BookOpen, MapPin, Mountain, Sparkles, Leaf, CloudRain, Wind,
  TrendingUp, Thermometer, Droplets, Sun, ChevronRight, HelpCircle, Calendar, Link2,
  Users, Compass, ExternalLink,
} from "lucide-react";

const TONE_HERO: Record<string, string> = {
  glacier: "radial-gradient(1000px 300px at 15% 0%, rgba(94,196,220,0.22), transparent 65%)",
  sage: "radial-gradient(1000px 300px at 15% 0%, rgba(61,143,85,0.12), transparent 65%)",
  ochre: "radial-gradient(1000px 300px at 15% 0%, rgba(255,224,102,0.28), transparent 65%)",
  ember: "radial-gradient(1000px 300px at 15% 0%, rgba(255,196,214,0.35), transparent 65%)",
  ice: "radial-gradient(1000px 300px at 15% 0%, rgba(196,236,245,0.35), transparent 65%)",
  aurora: "radial-gradient(1000px 300px at 15% 0%, rgba(255,196,214,0.4), transparent 65%)",
};

const ARCHETYPE_ACCENT: Record<string, string> = {
  glacier: "linear-gradient(180deg, #8cc8e0 0%, #2b7a9a 100%)",
  sage: "linear-gradient(180deg, #c6dcbd 0%, #567957 100%)",
  ochre: "linear-gradient(180deg, #f0d29c 0%, #9a7c3b 100%)",
  ember: "linear-gradient(180deg, #efb49a 0%, #9a4a2a 100%)",
  ice: "linear-gradient(180deg, #c3e4f1 0%, #4faacd 100%)",
  aurora: "linear-gradient(180deg, #c7b5ea 0%, #5a4397 100%)",
};

/** Solid leading edge on the detail drawer — instant place identity without re-tinting the whole panel. */
const DRAWER_EDGE: Record<string, string> = {
  glacier: "#1a8fa8",
  sage: "#2d6b45",
  ochre: "#c77d12",
  ember: "#c24a28",
  ice: "#2a8aad",
  aurora: "#6b4aa3",
};

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const RISK_SCORE: Record<string, number> = {
  "very-low": 0,
  "low": 1,
  "moderate": 2,
  "elevated": 3,
  "high": 4,
  "very-high": 5,
};

const RISK_LABEL: Record<string, string> = {
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

interface Props {
  place: Place | null;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompareIds?: Set<string>;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  onOpenPlace?: (id: string) => void;
}

export function PlaceDetail({ place, onClose, onCompareToggle, inCompareIds, onPickArchetype, onOpenPlace }: Props) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const drawerEdge = place ? (DRAWER_EDGE[ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "ice"] ?? DRAWER_EDGE.ice) : DRAWER_EDGE.ice;
  useFocusTrap(panelRef, Boolean(place));

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
    if (!place) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [place, onClose]);

  useEffect(() => {
    if (!place) return;
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = 0;
    requestAnimationFrame(() => {
      const closeBtn = el.querySelector<HTMLElement>("[data-place-detail-close]");
      (closeBtn ?? el).focus({ preventScroll: true });
      const hash = window.location.hash;
      if (hash.startsWith("#deep-")) {
        const target = el.querySelector<HTMLElement>(hash);
        if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
        else clearDossierHash();
      }
    });
  }, [place?.id]);

  return (
    <AnimatePresence>
      {place && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="fixed inset-0 z-30 bg-[rgba(62,38,24,0.28)] backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            key={place.id}
            data-place-detail
            tabIndex={-1}
            role="dialog"
            aria-labelledby={titleId}
            aria-modal="true"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.4 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 32 }
            }
            className="fixed top-0 right-0 h-full w-full md:w-[min(92vw,900px)] max-w-full z-40 panel !rounded-none !border-y-0 !border-r-0 overflow-y-auto outline-none border-l-[5px] border-l-transparent"
            style={{
              boxShadow: "-20px 0 48px -14px rgba(62, 38, 24, 0.18)",
              borderLeftColor: drawerEdge,
            }}
          >
            <DetailHeader
              place={place}
              titleId={titleId}
              onClose={onClose}
              onCompareToggle={onCompareToggle}
              inCompare={inCompareIds?.has(place.id) ?? false}
              onPickArchetype={onPickArchetype}
            />
            <DetailBody place={place} onPickArchetype={onPickArchetype} onOpenPlace={onOpenPlace} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CopyPlaceLink({ placeId }: { placeId: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("p", placeId);
    void navigator.clipboard.writeText(u.toString()).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [placeId]);
  return (
    <button
      type="button"
      onClick={onCopy}
      className="btn-ghost !text-xs !border-[rgba(26,143,168,0.38)] !bg-[rgba(232,248,252,0.35)] hover:!border-[rgba(26,143,168,0.55)] hover:!bg-[rgba(232,248,252,0.65)]"
      title="Copy URL to this place"
    >
      <Link2 className="w-3 h-3" aria-hidden />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function DetailHeader({
  place, titleId, onClose, onCompareToggle, inCompare, onPickArchetype,
}: {
  place: Place;
  titleId: string;
  onClose: () => void;
  onCompareToggle?: (id: string) => void;
  inCompare: boolean;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
}) {
  const { temp, dist } = useUnits();
  const tone = ARCHETYPE_BY_ID[place.archetypes[0]]?.tone ?? "ice";
  const julyHigh = meanJulyHigh(place);
  const janLow = meanJanLow(place);
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const sunshine = place.climate.sunshinePct
    ? Math.round(place.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12)
    : null;
  const tierLabel = place.tier === "A" ? "Flagship" : place.tier === "B" ? "Spotlight" : "Index";
  const hero = useMemo(() => getPlaceHeroMedia(place.id), [place.id]);
  const osmHref = openStreetMapUrl(place.lat, place.lon, 10);

  return (
    <div
      className="sticky top-0 z-10 panel !rounded-none !border-x-0 !border-t-0 px-6 pt-5 pb-4 bg-[rgba(255,253,248,0.97)] backdrop-blur relative border-b border-[rgba(200,160,120,0.35)]"
      style={{ backgroundImage: TONE_HERO[tone] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-stone mb-1 flex-wrap">
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
          <h2 id={titleId} className="font-atlas text-3xl text-ice tracking-tight leading-[1.15]">
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
        <div className="flex items-center gap-1 shrink-0">
          <CopyPlaceLink placeId={place.id} />
          {onCompareToggle && (
            <button
              type="button"
              onClick={() => onCompareToggle(place.id)}
              className={`btn-ghost !text-xs ${inCompare ? "!border-[rgba(240,210,156,0.8)] !text-ochre-300" : ""}`}
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
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      {hero && (
        <figure className="mt-4 rounded-2xl overflow-hidden border border-[rgba(200,160,120,0.45)] shadow-[0_8px_28px_-12px_rgba(62,38,24,0.12)]">
          <img
            src={hero.src}
            alt={hero.alt}
            width={1280}
            height={520}
            className="w-full h-44 md:h-52 object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <figcaption className="px-3 py-2 text-[10px] leading-snug text-stone bg-[rgba(252,244,232,0.96)] border-t border-[rgba(200,160,120,0.28)]">
            {hero.creditLine}
          </figcaption>
        </figure>
      )}

      <div className="mt-2">
        <a
          href={osmHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-glacier-700 hover:text-glacier-500 hover:underline"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
          Open this area on a live map (OpenStreetMap)
          <ExternalLink className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <HeroStat icon={<Thermometer className="w-3.5 h-3.5" style={{ color: "#f0d29c" }} />} label="Jul high" value={fmtTemp(julyHigh, temp)} />
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

      <div className="mt-3">
        <MiniClimateStrip place={place} height={22} />
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel-thin px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-stone flex items-center gap-1">{icon}{label}</div>
      <div className="font-mono-num text-sm text-ice">{value}</div>
    </div>
  );
}

function DetailBody({
  place, onPickArchetype, onOpenPlace,
}: {
  place: Place;
  onPickArchetype?: (a: MicroclimateArchetype) => void;
  onOpenPlace?: (id: string) => void;
}) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  const annualP = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const [activeDriver, setActiveDriver] = useState<TopographicDriver | null>(null);

  const activeConcept = activeDriver
    ? CONCEPTS.find(c => c.id === DRIVER_CONCEPT_MAP[activeDriver])
    : null;

  const synthesized = useMemo(() => synthesizePlaceSignals(place, temp, dist), [place, temp, dist]);
  const bestMonths = useMemo(() => computeBestMonths(place), [place]);
  const similar = useMemo(() => findSimilarPlaces(place, PLACES, 3), [place]);
  const fieldStory = useMemo(() => composeFieldStory(place, temp, dist), [place, temp, dist]);
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
      <Section anchorId={PD.overview}>
        <p className="font-atlas text-lg text-ice/95 leading-relaxed italic">
          <span aria-hidden="true" className="text-ochre-500">&ldquo;</span>
          {prose(place.summaryShort)}
          <span aria-hidden="true" className="text-ochre-500">&rdquo;</span>
        </p>
        <div className="divider-contour my-4" />
        <p className="text-[color:var(--color-frost-strong)] leading-relaxed">{prose(place.summaryImmersive)}</p>
      </Section>

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

      <Section anchorId={PD.whyHere} icon={<Sparkles className="w-4 h-4" style={{ color: "#f0d29c" }} />} title="Why this climate is different here">
        <p className="text-[color:var(--color-frost-strong)] leading-relaxed">{prose(place.whyDistinct)}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {place.drivers.map(d => {
            const hasConcept = DRIVER_CONCEPT_MAP[d] != null;
            const active = activeDriver === d;
            return (
              <button
                key={d}
                className="chip chip-btn"
                data-tone="ochre"
                data-active={active}
                onClick={() => setActiveDriver(active ? null : d)}
                title={hasConcept ? "Click to explain" : DRIVER_LABELS[d]}
              >
                {DRIVER_LABELS[d]}
                {hasConcept && <HelpCircle className="w-3 h-3 opacity-70" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {activeConcept && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 panel-warm p-4 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-atlas text-base text-ice">{activeConcept.term}</div>
                <button onClick={() => setActiveDriver(null)} className="text-stone hover:text-ice"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-sm text-frost">{prose(activeConcept.short)}</div>
              <div className="text-sm text-ice leading-relaxed mt-2">{prose(activeConcept.long)}</div>
              {activeConcept.mechanism && (
                <div className="text-xs text-stone italic mt-2"><span className="uppercase tracking-wider not-italic">Under the hood ·</span> {prose(activeConcept.mechanism)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
            <div className="text-[10px] text-stone mt-2 flex items-center gap-3 flex-wrap">
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
                  {w.note && <div className="text-[11px] text-stone italic mt-0.5 leading-snug">{w.note}</div>}
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

      {(place.localContrast?.length || place.nearbyContrasts?.length) ? (
        <Section anchorId={PD.contrast} title="Local contrast" icon={<TrendingUp className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          {place.localContrast && <ContrastChart contrasts={place.localContrast} />}
          {place.nearbyContrasts && place.nearbyContrasts.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone">Nearby contrasts</div>
              {place.nearbyContrasts.map((n, i) => {
                const linked = n.placeId && PLACES_BY_ID[n.placeId];
                return linked ? (
                  <button
                    key={i}
                    onClick={() => onOpenPlace?.(n.placeId!)}
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

      <Section anchorId={PD.soil} title="Soil & growability" icon={<Leaf className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
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
                {place.growability.growsWell.map(g => <span key={g} className="chip" data-tone="sage">{g}</span>)}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-stone mb-1">Tricky</div>
              <div className="flex flex-wrap gap-1">
                {place.growability.tricky.map(g => <span key={g} className="chip" data-tone="ember">{g}</span>)}
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

      {place.settlementsWithinZone && place.settlementsWithinZone.length > 0 && (
        <Section anchorId={PD.settlements} title="Settlements within this zone" icon={<Users className="w-4 h-4" style={{ color: "#c3e4f1" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {place.settlementsWithinZone.map(s => (
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
            Towns listed share the same microclimate influences; each can feel subtly different along the gradient.
          </div>
        </Section>
      )}

      {place.thingsToDo && place.thingsToDo.length > 0 && (
        <Section anchorId={PD.activities} title="Things to do in zone" icon={<Compass className="w-4 h-4" style={{ color: "#c6dcbd" }} />}>
          <div className="grid md:grid-cols-2 gap-2">
            {place.thingsToDo.map((a, i) => (
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

      {similar.length > 0 && (
        <Section anchorId={PD.similar} title="Places that feel similar" icon={<Link2 className="w-4 h-4" style={{ color: "#c7b5ea" }} />}>
          <div className="grid md:grid-cols-3 gap-2">
            {similar.map(({ place: s, score }) => {
              const sTone = ARCHETYPE_BY_ID[s.archetypes[0]]?.tone ?? "ice";
              return (
                <button
                  key={s.id}
                  onClick={() => onOpenPlace?.(s.id)}
                  className="panel-thin p-3 text-left reveal-row min-w-0 relative overflow-hidden"
                  title={`Open ${s.name}`}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 bottom-0 w-[3px]"
                    style={{ background: ARCHETYPE_ACCENT[sTone] }}
                  />
                  <div className="pl-2 min-w-0">
                    <div className="font-atlas text-sm text-ice truncate">{s.name}</div>
                    <div className="text-[11px] text-stone truncate">{s.region}, {s.country === "USA" ? "US" : s.country === "Canada" ? "CA" : "MX"}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.archetypes.slice(0, 2).map(a => (
                        <span key={a} className="chip" data-tone={ARCHETYPE_BY_ID[a]?.tone ?? "ice"} style={{ fontSize: "10px" }}>
                          {ARCHETYPE_BY_ID[a]?.label ?? a}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 text-[10px] text-stone flex items-center gap-1.5">
                      <span>Resonance</span>
                      <span className="font-mono-num text-frost">{Math.round(score * 100)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-stone italic mt-2">Ranked by shared archetypes, topographic drivers, and climate distance.</div>
        </Section>
      )}

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
          <div className="text-[10px] uppercase tracking-wider text-stone mb-1.5 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Citations
          </div>
          <ul className="space-y-1 text-sm">
            {place.citations.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-frost">
                <span className="chip" data-tone="ice" style={{ fontSize: "10px" }}>{c.kind.toUpperCase()}</span>
                <span>
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline decoration-[rgba(140,200,224,0.55)] decoration-dotted hover:text-ice"
                    >
                      {c.label}
                    </a>
                  ) : c.label}
                  {c.note ? <span className="text-stone italic"> — {prose(c.note)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      </div>
    </div>
  );
}

function Section({
  anchorId,
  title,
  icon,
  children,
}: {
  anchorId?: string;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in">
      {title && (
        <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
          {icon}{title}
        </h3>
      )}
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm border-b last:border-0 border-[rgba(200,160,120,0.28)]">
      <span className="text-stone">{label}</span>
      <span className="text-frost text-right font-mono-num">{value}</span>
    </div>
  );
}

function LabelRow({ label }: { label: string }) {
  return <div className="text-[10px] uppercase tracking-wider text-stone mb-1">{label}</div>;
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-stone">{text}</span>
    </span>
  );
}

function ScorePill({ label, value, tone }: { label: string; value: number; tone: "glacier" | "sage" | "ochre" | "ember" }) {
  const c: Record<string, string> = { glacier: "#8cc8e0", sage: "#c6dcbd", ochre: "#f0d29c", ember: "#d37c5b" };
  return (
    <div className="panel-thin p-3">
      <div className="text-[10px] uppercase tracking-wider text-stone">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono-num text-xl" style={{ color: c[tone] }}>{value}</span>
        <span className="text-xs text-stone">/ 100</span>
      </div>
      <div className="h-1 rounded-full bg-[rgba(71,90,122,0.4)] mt-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: c[tone] }} />
      </div>
    </div>
  );
}

function synthesizePlaceSignals(place: Place, temp: "F" | "C", dist: "imperial" | "metric"): { lines: { label: string; value: string }[]; topRisks: string[] } {
  const highs = place.climate.tempHighC;
  const lows = place.climate.tempLowC;
  const precip = place.climate.precipMm;
  const snow = place.climate.snowCm;

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const annualSpan = maxHigh - minLow;

  const wetIdx = precip.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
  const dryIdx = precip.reduce((best, v, i, arr) => (v < arr[best] ? i : best), 0);
  const wet = precip[wetIdx];
  const dry = precip[dryIdx];
  const wetDryRatio = dry <= 0.1 ? "∞" : `${(wet / dry).toFixed(1)}×`;

  const comfortMonths = highs.filter(h => h >= 12 && h <= 28).length;

  const lines: { label: string; value: string }[] = [
    {
      label: "Annual thermal span",
      value: `${fmtTemp(minLow, temp)} to ${fmtTemp(maxHigh, temp)} (${fmtDelta(annualSpan, temp, { signed: false })})`,
    },
    {
      label: "Wettest / driest month",
      value: `${MONTHS[wetIdx]} ${fmtPrecipSmall(wet, dist)} · ${MONTHS[dryIdx]} ${fmtPrecipSmall(dry, dist)} (${wetDryRatio})`,
    },
    {
      label: temp === "F"
        ? "Comfort-window months (54–82°F highs)"
        : "Comfort-window months (12–28°C highs)",
      value: `${comfortMonths} / 12`,
    },
  ];

  if (place.climate.humidity) {
    const h = place.climate.humidity;
    const summerAvg = (h[5] + h[6] + h[7]) / 3;
    const winterAvg = (h[11] + h[0] + h[1]) / 3;
    lines.push({
      label: "Humidity regime",
      value: `Summer ${Math.round(summerAvg)}% · Winter ${Math.round(winterAvg)}%`,
    });
  }

  if (snow) {
    const snowMonths = snow.filter(v => v > 0.5).length;
    lines.push({
      label: "Snow-active months",
      value: `${snowMonths} / 12`,
    });
  }

  const risks = Object.entries(place.risks)
    .map(([k, v]) => ({ key: k, level: v.level, score: RISK_SCORE[v.level] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score >= 3)
    .slice(0, 3)
    .map(r => `${RISK_LABEL[r.key] ?? r.key} · ${r.level}`);

  return { lines, topRisks: risks };
}
