// ============================================================
// Terraclima — Climate-scenario projection ("2050 time machine")
// ============================================================
//
// Deterministic, pure transformation that morphs a place's authored
// 1991–2020 normals into a mid-century (~2050) layer under two CMIP6 shared
// socioeconomic pathways: SSP2-4.5 ("middle of the road") and SSP5-8.5
// ("high emissions").
//
// HONESTY / SOURCING
// ------------------
// The corpus does NOT carry downscaled per-site CMIP6 output. Rather than
// fabricate per-place forecasts, the default resolver applies a small, coarse,
// SOURCED regional anomaly table keyed by country + latitude band. This is an
// *illustrative regional projection*, not a downscaled per-site forecast — the
// UI labels it as such. A place MAY override the regional value with an
// authored, cited `Place.projection` vector (then the override wins).
//
// Central anomaly estimates are read from the published mid-century
// (2041–2060) ranges in:
//   • IPCC AR6 WGI Atlas — North America & Central America regional fact
//     sheets (regional means; warming and precip direction by sub-region).
//   • NASA NEX-GDDP-CMIP6 downscaled multi-model ensemble (magnitude sanity).
// Values capture the two robust signals: (1) high-latitude winter
// amplification (Arctic/boreal winters warm faster than summers), and (2) the
// wet-north / dry-southwest precipitation dipole.
//
// What is projected: monthly highs + lows (via a seasonal warming curve
// anchored on the JJA-high and DJF-low deltas), monthly + annual precipitation
// (uniform % scale), snowfall (a documented snow-to-rain thermodynamic
// reduction), and derived frost-free days. Authored editorial 0..100 scores
// (resilience, growability, …) are scenario-invariant by design. Humidity and
// sunshine are carried through unchanged (the table does not project them).
// ============================================================

import type { ClimateDelta, ClimateProfile, Country, Monthly12, Place, ScenarioId } from "../types";

const DAYS_IN_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  short: string;
  description: string;
}

/** Scenario layers in slider order (now → moderate → high). */
export const SCENARIOS: readonly ScenarioMeta[] = [
  { id: "now", label: "Now (1991–2020)", short: "Now", description: "Authored present-day climate normals." },
  { id: "ssp245", label: "2050 · SSP2-4.5", short: "2050 mid", description: "Mid-century under the 'middle of the road' emissions pathway." },
  { id: "ssp585", label: "2050 · SSP5-8.5", short: "2050 high", description: "Mid-century under the 'high emissions' pathway." },
] as const;

export const SCENARIO_IDS: readonly ScenarioId[] = SCENARIOS.map(s => s.id);

export function scenarioMeta(id: ScenarioId): ScenarioMeta {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0]!;
}

/** Documented provenance for the regional anomaly table (UI + audit surface). */
export const SCENARIO_SOURCES: readonly { label: string; url: string }[] = [
  { label: "IPCC AR6 WGI Atlas — North & Central America regional fact sheets", url: "https://interactive-atlas.ipcc.ch/" },
  { label: "NASA NEX-GDDP-CMIP6 downscaled ensemble", url: "https://www.nasa.gov/nex/gddp" },
];

type LatBandKey = "tropical" | "subtropical" | "midlat" | "northern" | "boreal" | "arctic";

/** Latitude band of a place by absolute latitude (hemisphere-agnostic). */
export function latBand(latDeg: number): LatBandKey {
  const lat = Math.abs(latDeg);
  if (lat < 25) return "tropical";
  if (lat < 35) return "subtropical";
  if (lat < 45) return "midlat";
  if (lat < 55) return "northern";
  if (lat < 65) return "boreal";
  return "arctic";
}

