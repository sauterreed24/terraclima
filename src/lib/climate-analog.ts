// ============================================================
// Terraclima — Climate Analog Engine ("Climate twins")
// ============================================================
//
// Answers the single most useful relocation question an atlas can
// answer: *"Where else feels like this place across the year?"* — and
// its real-world follow-up: *"…but warmer / cooler / milder in winter /
// drier / lower-risk."*
//
// Why a dedicated engine (vs. the older label-distance similarity)
// ----------------------------------------------------------------
// The previous similarity metric put ~50% of its weight on archetype /
// driver label overlap and only compared four scalar climate values
// (Jan low, Jul high, annual precip, elevation). Two consequences:
//   • Places that merely *share a label* read as twins even when the
//     lived year feels unrelated.
//   • The **shape of the year** — the thing people actually mean by
//     "feels like home" — was invisible. A flat tropical curve, a
//     single-peak continental curve, and a Mediterranean curve can all
//     share a Jul-high and a Jan-low while feeling nothing alike.
//
// This engine decomposes "feels like" into interpretable, physically
// grounded axes, each returning a 0..1 closeness, blended by documented
// weights into a 0..1 analog score. The per-axis breakdown is returned
// so the UI can say *what* matches and *where* two places diverge.
//
// Axes
// ----
//   • thermalLevel     — overall annual warmth (mean-of-monthly-means).
//   • seasonalShape    — the *shape* of the 12-month temperature curve,
//                        scale-/level-independent (Pearson correlation of
//                        the de-meaned monthly means). This is the axis
//                        the old metric was missing.
//   • seasonalAmplitude— maritime↔continental swing (warmest − coldest
//                        month). Two places can share a shape but differ
//                        wildly in how extreme the swing is.
//   • moisture         — annual precipitation (log scale).
//   • precipRegime     — *when* it rains: histogram intersection of the
//                        12-month precipitation share. Separates winter-wet
//                        Mediterranean, summer-wet monsoon, and even
//                        maritime regimes that share an annual total.
//   • aridity          — De Martonne water-balance aridity, computed from
//                        the same monthly normals as the dossier bioclim
//                        panel.
//   • continentality   — Conrad continentality, a latitude-normalized read
//                        on maritime vs. interior annual range.
//   • atmosphere       — humidity / sunshine / summer diurnal, on whatever
//                        measured signals both places share (diurnal always
//                        available; humidity / sunshine when present).
//   • mechanism        — shared microclimate archetypes & topographic
//                        drivers (Jaccard). Keeps the useful part of the
//                        old label signal as a modest tie-shaper.
//
// Everything here is pure, deterministic, and symmetric. Identical inputs
// score 1.0; the breakdown is cached by object identity so repeat detail
// opens don't rescan the corpus.
//
// What it is not: a forecast, an appraisal, or a claim about cost of
// living. It is editorial triage that ranks the atlas by climate kinship.

import type { MicroclimateArchetype, Place, TopographicDriver } from "../types";
import {
  avgRisk,
  getAnnualPrecipMm,
  meanAnnualHumidityPct,
  meanAnnualSunshinePct,
  meanJanLow,
  summerDiurnalC,
} from "./climate-metrics";
import { computeBioclim } from "./bioclim";

export type ClimateAnalogAxisKey =
  | "thermalLevel"
  | "seasonalShape"
  | "seasonalAmplitude"
  | "moisture"
  | "precipRegime"
  | "aridity"
  | "continentality"
  | "atmosphere"
  | "mechanism";

export interface ClimateAnalogAxis {
  key: ClimateAnalogAxisKey;
  /** Short UI label. */
  label: string;
  /** 0..1 closeness on this axis (1 = identical). */
  closeness: number;
  /** Blend weight applied to this axis. */
  weight: number;
}

export interface ClimateTwin {
  place: Place;
  /** 0..1 blended analog score. */
  analog: number;
  /** Per-axis breakdown for the UI. */
  axes: ClimateAnalogAxis[];
  /** Deterministic plain-language read of the match. */
  synopsis: string;
}

