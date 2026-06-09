// ============================================================
// Terraclima — Home-base climate anchor
// ============================================================
//
// Relocation questions are relative: "will summers actually be
// cooler than MINE? how much grayer is winter? how much more snow
// am I signing up for?" This module lets the reader pin one corpus
// place as their home base — their current climate, or its nearest
// atlas analog — and reads any other place as a set of deltas
// against it.
//
// Everything here is a pure, deterministic function of the authored
// monthly normals already in the corpus. No facts are invented: a
// signal that needs an optional field (humidity, sunshine, snow)
// simply does not render unless BOTH places author that field.
//
// Prose contract: `phrase` strings are written in metric units with
// clause-local delta cue words ("cooler", "hotter", "warmer",
// "colder") so `localizeProse()` converts temperature deltas with
// the 9/5 ratio instead of the absolute °C→°F formula. Length units
// (cm) convert linearly, so they need no special wording.

import type { Place } from "../types";
import {
  annualComfortMonthCount,
  avgRisk,
  getAnnualPrecipMm,
  meanJanLow,
  meanSummerHigh,
  meanSummerHumidityPct,
} from "./climate-metrics";
import { fmtDelta, fmtSnow, type DistUnit, type TempUnit } from "./units";

// ---------- Persistence ----------

const STORAGE_KEY = "terraclima.home-base.v1";
export const HOME_BASE_STORAGE_KEY = STORAGE_KEY;

type Storage = Pick<typeof window.localStorage, "getItem" | "setItem" | "removeItem"> | null;

function safeStorage(): Storage {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Snapshot read of the persisted home-base place id. Null on SSR, quota errors, or garbage. */
export function loadHomeBaseId(): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "string" && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist (or clear, with null) the home-base place id. Silently no-ops when storage is denied. */
export function persistHomeBaseId(id: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (id) storage.setItem(STORAGE_KEY, JSON.stringify(id));
    else storage.removeItem(STORAGE_KEY);
  } catch {
    /* quota exceeded or storage denied — runtime state still works */
  }
}

// ---------- Delta model ----------

export type HomeDeltaSignalId =
  | "summer-days"
  | "winter-nights"
  | "annual-precip"
  | "summer-humidity"
  | "winter-sun"
  | "annual-snow"
  | "comfy-months"
  | "hazard-load";

export type HomeDeltaDirection = "higher" | "lower" | "similar";
export type HomeDeltaMagnitude = "slight" | "clear" | "major";

/** Tones reuse the existing `.chip[data-tone]` palette so no new CSS colour system is needed. */
export type HomeDeltaTone = "glacier" | "ember" | "sage" | "ochre" | "ice";

export interface HomeDeltaSignal {
  id: HomeDeltaSignalId;
  /** Tile label, e.g. "Summer days". */
  label: string;
  /** Compact chip label, e.g. "Summer". */
  shortLabel: string;
  /**
   * Signed delta, place minus home, in the signal's native unit:
   * °C for temps, ratio (place/home) for precip, percentage points
   * for humidity/sunshine, cm for snow, months, or 0–5 risk steps.
   */
  delta: number;
  unit: "C" | "ratio" | "points" | "months" | "cm" | "risk";
  direction: HomeDeltaDirection;
  magnitude: HomeDeltaMagnitude;
  /** Unitless ordering weight — larger means more decision-relevant. */
  salience: number;
  tone: HomeDeltaTone;
  /** Metric prose clause for the headline ("summer days 6.8°C cooler"). */
  phrase: string;
  /** Plain-language tile descriptor ("clearly cooler", "about the same"). */
  descriptor: string;
  /** What the number is, for tooltips ("Mean June–August daily high, this place minus home."). */
  basis: string;
}

export interface HomeBaseComparison {
  home: Place;
  place: Place;
  /** True when home and place are the same corpus entry. */
  isSame: boolean;
  /** All computable signals, ordered most-salient first (stable on ties). */
  signals: HomeDeltaSignal[];
  /** One metric-prose sentence summarising the strongest deltas. */
  headline: string;
}

const SIMILAR = "similar" as const;

interface SignalSpec {
  id: HomeDeltaSignalId;
  label: string;
  shortLabel: string;
  unit: HomeDeltaSignal["unit"];
  basis: string;
  /** [similar, clear] magnitude cut points on |delta| (above "clear" is "major"). */
  cuts: readonly [number, number];
  saliencePerUnit: number;
  /** Tone when the place reads higher / lower than home. */
  toneHigher: HomeDeltaTone;
  toneLower: HomeDeltaTone;
  /** Direction adjectives, e.g. ["hotter", "cooler"]. */
  adjHigher: string;
  adjLower: string;
}

