// ============================================================
// Atlas-wide distributions — percentiles & ranks for 200+ stops
// One-time O(n) sort at module init; per-place calls are O(n) scans
// (n≈210 — cheap on every open / hover / card paint).
// ============================================================

import type { Place } from "../types";
import { PLACES, PLACE_ANNUAL_PRECIP } from "../data/places";
import { meanJanLow, meanSummerHigh } from "./scoring";
import type { TempUnit } from "./units";

function sortAsc(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

function fracStrictlyLess(value: number, sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0.5;
  let c = 0;
  for (const x of sortedAsc) {
    if (x < value) c++;
  }
  return c / sortedAsc.length;
}

function fracStrictlyGreater(value: number, sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0.5;
  let c = 0;
  for (const x of sortedAsc) {
    if (x > value) c++;
  }
  return c / sortedAsc.length;
}

function pct(share: number): string {
  return `${Math.max(0, Math.min(100, Math.round(share * 100)))}%`;
}

function summerDiurnalC(p: Place): number {
  if (p.climate.diurnalSummerC != null) return p.climate.diurnalSummerC;
  return p.climate.tempHighC[6] - p.climate.tempLowC[6];
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
  };
}

/** Singleton sorted distributions — do not mutate. */
export const ATLAS_CORPUS: AtlasCorpusDistributions = buildDistributions();

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

export function getPlaceCorpusRanks(place: Place): PlaceCorpusRanks {
  const c = ATLAS_CORPUS;
  const jh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const pr = PLACE_ANNUAL_PRECIP[place.id];
  const el = place.elevationM;
  const di = summerDiurnalC(place);
  return {
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
}

export function getCorpusSynthesisLines(place: Place, displayTemp: TempUnit = "F"): { label: string; value: string }[] {
  const r = getPlaceCorpusRanks(place);
  const c = ATLAS_CORPUS;
  const n = c.n;
  if (n < 2) return [];

  const out: { label: string; value: string }[] = [
    {
      label: "Wetness vs full atlas (annual mean)",
      value: `Wetter than ${pct(r.wetterThanAtlasShare)} of stops · drier than ${pct(r.drierThanAtlasShare)} of stops (ties possible)`,
    },
    {
      label: "Summer mean high vs full atlas (Jun–Aug blend)",
      value: `Cooler than ${pct(r.coolerSummersThanAtlasShare)} of stops; hotter than ${pct(1 - r.coolerSummersThanAtlasShare)}`,
    },
    {
      label: "Winter mean low vs full atlas (Dec–Feb blend)",
      value: `Milder than ${pct(r.milderWintersThanAtlasShare)} of stops; colder than ${pct(1 - r.milderWintersThanAtlasShare)}`,
    },
    {
      label: "Elevation & diurnal (same atlas set)",
      value: `Higher ground than ${pct(r.higherElevationThanAtlasShare)} · larger summer diurnal than ${pct(r.largerDiurnalThanAtlasShare)} of stops`,
    },
  ];
  if (r.gddAboveShare != null) {
    const gddLabel = displayTemp === "F" ? "Growing-degree signal (GDD, base 50°F)" : "Growing-degree signal (GDD, base 10°C)";
    out.push({
      label: gddLabel,
      value: `More degree-days than ${pct(r.gddAboveShare)} of stops with GDD filled`,
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
    { metric: "Mean Jun–Aug high (normal)", you: fmtT(jh), context: `Cooler summers than ${pct(r.coolerSummersThanAtlasShare)} of atlas stops` },
    { metric: "Mean Jan low (normal)", you: fmtT(jl), context: `Milder mid-winter than ${pct(r.milderWintersThanAtlasShare)} of atlas stops` },
    { metric: "Annual precip (atlas field)", you: fmtP(pr), context: `Wetter than ${pct(r.wetterThanAtlasShare)} of atlas stops` },
    { metric: "Site elevation", you: fmtE(place.elevationM), context: `Higher than ${pct(r.higherElevationThanAtlasShare)} of stops` },
    { metric: "High-season diurnal (July proxy)", you: fmtD(di), context: `Larger swing than ${pct(r.largerDiurnalThanAtlasShare)} of stops` },
    { metric: "Resilience / grow / uniqueness (scores)", you: `${place.scores.resilience} / ${place.scores.growability} / ${place.scores.microclimateUniqueness}`,
      context: `Resilience above ${pct(r.higherResilienceShare)} · grow above ${pct(r.higherGrowabilityShare)} · uniqueness above ${pct(r.higherUniquenessShare)} of stops`,
    },
  ];
  if (place.climate.frostFreeDays != null) {
    rows.push({
      metric: "Frost-free days (est.)",
      you: `${place.climate.frostFreeDays} d`,
      context: r.frostAboveShare != null
        ? `Longer season than ${pct(r.frostAboveShare)} of stops with data`
        : "Compare within stops that report frost-free days",
    });
  }
  if (place.climate.gdd10 != null) {
    const gddMetric = displayTemp === "F" ? "GDD (base 50°F) (est.)" : "GDD (base 10°C) (est.)";
    rows.push({
      metric: gddMetric,
      you: `${Math.round(place.climate.gdd10)}`,
      context: r.gddAboveShare != null
        ? `More heat units than ${pct(r.gddAboveShare)} of stops with GDD`
        : "Among stops with GDD filled",
    });
  }
  return rows;
}

/** One-line for map/cards — no HTML */
export function getCorpusMapHint(place: Place): string {
  const r = getPlaceCorpusRanks(place);
  return `Water year wetter than ${pct(r.wetterThanAtlasShare)} of atlas stops; Jun-Aug mean high cooler than ${pct(r.coolerSummersThanAtlasShare)} of stops.`;
}

/** Short line for list cards (no newlines) */
export function getCorpusCardTeaser(place: Place): string {
  const r = getPlaceCorpusRanks(place);
  return `Vs full atlas: wetter than ${pct(r.wetterThanAtlasShare)} of stops · cooler JJA than ${pct(r.coolerSummersThanAtlasShare)} · higher ground than ${pct(r.higherElevationThanAtlasShare)}.`;
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
  const testPlace = PLACES[0]!;
  const r = getPlaceCorpusRanks(testPlace);
  for (const k of Object.keys(r) as (keyof PlaceCorpusRanks)[]) {
    const v = r[k];
    if (v == null) continue;
    if (v < 0 || v > 1 || Number.isNaN(v)) throw new Error(`bad rank ${k} ${v}`);
  }
}