export interface ClimateTwinTradeoffRead {
  /** Compact header for the dossier callout. */
  label: string;
  /** One-sentence relocation read for the top twin. */
  summary: string;
  /** The two strongest physical similarities, already humanized for chips. */
  shared: string[];
  /** The main non-market climate tradeoff to pressure-test. */
  tradeoff: string;
  /** Next user action, intentionally screening-grade and non-prescriptive. */
  nextAction: string;
}

/** Blend weights — must sum to 1.0 (asserted in tests).
 *  The bioclim axes are modest physical tie-breakers: they strengthen annual
 *  water balance and maritime/interior structure without displacing the core
 *  lived-year shape signals. */
export const CLIMATE_ANALOG_WEIGHTS: Record<ClimateAnalogAxisKey, number> = {
  thermalLevel: 0.24,
  seasonalShape: 0.2,
  seasonalAmplitude: 0.13,
  moisture: 0.11,
  precipRegime: 0.11,
  aridity: 0.06,
  continentality: 0.06,
  atmosphere: 0.05,
  mechanism: 0.04,
};

const AXIS_LABEL: Record<ClimateAnalogAxisKey, string> = {
  thermalLevel: "Warmth",
  seasonalShape: "Seasons",
  seasonalAmplitude: "Swing",
  moisture: "Moisture",
  precipRegime: "Rain timing",
  aridity: "Aridity",
  continentality: "Continentality",
  atmosphere: "Air & light",
  mechanism: "Terrain",
};

const AXIS_ORDER: ClimateAnalogAxisKey[] = [
  "thermalLevel",
  "seasonalShape",
  "seasonalAmplitude",
  "moisture",
  "precipRegime",
  "aridity",
  "continentality",
  "atmosphere",
  "mechanism",
];

/** Gaussian-like falloff: 1 at zero distance, e^-1 at `scale`. */
function decay(diff: number, scale: number): number {
  return Math.exp(-(diff * diff) / (scale * scale));
}

/** Distance at which each scalar axis falls to e^-1. */
const SCALE = {
  /** Annual-mean temperature gap (°C). */
  thermalLevelC: 8,
  /** Annual-range (continentality) gap (°C). */
  amplitudeC: 13,
  /** Log-precip gap. */
  moistureLog: 1.1,
  /** De Martonne aridity-index gap. */
  deMartonne: 8,
  /** Conrad continentality-index gap. */
  conrad: 12,
  /** Atmospheric scalar gaps. */
  humidityPct: 22,
  sunshinePct: 18,
  diurnalC: 7,
} as const;

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function std(xs: readonly number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / xs.length);
}

function jaccard<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  let inter = 0;
  for (const t of b) if (sa.has(t)) inter++;
  const union = sa.size + b.length - inter;
  return union === 0 ? 0 : inter / union;
}