const MAGNITUDE_WORD: Record<HomeDeltaMagnitude, string> = {
  slight: "slightly",
  clear: "clearly",
  major: "much",
};

function classify(
  spec: SignalSpec,
  delta: number,
  phraseFor: (direction: HomeDeltaDirection, magnitude: HomeDeltaMagnitude) => string,
  salienceOverride?: number,
): HomeDeltaSignal {
  const abs = Math.abs(delta);
  const direction: HomeDeltaDirection = abs <= spec.cuts[0] ? SIMILAR : delta > 0 ? "higher" : "lower";
  const magnitude: HomeDeltaMagnitude = abs <= spec.cuts[0] ? "slight" : abs <= spec.cuts[1] ? "clear" : "major";
  const tone: HomeDeltaTone = direction === SIMILAR ? "ice" : direction === "higher" ? spec.toneHigher : spec.toneLower;
  const descriptor =
    direction === SIMILAR
      ? "about the same"
      : `${MAGNITUDE_WORD[magnitude]} ${direction === "higher" ? spec.adjHigher : spec.adjLower}`;
  return {
    id: spec.id,
    label: spec.label,
    shortLabel: spec.shortLabel,
    delta,
    unit: spec.unit,
    direction,
    magnitude,
    salience: salienceOverride ?? abs * spec.saliencePerUnit,
    tone,
    phrase: phraseFor(direction, magnitude),
    descriptor,
    basis: spec.basis,
  };
}

const SUMMER_SPEC: SignalSpec = {
  id: "summer-days",
  label: "Summer days",
  shortLabel: "Summer",
  unit: "C",
  basis: "Mean June–August daily high, this place minus home.",
  cuts: [1, 4],
  saliencePerUnit: 1 / 1.5,
  toneHigher: "ember",
  toneLower: "glacier",
  adjHigher: "hotter",
  adjLower: "cooler",
};

const WINTER_SPEC: SignalSpec = {
  id: "winter-nights",
  label: "Winter nights",
  shortLabel: "Winter",
  unit: "C",
  basis: "Mean December–February daily low, this place minus home.",
  cuts: [1, 4],
  saliencePerUnit: 1 / 1.5,
  toneHigher: "ember",
  toneLower: "glacier",
  adjHigher: "warmer",
  adjLower: "colder",
};

const PRECIP_SPEC: SignalSpec = {
  id: "annual-precip",
  label: "Annual precip",
  shortLabel: "Precip",
  unit: "ratio",
  basis: "Annual precipitation as a multiple of home's total.",
  // Cut points are on |log2(ratio)|-derived salience; direction handled separately below.
  cuts: [0, 0],
  saliencePerUnit: 1,
  toneHigher: "ice",
  toneLower: "ochre",
  adjHigher: "wetter",
  adjLower: "drier",
};

const HUMIDITY_SPEC: SignalSpec = {
  id: "summer-humidity",
  label: "Summer humidity",
  shortLabel: "Humidity",
  unit: "points",
  basis: "Mean June–August relative humidity, percentage points vs home.",
  cuts: [3, 10],
  saliencePerUnit: 1 / 4,
  toneHigher: "ice",
  toneLower: "ochre",
  adjHigher: "muggier",
  adjLower: "drier",
};

const WINTER_SUN_SPEC: SignalSpec = {
  id: "winter-sun",
  label: "Winter sun",
  shortLabel: "Winter sun",
  unit: "points",
  basis: "Mean December–February sunshine (% of possible), points vs home.",
  cuts: [3, 12],
  saliencePerUnit: 1 / 5,
  toneHigher: "ochre",
  toneLower: "ice",
  adjHigher: "sunnier",
  adjLower: "grayer",
};

const SNOW_SPEC: SignalSpec = {
  id: "annual-snow",
  label: "Annual snow",
  shortLabel: "Snow",
  unit: "cm",
  basis: "Annual snowfall total (cm), this place minus home.",
  cuts: [15, 60],
  saliencePerUnit: 1 / 40,
  toneHigher: "glacier",
  toneLower: "ochre",
  adjHigher: "snowier",
  adjLower: "less snowy",
};

const COMFY_MONTHS_SPEC: SignalSpec = {
  id: "comfy-months",
  label: "Comfortable months",
  shortLabel: "Easy months",
  unit: "months",
  basis: "Months a year scoring pleasant on the atlas comfort model, vs home.",
  cuts: [0, 2],
  saliencePerUnit: 1.4,
  toneHigher: "sage",
  toneLower: "ember",
  adjHigher: "longer",
  adjLower: "shorter",
};