// Coarse, sourced mid-century (~2050) anomaly central estimates vs the
// 1991–2020 baseline. deltaJJAHighC = summer-high warming; deltaJANLowC =
// winter-low warming (larger at high latitude = Arctic amplification);
// deltaPrecipPct = annual precipitation change (wet-north / dry-southwest).
const REGIONAL_DELTAS: Record<ScenarioId, Record<LatBandKey, ClimateDelta>> = {
  now: {
    tropical: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
    subtropical: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
    midlat: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
    northern: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
    boreal: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
    arctic: { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 },
  },
  ssp245: {
    tropical: { deltaJJAHighC: 1.6, deltaJANLowC: 1.4, deltaPrecipPct: -5 },
    subtropical: { deltaJJAHighC: 1.9, deltaJANLowC: 1.6, deltaPrecipPct: -6 },
    midlat: { deltaJJAHighC: 2.0, deltaJANLowC: 1.9, deltaPrecipPct: 2 },
    northern: { deltaJJAHighC: 2.1, deltaJANLowC: 2.4, deltaPrecipPct: 5 },
    boreal: { deltaJJAHighC: 2.3, deltaJANLowC: 3.2, deltaPrecipPct: 8 },
    arctic: { deltaJJAHighC: 2.6, deltaJANLowC: 4.5, deltaPrecipPct: 12 },
  },
  ssp585: {
    tropical: { deltaJJAHighC: 2.2, deltaJANLowC: 2.0, deltaPrecipPct: -8 },
    subtropical: { deltaJJAHighC: 2.7, deltaJANLowC: 2.3, deltaPrecipPct: -9 },
    midlat: { deltaJJAHighC: 2.9, deltaJANLowC: 2.8, deltaPrecipPct: 3 },
    northern: { deltaJJAHighC: 3.1, deltaJANLowC: 3.6, deltaPrecipPct: 7 },
    boreal: { deltaJJAHighC: 3.4, deltaJANLowC: 4.8, deltaPrecipPct: 11 },
    arctic: { deltaJJAHighC: 3.9, deltaJANLowC: 6.5, deltaPrecipPct: 16 },
  },
};

// Mexico's interior/southwest leans drier than the latitude-only read; nudge
// the precip signal so a Sonoran/Bajío place isn't shown wetter than AR6's
// Central-America drying. Small, documented, country-level correction.
const COUNTRY_PRECIP_NUDGE_PCT: Record<Country, number> = {
  USA: 0,
  Canada: 0,
  Mexico: -4,
};

/** Coarse regional anomaly for a place under a scenario (before override). */
export function regionalDelta(place: Place, scenario: ScenarioId): ClimateDelta {
  const base = REGIONAL_DELTAS[scenario][latBand(place.lat)];
  if (scenario === "now") return base;
  const nudge = COUNTRY_PRECIP_NUDGE_PCT[place.country] ?? 0;
  return { ...base, deltaPrecipPct: base.deltaPrecipPct + nudge };
}