/** Pearson correlation; callers guard against zero-variance inputs. */
function pearson(a: readonly number[], b: readonly number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

interface AnalogFeatures {
  monthlyMean: number[];
  annualMean: number;
  amplitude: number;
  curveStd: number;
  logPrecip: number;
  precipShare: number[];
  deMartonne: number | null;
  conrad: number | null;
  humidity: number | null;
  sunshine: number | null;
  diurnal: number;
  archetypes: readonly MicroclimateArchetype[];
  drivers: readonly TopographicDriver[];
}

const _featureCache = new WeakMap<Place, AnalogFeatures>();

function features(p: Place): AnalogFeatures {
  const cached = _featureCache.get(p);
  if (cached) return cached;

  const highs = p.climate.tempHighC;
  const lows = p.climate.tempLowC;
  const monthlyMean = highs.map((h, i) => (h + lows[i]) / 2);
  const annualMean = mean(monthlyMean);
  const amplitude = Math.max(...monthlyMean) - Math.min(...monthlyMean);

  const precip = p.climate.precipMm;
  const precipSum = precip.reduce((a, b) => a + b, 0);
  const precipShare = precipSum > 0 ? precip.map(v => v / precipSum) : precip.map(() => 1 / 12);
  const bioclim = computeBioclim(p);

  const f: AnalogFeatures = {
    monthlyMean,
    annualMean,
    amplitude,
    curveStd: std(monthlyMean),
    logPrecip: Math.log1p(getAnnualPrecipMm(p)),
    precipShare,
    deMartonne: bioclim?.deMartonne.value ?? null,
    conrad: bioclim?.conrad.value ?? null,
    humidity: meanAnnualHumidityPct(p),
    sunshine: meanAnnualSunshinePct(p),
    diurnal: summerDiurnalC(p),
    archetypes: p.archetypes,
    drivers: p.drivers,
  };
  _featureCache.set(p, f);
  return f;
}

/** Curve-shape closeness, robust to (near-)isothermal years. */
function shapeCloseness(a: AnalogFeatures, b: AnalogFeatures): number {
  const ISO = 1.2; // °C std below which a year reads as essentially isothermal
  if (Math.max(a.curveStd, b.curveStd) < ISO) return 1; // both flat → same rhythm
  if (Math.min(a.curveStd, b.curveStd) < ISO) return 0.35; // one flat, one seasonal
  return Math.max(0, pearson(a.monthlyMean, b.monthlyMean));
}

/** Histogram intersection of monthly precip share ∈ [0,1]. */
function precipRegimeCloseness(a: AnalogFeatures, b: AnalogFeatures): number {
  let overlap = 0;
  for (let i = 0; i < 12; i++) overlap += Math.min(a.precipShare[i], b.precipShare[i]);
  return overlap;
}

function atmosphereCloseness(a: AnalogFeatures, b: AnalogFeatures): number {
  const parts: number[] = [decay(Math.abs(a.diurnal - b.diurnal), SCALE.diurnalC)];
  if (a.humidity != null && b.humidity != null) {
    parts.push(decay(Math.abs(a.humidity - b.humidity), SCALE.humidityPct));
  }
  if (a.sunshine != null && b.sunshine != null) {
    parts.push(decay(Math.abs(a.sunshine - b.sunshine), SCALE.sunshinePct));
  }
  return mean(parts);
}

function optionalIndexCloseness(a: number | null, b: number | null, scale: number): number {
  if (a == null && b == null) return 1;
  // De Martonne is undefined for frozen-year places; one undefined side should
  // mark a real mismatch without turning the whole analog score into a cliff.
  if (a == null || b == null) return 0.35;
  return decay(Math.abs(a - b), scale);
}

function axisCloseness(a: AnalogFeatures, b: AnalogFeatures): Record<ClimateAnalogAxisKey, number> {
  return {
    thermalLevel: decay(Math.abs(a.annualMean - b.annualMean), SCALE.thermalLevelC),
    seasonalShape: shapeCloseness(a, b),
    seasonalAmplitude: decay(Math.abs(a.amplitude - b.amplitude), SCALE.amplitudeC),
    moisture: decay(Math.abs(a.logPrecip - b.logPrecip), SCALE.moistureLog),
    precipRegime: precipRegimeCloseness(a, b),
    aridity: optionalIndexCloseness(a.deMartonne, b.deMartonne, SCALE.deMartonne),
    continentality: optionalIndexCloseness(a.conrad, b.conrad, SCALE.conrad),
    atmosphere: atmosphereCloseness(a, b),
    mechanism: 0.6 * jaccard(a.archetypes, b.archetypes) + 0.4 * jaccard(a.drivers, b.drivers),
  };
}

/** Per-axis breakdown between two places. */
export function analogBreakdown(a: Place, b: Place): ClimateAnalogAxis[] {
  const closeness = axisCloseness(features(a), features(b));
  return AXIS_ORDER.map(key => ({
    key,
    label: AXIS_LABEL[key],
    closeness: closeness[key],
    weight: CLIMATE_ANALOG_WEIGHTS[key],
  }));
}

/** Blended 0..1 climate-analog score (symmetric; identical inputs → 1). */
export function analogScore(a: Place, b: Place): number {
  const closeness = axisCloseness(features(a), features(b));
  let score = 0;
  for (const key of AXIS_ORDER) score += CLIMATE_ANALOG_WEIGHTS[key] * closeness[key];
  return score;
}

// ---- Plain-language synopsis -------------------------------------------------

const MATCH_PHRASE: Record<ClimateAnalogAxisKey, string> = {
  thermalLevel: "overall warmth",
  seasonalShape: "the same seasonal rhythm",
  seasonalAmplitude: "a similar maritime–continental swing",
  moisture: "annual moisture",
  precipRegime: "wet-season timing",
  aridity: "water-balance aridity",
  continentality: "continentality",
  atmosphere: "air and light",
  mechanism: "the terrain mechanism behind it",
};

const MATCH_CHIP_LABEL: Record<ClimateAnalogAxisKey, string> = {
  thermalLevel: "overall warmth",
  seasonalShape: "seasonal rhythm",
  seasonalAmplitude: "maritime/continental swing",
  moisture: "annual moisture",
  precipRegime: "rain timing",
  aridity: "water balance",
  continentality: "continentality",
  atmosphere: "air and light",
  mechanism: "terrain mechanism",
};

function divergencePhrase(key: ClimateAnalogAxisKey, anchor: Place, twin: Place): string {
  const fa = features(anchor);
  const ft = features(twin);
  switch (key) {
    case "thermalLevel":
      return ft.annualMean > fa.annualMean ? "runs warmer overall" : "runs cooler overall";
    case "seasonalAmplitude":
      return ft.amplitude > fa.amplitude ? "swings harder between seasons" : "has gentler seasons";
    case "moisture":
      return ft.logPrecip > fa.logPrecip ? "is wetter through the year" : "is drier through the year";
    case "precipRegime":
      return "rains on a different schedule";
    case "aridity":
      if (fa.deMartonne != null && ft.deMartonne != null) {
        return ft.deMartonne > fa.deMartonne ? "is less arid by water balance" : "is more arid by water balance";
      }
      return "has a differently defined aridity baseline";
    case "continentality":
      if (fa.conrad != null && ft.conrad != null) {
        return ft.conrad > fa.conrad ? "is more continental" : "is more ocean-tempered";
      }
      return "has a different continentality baseline";
    case "atmosphere": {
      if (fa.humidity != null && ft.humidity != null && Math.abs(ft.humidity - fa.humidity) > 8) {
        return ft.humidity > fa.humidity ? "feels more humid" : "feels drier in the air";
      }
      return ft.diurnal > fa.diurnal ? "cools off harder at night" : "holds its overnight warmth";
    }
    case "seasonalShape":
      return "follows a different seasonal arc";
    case "mechanism":
      return "is shaped by different terrain forces";
  }
}

/** Deterministic read: what aligns, and the single sharpest divergence. */
export function describeAnalogMatch(anchor: Place, twin: Place): string {
  const axes = analogBreakdown(anchor, twin);
  const matches = axes
    .filter(ax => ax.closeness >= 0.82)
    .sort((x, y) => y.closeness - x.closeness)
    .slice(0, 2);
  // The mechanism axis is a label tie-shaper, not something to flag as a
  // divergence — two clear climate twins routinely carry different archetype
  // labels, and "different terrain forces" would drown out the lived
  // difference (wetter, warmer, different rain timing) people actually want.
  const divergence = axes
    .filter(ax => ax.key !== "mechanism")
    .sort((x, y) => x.closeness - y.closeness)[0];

  let lead: string;
  if (matches.length >= 2) lead = `Shares ${MATCH_PHRASE[matches[0].key]} and ${MATCH_PHRASE[matches[1].key]}`;
  else if (matches.length === 1) lead = `Shares ${MATCH_PHRASE[matches[0].key]}`;
  else lead = "A loose climate cousin";

  if (divergence && divergence.closeness <= 0.66 && !matches.some(m => m.key === divergence.key)) {
    return `${lead}; ${divergencePhrase(divergence.key, anchor, twin)}.`;
  }
  return `${lead}; closely aligned across the year.`;
}

export function buildClimateTwinTradeoffRead(
  anchor: Place,
  twin: ClimateTwin,
  shift?: ClimateShiftId | null,
): ClimateTwinTradeoffRead {
  const meaningfulAxes = twin.axes.filter(ax => ax.key !== "mechanism");
  const shared = meaningfulAxes
    .slice()
    .sort((a, b) => b.closeness - a.closeness || b.weight - a.weight)
    .slice(0, 2)
    .map(ax => MATCH_CHIP_LABEL[ax.key]);
  const tradeoffAxis = meaningfulAxes
    .slice()
    .sort((a, b) => a.closeness - b.closeness || b.weight - a.weight)[0];
  const tradeoff = tradeoffAxis
    ? divergencePhrase(tradeoffAxis.key, anchor, twin.place)
    : "needs ordinary local verification";
  const shiftClause = shift ? ` through the ${CLIMATE_SHIFT_BY_ID[shift].label.toLowerCase()} lens` : "";
  const sharedClause = shared.length >= 2
    ? `${shared[0]} and ${shared[1]}`
    : shared[0] ?? "the broad annual climate";

  return {
    label: "Same feel, different tradeoffs",
    summary: `${twin.place.name} is the first same-feel comparison${shiftClause}: it preserves ${sharedClause}; the main climate tradeoff is that it ${tradeoff}.`,
    shared,
    tradeoff,
    nextAction: `Open ${twin.place.name} if that tradeoff sounds useful, or nudge the twin set before adding finalists to Compare.`,
  };
}

// ---- "Twin, but…" shift re-ranking ------------------------------------------

export type ClimateShiftId = "milder-winter" | "warmer" | "cooler" | "drier" | "lower-risk";

export interface ClimateShift {
  id: ClimateShiftId;
  label: string;
  /** Tooltip / aria description. */
  description: string;
}

export const CLIMATE_SHIFTS: readonly ClimateShift[] = [
  { id: "milder-winter", label: "Milder winter", description: "Twins with easier winter lows than here." },
  { id: "warmer", label: "Warmer", description: "Twins that run warmer across the year." },
  { id: "cooler", label: "Cooler", description: "Twins that run cooler across the year." },
  { id: "drier", label: "Drier", description: "Twins with less annual precipitation." },
  { id: "lower-risk", label: "Lower risk", description: "Twins with a lighter overall hazard load." },
];

export const CLIMATE_SHIFT_BY_ID: Record<ClimateShiftId, ClimateShift> = Object.fromEntries(
  CLIMATE_SHIFTS.map(s => [s.id, s]),
) as Record<ClimateShiftId, ClimateShift>;

/**
 * 0..1 reward for how much `twin` improves on `anchor` in the requested
 * direction. Returns 0 when the twin is equal or worse, so a shift only
 * ever promotes places that genuinely move the needle the right way.
 */
function shiftImprovement(anchor: Place, twin: Place, shift: ClimateShiftId): number {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  switch (shift) {
    case "milder-winter":
      return clamp01((meanJanLow(twin) - meanJanLow(anchor)) / 14);
    case "warmer":
      return clamp01((features(twin).annualMean - features(anchor).annualMean) / 10);
    case "cooler":
      return clamp01((features(anchor).annualMean - features(twin).annualMean) / 10);
    case "drier":
      return clamp01((getAnnualPrecipMm(anchor) - getAnnualPrecipMm(twin)) / 900);
    case "lower-risk":
      return clamp01((avgRisk(anchor) - avgRisk(twin)) / 2.2);
  }
}

/**
 * Shift eligibility. A "twin, but warmer / drier / …" must still be a
 * recognizable twin, so the shift only ever reorders the anchor's genuine
 * climate kin — never lets a place that merely satisfies the direction
 * (e.g. tropical Key West for a foggy cool coast asked for a "milder
 * winter") leapfrog the real twins. Eligibility is *relative* to the
 * anchor's own best twin (climates differ in how many close kin exist),
 * with an absolute floor as a backstop.
 */
const SHIFT_ELIGIBLE_BAND = 0.18;
const SHIFT_ABS_FLOOR = 0.62;
/** How much a selected shift can reorder the eligible-twin pool. */
const SHIFT_RERANK_WEIGHT = 0.35;

/** Ranked candidate before the (lazily built) prose synopsis is attached. */
interface RankedAnalog {
  place: Place;
  analog: number;
  axes: ClimateAnalogAxis[];
}

const _twinCache = new WeakMap<Place, WeakMap<readonly Place[], RankedAnalog[]>>();

function buildTwinPool(target: Place, pool: readonly Place[]): RankedAnalog[] {
  const scored: RankedAnalog[] = [];
  for (const p of pool) {
    if (p.id === target.id) continue;
    const axes = analogBreakdown(target, p);
    let analog = 0;
    for (const ax of axes) analog += ax.weight * ax.closeness;
    scored.push({ place: p, analog, axes });
  }
  scored.sort((a, b) => b.analog - a.analog || a.place.id.localeCompare(b.place.id));
  return scored;
}

function cachedTwinPool(target: Place, pool: readonly Place[]): RankedAnalog[] {
  let poolCache = _twinCache.get(target);
  if (!poolCache) {
    poolCache = new WeakMap<readonly Place[], RankedAnalog[]>();
    _twinCache.set(target, poolCache);
  }

  let ranked = poolCache.get(pool);
  if (!ranked) {
    ranked = buildTwinPool(target, pool);
    poolCache.set(pool, ranked);
  }
  return ranked;
}

function withSynopsis(target: Place, r: RankedAnalog): ClimateTwin {
  return { ...r, synopsis: describeAnalogMatch(target, r.place) };
}

/**
 * Top-k climate twins of `target`. Without a shift, ranks by raw analog
 * score. With a shift, restricts to the anchor's genuine twins (within
 * `SHIFT_ELIGIBLE_BAND` of the best, and at least `SHIFT_ABS_FLOOR`) and
 * reorders *those* toward the requested direction — the "like here, but
 * warmer / drier / lower-risk" workflow — so an unrelated climate can
 * never jump the queue just because it leans the right way.
 *
 * Each supplied pool is scored once per `target` (cached by identity); the
 * prose synopsis is built only for the handful of places actually returned.
 */
export function findClimateTwins(
  target: Place,
  pool: readonly Place[],
  k = 6,
  shift?: ClimateShiftId | null,
): ClimateTwin[] {
  const ranked = cachedTwinPool(target, pool);

  if (!shift) return ranked.slice(0, k).map(r => withSynopsis(target, r));

  const topAnalog = ranked[0]?.analog ?? 0;
  const floor = Math.max(SHIFT_ABS_FLOOR, topAnalog - SHIFT_ELIGIBLE_BAND);
  const eligible = ranked.filter(t => t.analog >= floor);
  // Never show fewer than k: if the anchor has few genuine kin, fall back to
  // its best available twins rather than dropping below the requested count.
  const base = eligible.length >= k ? eligible : ranked.slice(0, k);
  return [...base]
    .map(t => ({ t, rank: t.analog * (1 - SHIFT_RERANK_WEIGHT) + shiftImprovement(target, t.place, shift) * SHIFT_RERANK_WEIGHT }))
    .sort((a, b) => b.rank - a.rank || b.t.analog - a.t.analog || a.t.place.id.localeCompare(b.t.place.id))
    .slice(0, k)
    .map(({ t }) => withSynopsis(target, t));
}