const HAZARD_SPEC: SignalSpec = {
  id: "hazard-load",
  label: "Hazard load",
  shortLabel: "Hazards",
  unit: "risk",
  basis: "Mean of all nine risk axes on the atlas 0–5 scale, vs home.",
  cuts: [0.3, 0.9],
  saliencePerUnit: 2.2,
  toneHigher: "ember",
  toneLower: "sage",
  adjHigher: "heavier",
  adjLower: "lighter",
};

function meanWinterSunshinePct(p: Place): number | null {
  const sun = p.climate.sunshinePct;
  if (!sun) return null;
  return (sun[11] + sun[0] + sun[1]) / 3;
}

function annualSnowCm(p: Place): number | null {
  const snow = p.climate.snowCm;
  if (!snow) return null;
  let total = 0;
  for (const v of snow) total += v;
  return total;
}

function tempPhrase(deltaC: number, spec: SignalSpec, noun: string): string {
  const abs = Math.abs(deltaC);
  const adj = deltaC > 0 ? spec.adjHigher : spec.adjLower;
  return `${noun} ${abs.toFixed(1)}°C ${adj}`;
}

function joinClauses(parts: readonly string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Format a ratio for prose: "about 2.3× the annual precipitation" / "about 45% less annual precipitation". */
function precipPhrase(ratio: number): string {
  if (ratio >= 1.75) {
    const mult = ratio >= 9.5 ? Math.round(ratio).toString() : ratio.toFixed(1);
    return `about ${mult}× the annual precipitation`;
  }
  if (ratio > 1.1) return `about ${Math.round((ratio - 1) * 100)}% more annual precipitation`;
  if (ratio >= 0.9) return "similar annual precipitation";
  return `about ${Math.round((1 - ratio) * 100)}% less annual precipitation`;
}

/**
 * Build the full delta read of `place` against `home`. Pure and cheap
 * (a handful of O(12) passes); callers may memoise per pair but do not
 * have to.
 */
export function buildHomeBaseComparison(home: Place, place: Place): HomeBaseComparison {
  if (home.id === place.id) {
    return {
      home,
      place,
      isSame: true,
      signals: [],
      headline: `${place.name} is your current home base — every other card and dossier reads as a delta against it.`,
    };
  }

  const signals: HomeDeltaSignal[] = [];

  const summerDelta = meanSummerHigh(place) - meanSummerHigh(home);
  signals.push(classify(SUMMER_SPEC, summerDelta, () => tempPhrase(summerDelta, SUMMER_SPEC, "summer days")));

  const winterDelta = meanJanLow(place) - meanJanLow(home);
  signals.push(classify(WINTER_SPEC, winterDelta, () => tempPhrase(winterDelta, WINTER_SPEC, "winter nights")));

  const homePrecip = Math.max(getAnnualPrecipMm(home), 15);
  const ratio = getAnnualPrecipMm(place) / homePrecip;
  const ratioSalience = Math.abs(Math.log2(Math.max(ratio, 0.01))) * 2.2;
  {
    const direction: HomeDeltaDirection = ratio >= 0.9 && ratio <= 1.1 ? SIMILAR : ratio > 1 ? "higher" : "lower";
    const magnitude: HomeDeltaMagnitude =
      direction === SIMILAR ? "slight" : ratio > 0.6 && ratio < 1.75 ? "clear" : "major";
    signals.push({
      id: PRECIP_SPEC.id,
      label: PRECIP_SPEC.label,
      shortLabel: PRECIP_SPEC.shortLabel,
      delta: ratio,
      unit: "ratio",
      direction,
      magnitude,
      salience: direction === SIMILAR ? 0 : ratioSalience,
      tone: direction === SIMILAR ? "ice" : direction === "higher" ? PRECIP_SPEC.toneHigher : PRECIP_SPEC.toneLower,
      phrase: precipPhrase(ratio),
      descriptor:
        direction === SIMILAR
          ? "about the same"
          : `${MAGNITUDE_WORD[magnitude]} ${direction === "higher" ? PRECIP_SPEC.adjHigher : PRECIP_SPEC.adjLower}`,
      basis: PRECIP_SPEC.basis,
    });
  }

  const homeHumidity = meanSummerHumidityPct(home);
  const placeHumidity = meanSummerHumidityPct(place);
  if (homeHumidity != null && placeHumidity != null) {
    const d = placeHumidity - homeHumidity;
    signals.push(
      classify(HUMIDITY_SPEC, d, direction =>
        direction === SIMILAR
          ? "similar summer humidity"
          : `summer air ${Math.round(Math.abs(d))} points ${d > 0 ? HUMIDITY_SPEC.adjHigher : HUMIDITY_SPEC.adjLower}`,
      ),
    );
  }

  const homeWinterSun = meanWinterSunshinePct(home);
  const placeWinterSun = meanWinterSunshinePct(place);
  if (homeWinterSun != null && placeWinterSun != null) {
    const d = placeWinterSun - homeWinterSun;
    signals.push(
      classify(WINTER_SUN_SPEC, d, direction =>
        direction === SIMILAR
          ? "similar winter sun"
          : `winter skies ${Math.round(Math.abs(d))} points ${d > 0 ? WINTER_SUN_SPEC.adjHigher : WINTER_SUN_SPEC.adjLower}`,
      ),
    );
  }

  const homeSnow = annualSnowCm(home);
  const placeSnow = annualSnowCm(place);
  if (homeSnow != null && placeSnow != null) {
    const d = placeSnow - homeSnow;
    signals.push(
      classify(SNOW_SPEC, d, direction =>
        direction === SIMILAR
          ? "similar snowfall"
          : `about ${Math.round(Math.abs(d))} cm ${d > 0 ? "more" : "less"} snow a year`,
      ),
    );
  }

  const monthsDelta = annualComfortMonthCount(place) - annualComfortMonthCount(home);
  signals.push(
    classify(COMFY_MONTHS_SPEC, monthsDelta, direction =>
      direction === SIMILAR
        ? "a similar comfortable-season length"
        : `${Math.abs(monthsDelta)} ${Math.abs(monthsDelta) === 1 ? "month" : "months"} ${monthsDelta > 0 ? "more" : "fewer"} of comfortable weather a year`,
    ),
  );

  const riskDelta = avgRisk(place) - avgRisk(home);
  signals.push(
    classify(HAZARD_SPEC, riskDelta, direction =>
      direction === SIMILAR
        ? "a similar all-hazard load"
        : `a ${riskDelta > 0 ? "heavier" : "lighter"} all-hazard load`,
    ),
  );

  // Most-salient first; definition order breaks ties so output is stable.
  const ordered = signals
    .map((s, index) => ({ s, index }))
    .sort((a, b) => b.s.salience - a.s.salience || a.index - b.index)
    .map(({ s }) => s);

  const leading = ordered.filter(s => s.direction !== SIMILAR).slice(0, 3);
  const headline =
    leading.length === 0
      ? `${place.name} reads as a close climate sibling of ${home.name} — summer, winter, moisture, and hazard signals all land within a rounding error of home.`
      : `Compared with ${home.name}: ${joinClauses(leading.map(s => s.phrase))}.`;

  return { home, place, isSame: false, signals: ordered, headline };
}

/** The compact chip set for cards and compare columns: strongest non-similar signals. */
export function pickHomeDeltaChips(comparison: HomeBaseComparison, limit = 3): HomeDeltaSignal[] {
  return comparison.signals.filter(s => s.direction !== SIMILAR).slice(0, limit);
}

/**
 * Unit-aware compact value for a signal ("+12.8°F", "0.4×", "−38%",
 * "+9 pts", "+2 mo", "+33 in", "−0.8 / 5"). Temperature deltas use the
 * 9/5 ratio via `fmtDelta`; snow converts linearly via `fmtSnow`.
 */
export function formatHomeDeltaValue(signal: HomeDeltaSignal, temp: TempUnit, dist: DistUnit): string {
  switch (signal.unit) {
    case "C":
      return fmtDelta(signal.delta, temp);
    case "ratio": {
      const ratio = signal.delta;
      if (ratio >= 1.75) return `${ratio >= 9.5 ? Math.round(ratio) : ratio.toFixed(1)}×`;
      const pct = Math.round(Math.abs(ratio - 1) * 100);
      return `${ratio >= 1 ? "+" : "-"}${pct}%`;
    }
    case "points": {
      const v = Math.round(signal.delta);
      return `${v > 0 ? "+" : ""}${v} pts`;
    }
    case "months": {
      const v = Math.round(signal.delta);
      return `${v > 0 ? "+" : ""}${v} mo`;
    }
    case "cm": {
      const sign = signal.delta > 0 ? "+" : "-";
      return `${sign}${fmtSnow(Math.abs(signal.delta), dist)}`;
    }
    case "risk": {
      const v = signal.delta;
      return `${v > 0 ? "+" : ""}${v.toFixed(1)} / 5`;
    }
  }
}
