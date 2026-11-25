// ============================================================
// Atlas-wide distributions — percentiles & ranks for 200+ stops
// One-time O(n) sort at module init; per-place calls use binary search and
// WeakMap caches so cards, map hints, and detail panels reuse identical ranks.
// ============================================================

import type { Place } from "../types";
import { PLACES, PLACE_ANNUAL_PRECIP } from "../data/places";
import { getAnnualPrecipMm, meanSummerHigh, meanJanLow, summerDiurnalC } from "./climate-metrics";
import { computeBioclim, CONRAD_GLOSS, DE_MARTONNE_GLOSS } from "./bioclim";
import { gddForUnit, type TempUnit } from "./units";

function sortAsc(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

function lowerBound(sortedAsc: readonly number[], value: number): number {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedAsc[mid]! < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function upperBound(sortedAsc: readonly number[], value: number): number {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedAsc[mid]! <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function fracStrictlyLess(value: number, sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0.5;
  return lowerBound(sortedAsc, value) / sortedAsc.length;
}

function fracStrictlyGreater(value: number, sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0.5;
  return (sortedAsc.length - upperBound(sortedAsc, value)) / sortedAsc.length;
}

function pct(share: number): string {
  return `${Math.max(0, Math.min(100, Math.round(share * 100)))}%`;
}

/**
 * "wetter than 72%" reads well; "wetter than 0%" (Death Valley) does not.
 * Below the median, flip to the opposite comparison ("drier than 99%").
 */
function rankPhrase(share: number, above: string, below: string): string {
  if (share >= 0.5) return `${above} than ${pct(Math.min(share, 0.99))}`;
  return `${below} than ${pct(Math.min(1 - share, 0.99))}`;
}

export interface AtlasCorpusDistributions {
  readonly n: number;
  /** Mean Jun-Aug high (°C) */
  july: readonly number[];
  /** Mean Jan low (°C) */
  jan: readonly number[];
  annualPrecipMm: readonly number[];
  elevationM: readonly number[];
  diurnalSummerC: readonly number[];
  resilience0_100: readonly number[];
  growability0_100: readonly number[];
  uniqueness0_100: readonly number[];
  gdd10: readonly number[] | null;
  frostFreeDays: readonly number[] | null;
  /** Bioclimatic-index distributions across the corpus (defined-value subsets). */
  bioclimDeMartonne: readonly number[];
  bioclimConrad: readonly number[];
  bioclimPetMm: readonly number[];
  bioclimSelianinov: readonly number[];
  bioclimUnepAridity: readonly number[];
}

function buildDistributions(): AtlasCorpusDistributions {
  const july = PLACES.map(meanSummerHigh);
  const jan = PLACES.map(meanJanLow);
  const annualPrecipMm = PLACES.map(p => PLACE_ANNUAL_PRECIP[p.id]);
  const elevationM = PLACES.map(p => p.elevationM);
  const diurnalSummerC = PLACES.map(summerDiurnalC);
  const resilience0_100 = PLACES.map(p => p.scores.resilience);
  const growability0_100 = PLACES.map(p => p.scores.growability);
  const uniqueness0_100 = PLACES.map(p => p.scores.microclimateUniqueness);

  const gddRaw = PLACES.map(p => p.climate.gdd10);
  const gdd10 = gddRaw.some(x => x != null) ? sortAsc(gddRaw.filter((x): x is number => x != null)) : null;

  const frostRaw = PLACES.map(p => p.climate.frostFreeDays);
  const frostFreeDays = frostRaw.some(x => x != null) ? sortAsc(frostRaw.filter((x): x is number => x != null)) : null;

  // Bioclimatic-index distributions — only include defined values (some
  // indices are null for documented edges: De Martonne null when MAT ≤ −10,
  // Selianinov null when no month > 10 °C, UNEP null when annual PET = 0).
  const bioDeM: number[] = [];
  const bioCon: number[] = [];
  const bioPet: number[] = [];
  const bioSel: number[] = [];
  const bioUnep: number[] = [];
  for (const p of PLACES) {
    const b = computeBioclim(p);
    if (!b) continue;
    if (b.deMartonne.value !== null) bioDeM.push(b.deMartonne.value);
    if (b.conrad.value !== null) bioCon.push(b.conrad.value);
    // Exclude PET = 0 (frozen-year places): a zero isn't a measurement, it's
    // an absence — including it would inflate the "above this" share that
    // gets displayed alongside "no evaporative demand".
    if (b.thornthwaitePet.value > 0) bioPet.push(b.thornthwaitePet.value);
    if (b.selianinov.value !== null) bioSel.push(b.selianinov.value);
    if (b.unepAridity.value !== null) bioUnep.push(b.unepAridity.value);
  }

  return {
    n: PLACES.length,
    july: Object.freeze(sortAsc(july)),
    jan: Object.freeze(sortAsc(jan)),
    annualPrecipMm: Object.freeze(sortAsc(annualPrecipMm)),
    elevationM: Object.freeze(sortAsc(elevationM)),
    diurnalSummerC: Object.freeze(sortAsc(diurnalSummerC)),
    resilience0_100: Object.freeze(sortAsc(resilience0_100)),
    growability0_100: Object.freeze(sortAsc(growability0_100)),
    uniqueness0_100: Object.freeze(sortAsc(uniqueness0_100)),
    gdd10: gdd10 ? Object.freeze(gdd10) : null,
    frostFreeDays: frostFreeDays ? Object.freeze(frostFreeDays) : null,
    bioclimDeMartonne: Object.freeze(sortAsc(bioDeM)),
    bioclimConrad: Object.freeze(sortAsc(bioCon)),
    bioclimPetMm: Object.freeze(sortAsc(bioPet)),
    bioclimSelianinov: Object.freeze(sortAsc(bioSel)),
    bioclimUnepAridity: Object.freeze(sortAsc(bioUnep)),
  };
}

/** Singleton sorted distributions — do not mutate. */
export const ATLAS_CORPUS: AtlasCorpusDistributions = buildDistributions();

/**
 * Corpus-wide mean of authored monthly humidity (%). Used as a neutral
 * fallback when a single place has no humidity data — better than a hardcoded
 * 65% guess that would bias rankings toward "dry" or "humid". Computed once
 * at module init from the subset of places that have humidity authored;
 * defaults to 60 if none are present (defensive — corpus has tens of authored
 * humidity series).
 */
export const CORPUS_MEAN_HUMIDITY: number = (() => {
  let sum = 0;
  let n = 0;
  for (const p of PLACES) {
    const h = p.climate.humidity;
    if (!h) continue;
    let monthly = 0;
    for (const v of h) monthly += v;
    sum += monthly / 12;
    n += 1;
  }
  return n > 0 ? sum / n : 60;
})();

export interface PlaceCorpusRanks {
  wetterThanAtlasShare: number;
  drierThanAtlasShare: number;
  coolerSummersThanAtlasShare: number;
  milderWintersThanAtlasShare: number;
  higherElevationThanAtlasShare: number;
  largerDiurnalThanAtlasShare: number;
  higherResilienceShare: number;
  higherGrowabilityShare: number;
  higherUniquenessShare: number;
  gddAboveShare: number | null;
  frostAboveShare: number | null;
}

const PLACE_CORPUS_RANK_CACHE = new WeakMap<Place, PlaceCorpusRanks>();
const PLACE_CORPUS_MAP_HINT_CACHE = new WeakMap<Place, string>();
const PLACE_CORPUS_CARD_TEASER_CACHE = new WeakMap<Place, string>();

export function getPlaceCorpusRanks(place: Place): PlaceCorpusRanks {
  const cached = PLACE_CORPUS_RANK_CACHE.get(place);
  if (cached) return cached;

  const c = ATLAS_CORPUS;
  const jh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const pr = PLACE_ANNUAL_PRECIP[place.id] ?? getAnnualPrecipMm(place);
  const el = place.elevationM;
  const di = summerDiurnalC(place);
  const ranks: PlaceCorpusRanks = {
    wetterThanAtlasShare: fracStrictlyLess(pr, c.annualPrecipMm),
    drierThanAtlasShare: fracStrictlyGreater(pr, c.annualPrecipMm),
    coolerSummersThanAtlasShare: fracStrictlyGreater(jh, c.july),
    milderWintersThanAtlasShare: fracStrictlyLess(jl, c.jan),
    higherElevationThanAtlasShare: fracStrictlyLess(el, c.elevationM),
    largerDiurnalThanAtlasShare: fracStrictlyLess(di, c.diurnalSummerC),
    higherResilienceShare: fracStrictlyLess(place.scores.resilience, c.resilience0_100),
    higherGrowabilityShare: fracStrictlyLess(place.scores.growability, c.growability0_100),
    higherUniquenessShare: fracStrictlyLess(place.scores.microclimateUniqueness, c.uniqueness0_100),
    gddAboveShare:
      place.climate.gdd10 != null && c.gdd10
        ? fracStrictlyLess(place.climate.gdd10, c.gdd10)
        : null,
    frostAboveShare:
      place.climate.frostFreeDays != null && c.frostFreeDays
        ? fracStrictlyLess(place.climate.frostFreeDays, c.frostFreeDays)
        : null,
  };
  PLACE_CORPUS_RANK_CACHE.set(place, ranks);
  return ranks;
}

export function getCorpusSynthesisLines(place: Place, displayTemp: TempUnit = "F"): { label: string; value: string }[] {
  const r = getPlaceCorpusRanks(place);
  const c = ATLAS_CORPUS;
  const n = c.n;
  if (n < 2) return [];

  // "Cooler than X" is a strict share; its complement would count the place
  // itself, so Death Valley read "hotter than 100%" of a set it belongs to.
  const rest = (share: number) => Math.max(0, 1 - share - 1 / n);
  const pct99 = (share: number) => pct(Math.min(share, 0.99));
  const out: { label: string; value: string }[] = [
    {
      label: "Wetness vs full atlas (annual mean)",
      value: `Wetter than ${pct99(r.wetterThanAtlasShare)} of places · drier than ${pct99(r.drierThanAtlasShare)} of places (ties possible)`,
    },
    {
      label: "Summer mean high vs full atlas (Jun–Aug blend)",
      value: `Cooler than ${pct99(r.coolerSummersThanAtlasShare)} of places; hotter than ${pct99(rest(r.coolerSummersThanAtlasShare))}`,
    },
    {
      label: "Winter mean low vs full atlas (Dec–Feb blend)",
      value: `Milder than ${pct99(r.milderWintersThanAtlasShare)} of places; colder than ${pct99(rest(r.milderWintersThanAtlasShare))}`,
    },
    {
      label: "Elevation & diurnal (same atlas set)",
      value: `Higher ground than ${pct99(r.higherElevationThanAtlasShare)} · larger summer diurnal than ${pct99(r.largerDiurnalThanAtlasShare)} of places`,
    },
  ];
  if (r.gddAboveShare != null) {
    const gddLabel = displayTemp === "F" ? "Growing-degree signal (GDD, base 50°F)" : "Growing-degree signal (GDD, base 10°C)";
    out.push({
      label: gddLabel,
      value: `More degree-days than ${pct99(r.gddAboveShare)} of places with growing-degree data`,
    });
  }
  return out;
}

export type CorpusPanelRow = { metric: string; you: string; context: string };

export function getCorpusContextPanelRows(
  place: Place,
  fmtT: (c: number) => string,
  fmtE: (m: number) => string,
  fmtP: (mm: number) => string,
  fmtD: (c: number) => string,
  displayTemp: TempUnit = "F",
): CorpusPanelRow[] {
  const r = getPlaceCorpusRanks(place);
  const jh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const pr = PLACE_ANNUAL_PRECIP[place.id];
  const di = summerDiurnalC(place);
  const rows: CorpusPanelRow[] = [
    { metric: "Mean Jun–Aug high (normal)", you: fmtT(jh), context: `Cooler summers than ${pct(r.coolerSummersThanAtlasShare)} of atlas places` },
    { metric: "Mean winter low (Dec–Feb)", you: fmtT(jl), context: `Milder mid-winter than ${pct(r.milderWintersThanAtlasShare)} of atlas places` },
    { metric: "Annual precip (atlas field)", you: fmtP(pr), context: `Wetter than ${pct(r.wetterThanAtlasShare)} of atlas places` },
    { metric: "Site elevation", you: fmtE(place.elevationM), context: `Higher than ${pct(r.higherElevationThanAtlasShare)} of places` },
    { metric: "High-season diurnal (July proxy)", you: fmtD(di), context: `Larger swing than ${pct(r.largerDiurnalThanAtlasShare)} of places` },
    { metric: "Resilience / grow / uniqueness (scores)", you: `${place.scores.resilience} / ${place.scores.growability} / ${place.scores.microclimateUniqueness}`,
      context: `Resilience above ${pct(r.higherResilienceShare)} · grow above ${pct(r.higherGrowabilityShare)} · uniqueness above ${pct(r.higherUniquenessShare)} of places`,
    },
  ];
  if (place.climate.frostFreeDays != null) {
    rows.push({
      metric: "Frost-free days (est.)",
      you: `${place.climate.frostFreeDays} d`,
      context: r.frostAboveShare != null
        ? `Longer season than ${pct(r.frostAboveShare)} of places with data`
        : "Compare within places that report frost-free days",
    });
  }
  if (place.climate.gdd10 != null) {
    const gddMetric = displayTemp === "F" ? "GDD (base 50°F) (est.)" : "GDD (base 10°C) (est.)";
    rows.push({
      metric: gddMetric,
      you: Math.round(gddForUnit(place.climate.gdd10, displayTemp)).toLocaleString("en-US"),
      context: r.gddAboveShare != null
        ? `More heat units than ${pct(r.gddAboveShare)} of places with growing-degree data`
        : "Among places with growing-degree data",
    });
  }
  return rows;
}

// ----- Bioclimatic-index ranks ------------------------------------------

export interface PlaceBioclimRanks {
  /** Share of corpus places with a *smaller* De Martonne value than this place
   *  (i.e. this place is wetter-per-degree than that share of places). */
  deMartonneAboveShare: number | null;
  /** Share with a smaller Conrad index (this place is more continental). */
  conradAboveShare: number;
  /** Share with smaller Thornthwaite PET (this place's water demand is higher).
   *  Null when this place's PET = 0 (every month below freezing — comparing
   *  "no demand" against the corpus distribution would be misleading). */
  thornthwaitePetAboveShare: number | null;
  /** Share with smaller Selianinov HTC (this place's growing season is wetter). */
  selianinovAboveShare: number | null;
  /** Share with smaller UNEP aridity (this place is more humid). */
  unepAridityAboveShare: number | null;
}

export interface BioclimCardSignal {
  /** Short, card-safe label for chip surfaces. */
  label: string;
  /** Tooltip with the underlying computed values. */
  title: string;
  /** Existing chip tone key. */
  tone: "glacier" | "sage" | "ochre" | "ember" | "ice" | "aurora";
}

const PLACE_BIOCLIM_CARD_SIGNAL_CACHE = new WeakMap<Place, BioclimCardSignal | null>();

const PLACE_BIOCLIM_RANK_CACHE = new WeakMap<Place, PlaceBioclimRanks>();

export function getPlaceBioclimRanks(place: Place): PlaceBioclimRanks {
  const cached = PLACE_BIOCLIM_RANK_CACHE.get(place);
  if (cached) return cached;
  const c = ATLAS_CORPUS;
  const b = computeBioclim(place);
  const ranks: PlaceBioclimRanks = b
    ? {
      deMartonneAboveShare: b.deMartonne.value !== null
        ? fracStrictlyLess(b.deMartonne.value, c.bioclimDeMartonne)
        : null,
      conradAboveShare: fracStrictlyLess(b.conrad.value!, c.bioclimConrad),
      thornthwaitePetAboveShare: b.thornthwaitePet.value > 0
        ? fracStrictlyLess(b.thornthwaitePet.value, c.bioclimPetMm)
        : null,
      selianinovAboveShare: b.selianinov.value !== null
        ? fracStrictlyLess(b.selianinov.value, c.bioclimSelianinov)
        : null,
      unepAridityAboveShare: b.unepAridity.value !== null
        ? fracStrictlyLess(b.unepAridity.value, c.bioclimUnepAridity)
        : null,
    }
    : {
      deMartonneAboveShare: null,
      conradAboveShare: 0,
      thornthwaitePetAboveShare: null,
      selianinovAboveShare: null,
      unepAridityAboveShare: null,
    };
  PLACE_BIOCLIM_RANK_CACHE.set(place, ranks);
  return ranks;
}

function bioclimTone(cls: string | null, conrad: number): BioclimCardSignal["tone"] {
  if (!cls) return conrad >= 50 ? "aurora" : "ice";
  if (cls === "hyperarid" || cls === "arid") return "ember";
  if (cls === "semi-arid" || cls === "mediterranean") return "ochre";
  if (cls === "sub-humid" || cls === "humid") return "sage";
  return "glacier";
}

/** Short bioclimatic signature for dense card surfaces. */
export function getBioclimCardSignal(place: Place): BioclimCardSignal | null {
  if (PLACE_BIOCLIM_CARD_SIGNAL_CACHE.has(place)) return PLACE_BIOCLIM_CARD_SIGNAL_CACHE.get(place)!;
  const b = computeBioclim(place);
  if (!b || b.conrad.value === null) {
    PLACE_BIOCLIM_CARD_SIGNAL_CACHE.set(place, null);
    return null;
  }

  // Plain words on the card ("Moist · small seasonal swing"): the first half
  // is how wet the climate is, the second how far temperature swings through
  // the year. The published index names and values stay in the hover title.
  const swingLabel = b.conrad.classLabel.toLowerCase().replace(/ swing$/, " seasonal swing");
  const waterLabel = b.deMartonne.value !== null ? b.deMartonne.classLabel : "Frozen year";
  const titleParts = [
    b.deMartonne.value !== null
      ? `Moisture: ${b.deMartonne.classLabel.toLowerCase()} (De Martonne aridity index ${b.deMartonne.value.toFixed(1)}). ${DE_MARTONNE_GLOSS}`
      : "Moisture: not defined (De Martonne aridity index needs a mean annual temperature above −10°C).",
    `Seasonal temperature swing: ${b.conrad.classLabel.toLowerCase().replace(/ swing$/, "")} (Conrad continentality index ${b.conrad.value.toFixed(1)}). ${CONRAD_GLOSS}`,
    "This describes rain and temperature, not how humid the air feels.",
  ];

  const signal: BioclimCardSignal = {
    label: `${waterLabel} · ${swingLabel}`,
    title: titleParts.join(" "),
    tone: bioclimTone(b.deMartonne.value !== null ? b.deMartonne.class : null, b.conrad.value),
  };
  PLACE_BIOCLIM_CARD_SIGNAL_CACHE.set(place, signal);
  return signal;
}

/** One-line for map/cards — no HTML */
export function getCorpusMapHint(place: Place): string {
  const cached = PLACE_CORPUS_MAP_HINT_CACHE.get(place);
  if (cached) return cached;
  const r = getPlaceCorpusRanks(place);
  const hint = `Water year wetter than ${pct(r.wetterThanAtlasShare)} of atlas places; Jun-Aug mean high cooler than ${pct(r.coolerSummersThanAtlasShare)} of places.`;
  PLACE_CORPUS_MAP_HINT_CACHE.set(place, hint);
  return hint;
}

/** Short line for list cards (no newlines) */
export function getCorpusCardTeaser(place: Place): string {
  const cached = PLACE_CORPUS_CARD_TEASER_CACHE.get(place);
  if (cached) return cached;
  const r = getPlaceCorpusRanks(place);
  // The bioclim chip sits directly above this line on the card, so it is not repeated here.
  const teaser = `Against the full atlas: ${rankPhrase(r.wetterThanAtlasShare, "wetter", "drier")} of places · ${rankPhrase(r.coolerSummersThanAtlasShare, "cooler summers", "hotter summers")} · ${rankPhrase(r.higherElevationThanAtlasShare, "higher ground", "lower ground")}.`;
  PLACE_CORPUS_CARD_TEASER_CACHE.set(place, teaser);
  return teaser;
}

/**
 * Invariants: sorted lengths, n matches PLACES, numeric sanity.
 * @throws on failure (used from CI script)
 */
export function assertAtlasCorpusHealthy(): void {
  const c = ATLAS_CORPUS;
  const n = c.n;
  if (n !== PLACES.length) throw new Error(`corpus n ${n} !== PLACES ${PLACES.length}`);
  const L = (name: string, a: readonly number[] | null) => {
    if (a == null) return;
    if (a.length < 1) return;
    if (a.length !== n) {
      if (name === "gdd10" || name === "frostFreeDays") return;
      throw new Error(`corpus ${name} len ${a.length} !== n ${n}`);
    }
  };
  L("july", c.july);
  L("jan", c.jan);
  L("precip", c.annualPrecipMm);
  L("elev", c.elevationM);
  L("diurnal", c.diurnalSummerC);
  L("res", c.resilience0_100);
  for (let i = 1; i < c.july.length; i++) {
    if (c.july[i]! < c.july[i - 1]!) throw new Error("july not sorted");
  }
  // Bioclimatic-index distributions — these are subsets (some nullable), so
  // their length may be < n. Validate that they are sorted and finite.
  const bioBands: Array<[string, readonly number[]]> = [
    ["bioclimDeMartonne", c.bioclimDeMartonne],
    ["bioclimConrad", c.bioclimConrad],
    ["bioclimPetMm", c.bioclimPetMm],
    ["bioclimSelianinov", c.bioclimSelianinov],
    ["bioclimUnepAridity", c.bioclimUnepAridity],
  ];
  for (const [name, arr] of bioBands) {
    if (arr.length > n) throw new Error(`corpus ${name} len ${arr.length} > n ${n}`);
    for (let i = 1; i < arr.length; i++) {
      if (arr[i]! < arr[i - 1]!) throw new Error(`corpus ${name} not sorted`);
      if (!Number.isFinite(arr[i]!)) throw new Error(`corpus ${name} non-finite at index ${i}`);
    }
  }
  const testPlace = PLACES[0]!;
  const r = getPlaceCorpusRanks(testPlace);
  for (const k of Object.keys(r) as (keyof PlaceCorpusRanks)[]) {
    const v = r[k];
    if (v == null) continue;
    if (v < 0 || v > 1 || Number.isNaN(v)) throw new Error(`bad rank ${k} ${v}`);
  }
}
