// ============================================================
// Terraclima — Bioclimatic indices
// ============================================================
// Five standard, deterministic, citable climate-science indices computed
// PURELY from the authored monthly temperature + precipitation normals and
// the place's latitude. Each index is a function of typed corpus fields —
// nothing is invented. Surfaces alongside Köppen (`src/lib/koppen.ts`) so
// the qualitative climate class is paired with quantitative measures of
// aridity, continentality, water demand, growing-season moisture, and the
// UNEP aridity ratio.
//
// References:
//   De Martonne, E. (1926). "Aréisme et indice d'aridité." Comptes rendus
//     de l'Académie des Sciences (Paris) 182, 1395–1398.
//   Conrad, V. (1946). "Usual formulas of continentality and their limits
//     of validity." Eos, Transactions American Geophysical Union 27, 663–664.
//   Thornthwaite, C. W. (1948). "An approach toward a rational classification
//     of climate." Geographical Review 38, 55–94.
//   Selianinov, G. T. (1928). "On agricultural climate evaluation."
//   UNEP (1992). "World Atlas of Desertification."
//
// All North-American corpus latitudes are positive (Northern Hemisphere), but
// the daylength + Conrad math is kept hemisphere-agnostic — costs nothing,
// future-proofs.
// ============================================================

import type { Monthly12, Place } from "../types";
import { computeKoppen, type KoppenResult } from "./koppen";