/** Override-aware anomaly: authored `Place.projection` wins over the table. */
export function resolveDelta(place: Place, scenario: ScenarioId): ClimateDelta {
  if (scenario === "now") return { deltaJJAHighC: 0, deltaJANLowC: 0, deltaPrecipPct: 0 };
  return place.projection?.[scenario] ?? regionalDelta(place, scenario);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Seasonal warming weight for month `i` (0=Jan): 0 in deep winter (Jan), 1 at
 * peak summer (Jul), smooth cosine in between. Lets the two anchor deltas
 * (winter-low, summer-high) drive a full 12-month warming curve.
 */
function seasonalWeight(monthIndex: number): number {
  return (1 - Math.cos((2 * Math.PI * monthIndex) / 12)) / 2;
}

/**
 * Frost-free-days estimate from monthly lows: a soft count of days whose
 * monthly mean low clears ~0 °C (full credit ≥ 2 °C, none ≤ −2 °C, linear
 * between). A deterministic proxy — not a daily-resolution frost model.
 */
export function estimateFrostFreeDays(lowsC: readonly number[]): number {
  let days = 0;
  for (let i = 0; i < 12; i += 1) {
    const frac = Math.max(0, Math.min(1, (lowsC[i]! + 2) / 4));
    days += frac * DAYS_IN_MONTH[i]!;
  }
  return Math.round(days);
}

/** Apply an anomaly vector to a climate profile. Pure; returns a fresh object. */
export function projectClimateProfile(climate: ClimateProfile, delta: ClimateDelta): ClimateProfile {
  const { deltaJJAHighC, deltaJANLowC, deltaPrecipPct } = delta;
  if (deltaJJAHighC === 0 && deltaJANLowC === 0 && deltaPrecipPct === 0) return climate;

  const warming = (i: number) => deltaJANLowC + (deltaJJAHighC - deltaJANLowC) * seasonalWeight(i);
  const precipScale = 1 + deltaPrecipPct / 100;

  const tempHighC = climate.tempHighC.map((v, i) => round1(v + warming(i))) as Monthly12;
  const tempLowC = climate.tempLowC.map((v, i) => round1(v + warming(i))) as Monthly12;
  const precipMm = climate.precipMm.map(v => Math.max(0, Math.round(v * precipScale))) as Monthly12;

  // Snow → rain shift: each +1 °C of that month's warming sheds ~10% of snow,
  // floored at a 70% loss (so heavy snowbelts still keep a winter signature).
  const snowCm = climate.snowCm
    ? (climate.snowCm.map((v, i) => round1(v * Math.max(0.3, 1 - 0.1 * Math.max(0, warming(i))))) as Monthly12)
    : undefined;

  const annualPrecipMm = Math.round(precipMm.reduce((s, v) => s + v, 0));

  return {
    ...climate,
    tempHighC,
    tempLowC,
    precipMm,
    annualPrecipMm,
    ...(snowCm ? { snowCm } : {}),
    frostFreeDays: estimateFrostFreeDays(tempLowC),
  };
}

const _projectionCache = new WeakMap<Place, Partial<Record<ScenarioId, Place>>>();

/**
 * Project a place to a scenario. `now` returns the original object (identity,
 * so callers can `===`-compare and reuse caches). Other scenarios return a new
 * `Place` with a morphed `climate`; everything else is carried through. Cached
 * per (place, scenario) so repeated re-rank/analog passes reuse the object —
 * which keeps the bioclim / climate-analog WeakMap caches warm.
 */
export function projectPlace(place: Place, scenario: ScenarioId): Place {
  if (scenario === "now") return place;
  let byScenario = _projectionCache.get(place);
  if (!byScenario) {
    byScenario = {};
    _projectionCache.set(place, byScenario);
  }
  const cached = byScenario[scenario];
  if (cached) return cached;

  const delta = resolveDelta(place, scenario);
  const projected: Place = { ...place, climate: projectClimateProfile(place.climate, delta) };
  byScenario[scenario] = projected;
  return projected;
}

const _poolCache = new WeakMap<readonly Place[], Partial<Record<ScenarioId, Place[]>>>();

/** Project a whole pool to a scenario (memoized by pool identity + scenario). */
export function projectPool(pool: readonly Place[], scenario: ScenarioId): Place[] {
  if (scenario === "now") return pool as Place[];
  let byScenario = _poolCache.get(pool);
  if (!byScenario) {
    byScenario = {};
    _poolCache.set(pool, byScenario);
  }
  const cached = byScenario[scenario];
  if (cached) return cached;
  const projected = pool.map(p => projectPlace(p, scenario));
  byScenario[scenario] = projected;
  return projected;
}

/**
 * Resolve a compare slot to the active climate layer.
 * Prefer the narrowed Explorer pool; otherwise project the corpus place when
 * scn≠now so Compare never mixes present-day normals with a future banner.
 */
export function placeForCompareSlot(
  id: string,
  poolById: Readonly<Record<string, Place>>,
  scenario: ScenarioId,
  corpusPlace: Place | undefined,
): Place | undefined {
  const fromPool = poolById[id];
  if (fromPool) return fromPool;
  if (!corpusPlace) return undefined;
  return scenario === "now" ? corpusPlace : projectPlace(corpusPlace, scenario);
}