const DAYS_IN_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Month-midpoint day-of-year (non-leap convention; locked from Plan-agent
// hand-traces against Sequim/Phoenix/Singapore — see bioclim.test.ts).
const J_MID: readonly number[] = [15, 45, 74, 105, 135, 162, 198, 228, 259, 289, 320, 350];

const DEG_TO_RAD = Math.PI / 180;

function round9(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

function isFiniteMonthly(a: readonly number[] | undefined): a is Monthly12 {
  return !!a && a.length === 12 && a.every(v => typeof v === "number" && Number.isFinite(v));
}

export type BioclimNullReason = "mat_below_neg10" | "no_growing_season" | "no_pet";

export interface BioclimValue {
  /** Numeric index value (units vary per index — documented per-field). */
  value: number;
  /** Machine-readable band, e.g. "semi-arid", "oceanic", "humid". */
  class: string;
  /** Human-readable band label, e.g. "Semi-arid". */
  classLabel: string;
}

export interface BioclimNull {
  value: null;
  reason: BioclimNullReason;
}

export type BioclimIndex = BioclimValue | BioclimNull;

export interface BioclimBreakdown {
  /** Mean annual temperature (°C), from monthly means. */
  matC: number;
  /** Mean annual precipitation (mm), summed from monthlies. */
  mapMm: number;
  /** Warmest monthly mean (°C). */
  thotC: number;
  /** Coldest monthly mean (°C). */
  tcoldC: number;
  /** Annual temperature amplitude (°C) = thot − tcold. */
  amplitudeC: number;
  /** Thornthwaite heat index `I = Σ (T/5)^1.514` over months with T ≥ 0. */
  annualHeatIndex: number;
  /** Thornthwaite exponent `a` (polynomial in I). */
  thornthwaiteExponentA: number;
  /** Daylength `N_i` per month in hours (computed from latitude + day-of-year). */
  daylengthByMonth: readonly number[];
  /** Count of months with mean T > 10 °C (active growing season; Selianinov). */
  growingSeasonMonths: number;
  /** Total precipitation in the growing-season months (mm). */
  growingSeasonPrecipMm: number;
  /** Sum of `T_mean_i · days_in_month_i` over growing-season months
   *  (°C·days; the canonical Selianinov denominator). */
  growingSeasonTempDegDays: number;
}

export interface BioclimResult {
  /** De Martonne aridity index (1926). */
  deMartonne: BioclimIndex;
  /** Conrad continentality index (1946). */
  conrad: BioclimIndex;
  /** Selianinov hydrothermal coefficient over the active growing season. */
  selianinov: BioclimIndex;
  /** UNEP aridity index (MAP / PET). */
  unepAridity: BioclimIndex;
  /** Thornthwaite annual potential evapotranspiration (mm/yr). Always defined
   *  (zero when no month is above freezing). */
  thornthwaitePet: { value: number };
  breakdown: BioclimBreakdown;
}

// ----- band classifiers --------------------------------------------------

function classifyDeMartonne(value: number): { class: string; classLabel: string } {
  // Le Houérou's refinement of De Martonne (1926). Half-open `[lo, hi)`.
  if (value < 5) return { class: "hyperarid", classLabel: "Hyperarid" };
  if (value < 10) return { class: "arid", classLabel: "Arid" };
  if (value < 20) return { class: "semi-arid", classLabel: "Semi-arid" };
  if (value < 24) return { class: "mediterranean", classLabel: "Mediterranean" };
  if (value < 28) return { class: "sub-humid", classLabel: "Sub-humid" };
  if (value < 35) return { class: "humid", classLabel: "Humid" };
  if (value < 55) return { class: "very-humid", classLabel: "Very humid" };
  return { class: "extremely-humid", classLabel: "Extremely humid" };
}

function classifyConrad(value: number): { class: string; classLabel: string } {
  // Conrad's K runs from ~0 (pure oceanic) to ~100 (Verkhoyansk-grade extreme
  // continental). The bands below are anchored so that the canonical exemplars
  // land where the literature places them (Verkhoyansk ≈ 100 = extreme
  // continental; Moscow ≈ 55 = continental; Reykjavík ≈ 8 = oceanic; tropical
  // maritime ≈ 0–5 = extreme oceanic). Negative K is legitimate for
  // ultra-low-amplitude tropical maritime climates.
  if (value < 5) return { class: "extreme-oceanic", classLabel: "Extreme oceanic" };
  if (value < 25) return { class: "oceanic", classLabel: "Oceanic" };
  if (value < 50) return { class: "sub-continental", classLabel: "Sub-continental" };
  if (value < 75) return { class: "continental", classLabel: "Continental" };
  return { class: "extreme-continental", classLabel: "Extreme continental" };
}

function classifySelianinov(value: number): { class: string; classLabel: string } {
  if (value < 0.4) return { class: "dry", classLabel: "Dry" };
  if (value < 0.7) return { class: "arid", classLabel: "Arid" };
  if (value < 1.0) return { class: "semi-arid", classLabel: "Semi-arid" };
  if (value < 1.3) return { class: "sufficient", classLabel: "Sufficient moisture" };
  if (value < 1.6) return { class: "humid", classLabel: "Humid" };
  return { class: "wet", classLabel: "Wet" };
}

function classifyUnep(value: number): { class: string; classLabel: string } {
  if (value < 0.05) return { class: "hyperarid", classLabel: "Hyperarid" };
  if (value < 0.20) return { class: "arid", classLabel: "Arid" };
  if (value < 0.50) return { class: "semi-arid", classLabel: "Semi-arid" };
  if (value < 0.65) return { class: "dry-sub-humid", classLabel: "Dry sub-humid" };
  return { class: "humid", classLabel: "Humid" };
}

// ----- daylength (the trap) ----------------------------------------------

/**
 * Daylength (hours of sunlight) at latitude `latDeg`, on month `monthIndex`
 * (0=Jan..11=Dec), using the standard astronomical formula:
 *   δ  = 23.45° · sin(2π · (284 + J) / 365)       — solar declination
 *   cos(H₀) = −tan(φ) · tan(δ)                    — hour angle of sunset
 *   N  = (2 / 15) · H₀(°)                         — hours of daylight
 *
 * Polar branches: |cos H₀| ≥ 1 → return 24 (midnight sun) or 0 (polar night).
 *
 * Exported for unit tests; the rest of the bioclim math uses it internally.
 */
export function daylengthHours(latDeg: number, monthIndex: number): number {
  if (monthIndex < 0 || monthIndex > 11) return Number.NaN;
  const J = J_MID[monthIndex]!;
  const deltaDeg = 23.45 * Math.sin(2 * Math.PI * (284 + J) / 365);
  const phiRad = latDeg * DEG_TO_RAD;
  const deltaRad = deltaDeg * DEG_TO_RAD;
  const cosH0 = -Math.tan(phiRad) * Math.tan(deltaRad);
  if (cosH0 <= -1) return 24; // sun never sets
  if (cosH0 >= 1) return 0; // sun never rises
  const H0Rad = Math.acos(cosH0);
  const H0Deg = H0Rad / DEG_TO_RAD;
  return (2 / 15) * H0Deg;
}

// ----- the classifier ----------------------------------------------------

/**
 * Compute the bioclimatic-index suite from monthly arrays + latitude.
 * Pure / deterministic / no allocations beyond the returned object.
 * Returns `null` for degenerate input (missing or wrong-length arrays, NaN).
 */
export function classifyBioclim(
  highC: readonly number[],
  lowC: readonly number[],
  precipMm: readonly number[],
  latDeg: number,
): BioclimResult | null {
  if (!isFiniteMonthly(highC) || !isFiniteMonthly(lowC) || !isFiniteMonthly(precipMm)) return null;
  if (!Number.isFinite(latDeg)) return null;

  const meanC = highC.map((h, i) => round9((h + lowC[i]!) / 2));
  const matC = round9(meanC.reduce((s, v) => s + v, 0) / 12);
  const mapMm = round9(precipMm.reduce((s, v) => s + v, 0));
  const thotC = round9(Math.max(...meanC));
  const tcoldC = round9(Math.min(...meanC));
  const amplitudeC = round9(thotC - tcoldC);

  // Thornthwaite annual heat index I — months with mean T < 0 contribute 0.
  let I = 0;
  for (const T of meanC) {
    if (T > 0) I += Math.pow(T / 5, 1.514);
  }
  I = round9(I);

  // Exponent a (polynomial in I); when I = 0, a is the constant 0.49239 but
  // the unadjusted PET formula returns 0 for every month (T clamped to 0), so
  // annualPET = 0 regardless. Compute a defensively for completeness.
  const a = round9(
    6.75e-7 * I * I * I -
    7.71e-5 * I * I +
    1.792e-2 * I +
    0.49239,
  );

  // Per-month daylength + Thornthwaite PET.
  const daylengthByMonth: number[] = [];
  let annualPet = 0;
  for (let i = 0; i < 12; i += 1) {
    const N = daylengthHours(latDeg, i);
    daylengthByMonth.push(N);
    const T = Math.max(0, meanC[i]!);
    let petUnadj = 0;
    if (I > 0 && T > 0) {
      petUnadj = 16 * Math.pow(10 * T / I, a);
    }
    const petAdj = petUnadj * (N / 12) * (DAYS_IN_MONTH[i]! / 30);
    annualPet += petAdj;
  }
  annualPet = round9(annualPet);

  // Selianinov: months with mean T strictly > 10 °C. Selianinov's original
  // 1928 formulation used daily-mean temperature SUMS over the active growing
  // season. With monthly data the canonical substitution is
  //   ΣT_active ≈ Σ (T_mean_i · days_in_month_i)
  // so that HTC values align with published bands (<0.4 dry … ≥1.6 wet).
  // Omitting the days-in-month weighting makes the denominator ~30× smaller
  // and pushes every place into a spuriously "wet" band.
  let growingSeasonMonths = 0;
  let growingSeasonPrecipMm = 0;
  let growingSeasonTempDegDays = 0;
  for (let i = 0; i < 12; i += 1) {
    if (meanC[i]! > 10) {
      growingSeasonMonths += 1;
      growingSeasonPrecipMm += precipMm[i]!;
      growingSeasonTempDegDays += meanC[i]! * DAYS_IN_MONTH[i]!;
    }
  }
  growingSeasonPrecipMm = round9(growingSeasonPrecipMm);
  growingSeasonTempDegDays = round9(growingSeasonTempDegDays);

  const breakdown: BioclimBreakdown = {
    matC,
    mapMm,
    thotC,
    tcoldC,
    amplitudeC,
    annualHeatIndex: I,
    thornthwaiteExponentA: a,
    daylengthByMonth: Object.freeze(daylengthByMonth.map(round9)),
    growingSeasonMonths,
    growingSeasonPrecipMm,
    growingSeasonTempDegDays,
  };

  // De Martonne — null when MAT ≤ −10 (the denominator collapses or flips
  // sign; clamping would fabricate a value that compares apparently-validly
  // against other places).
  let deMartonne: BioclimIndex;
  if (matC <= -10) {
    deMartonne = { value: null, reason: "mat_below_neg10" };
  } else {
    const value = round9(mapMm / (matC + 10));
    deMartonne = { value, ...classifyDeMartonne(value) };
  }

  // Conrad continentality. φ + 10 in degrees → radians inside sin.
  const conradValue = round9(
    1.7 * amplitudeC / Math.sin((latDeg + 10) * DEG_TO_RAD) - 14,
  );
  const conrad: BioclimIndex = { value: conradValue, ...classifyConrad(conradValue) };

  // Selianinov — null when no growing-season month exists (Arctic).
  let selianinov: BioclimIndex;
  if (growingSeasonMonths === 0) {
    selianinov = { value: null, reason: "no_growing_season" };
  } else {
    const value = round9(10 * growingSeasonPrecipMm / growingSeasonTempDegDays);
    selianinov = { value, ...classifySelianinov(value) };
  }

  // UNEP aridity — null when PET = 0 (all months frozen).
  let unepAridity: BioclimIndex;
  if (annualPet <= 0) {
    unepAridity = { value: null, reason: "no_pet" };
  } else {
    const value = round9(mapMm / annualPet);
    unepAridity = { value, ...classifyUnep(value) };
  }

  return {
    deMartonne,
    conrad,
    selianinov,
    unepAridity,
    thornthwaitePet: { value: annualPet },
    breakdown,
  };
}

// ----- place-level wrapper + caching ------------------------------------

const bioclimCache = new WeakMap<Place, BioclimResult | null>();

/** Cached per-place bioclimatic suite. Reuses `computeKoppen` purely to lean
 *  on its degenerate-input guard; numeric work is fresh per place. */
export function computeBioclim(place: Place): BioclimResult | null {
  if (bioclimCache.has(place)) return bioclimCache.get(place)!;
  const result = computeKoppen(place) == null
    ? null // climate arrays are degenerate; Köppen agrees
    : classifyBioclim(place.climate.tempHighC, place.climate.tempLowC, place.climate.precipMm, place.lat);
  bioclimCache.set(place, result);
  return result;
}

/** Convenience accessor that also surfaces the place's Köppen result if a
 *  caller wants both classifiers in one go (e.g. UI panels). */
export function computeBioclimWithKoppen(place: Place): { bio: BioclimResult | null; kop: KoppenResult | null } {
  return { bio: computeBioclim(place), kop: computeKoppen(place) };
}
