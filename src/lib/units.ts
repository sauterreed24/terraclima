import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import React from "react";

/**
 * Terraclima unit system — Fahrenheit-first with a Celsius toggle.
 *
 * All underlying climate data is stored in Celsius and millimetres.
 * The UI is presented through these helpers which honour the user's
 * preferred unit. Formatting is consistent across charts, chips,
 * cards, and detail pages.
 */

export type TempUnit = "F" | "C";
export type DistUnit = "imperial" | "metric";

export const UNIT_STORAGE_KEY = "terraclima.units.v1";

export interface UnitState {
  temp: TempUnit;
  dist: DistUnit;
  setTemp: (t: TempUnit) => void;
  setDist: (d: DistUnit) => void;
  toggle: () => void;
}

const defaultState: UnitState = {
  temp: "F",
  dist: "imperial",
  setTemp: () => {},
  setDist: () => {},
  toggle: () => {},
};

export const UnitContext = createContext<UnitState>(defaultState);

type UnitPreference = Pick<UnitState, "temp" | "dist">;

export function parseUnitSearch(search: string): Partial<UnitPreference> {
  let s = search;
  if (s.startsWith("?")) s = s.slice(1);
  const params = new URLSearchParams(s);
  const out: Partial<UnitPreference> = {};
  const temp = params.get("temp");
  if (temp === "F" || temp === "C") out.temp = temp;
  const dist = params.get("dist");
  if (dist === "imperial" || dist === "metric") out.dist = dist;
  return out;
}

function readInitialUnitPreference(): UnitPreference {
  let next: UnitPreference = { temp: "F", dist: "imperial" };
  if (typeof window === "undefined") return next;

  try {
    const raw = localStorage.getItem(UNIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { temp?: TempUnit; dist?: DistUnit };
      if (parsed.temp === "F" || parsed.temp === "C") next = { ...next, temp: parsed.temp };
      if (parsed.dist === "imperial" || parsed.dist === "metric") next = { ...next, dist: parsed.dist };
    }
  } catch { /* noop */ }

  try {
    next = { ...next, ...parseUnitSearch(window.location.search) };
  } catch { /* noop */ }

  return next;
}

function persistUnitPreference(next: UnitPreference): void {
  try { localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const [{ temp, dist }, setUnits] = useState<UnitPreference>(() => readInitialUnitPreference());

  const setTemp = useCallback((t: TempUnit) => {
    setUnits(current => {
      const next = { ...current, temp: t };
      persistUnitPreference(next);
      return next;
    });
  }, []);

  const setDist = useCallback((d: DistUnit) => {
    setUnits(current => {
      const next = { ...current, dist: d };
      persistUnitPreference(next);
      return next;
    });
  }, []);

  const toggle = useCallback(() => {
    setUnits(current => {
      const nextTemp: TempUnit = current.temp === "F" ? "C" : "F";
      const next = { ...current, temp: nextTemp };
      persistUnitPreference(next);
      return next;
    });
  }, []);

  const value: UnitState = useMemo(() => ({ temp, dist, setTemp, setDist, toggle }), [temp, dist, setTemp, setDist, toggle]);
  return React.createElement(UnitContext.Provider, { value }, children);
}

export function useUnits(): UnitState {
  return useContext(UnitContext);
}

// ---------- Conversion primitives ----------

export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;
export const mmToIn = (mm: number): number => mm / 25.4;
export const cmToIn = (cm: number): number => cm / 2.54;
export const mToFt = (m: number): number => m * 3.28084;
export const kmToMi = (km: number): number => km * 0.621371;

// ---------- Formatting helpers ----------

/** `toFixed` without the negative zero it gives for small negatives (−0.4 → "0", not "-0"). */
export function toFixedClean(value: number, digits = 0): string {
  const s = value.toFixed(digits);
  return /^-0(?:\.0+)?$/.test(s) ? s.slice(1) : s;
}

/** Format a temperature in °C to the user's preferred unit. */
export function fmtTemp(celsius: number | null | undefined, unit: TempUnit, opts?: { digits?: number; unit_symbol?: boolean }): string {
  if (celsius == null || !isFinite(celsius)) return "—";
  const digits = opts?.digits ?? 0;
  const suffix = opts?.unit_symbol !== false ? `°${unit}` : "°";
  const v = unit === "F" ? cToF(celsius) : celsius;
  return `${toFixedClean(v, digits)}${suffix}`;
}

/** Format a temperature delta (Δ°C). Fahrenheit deltas use the 9/5 ratio only. */
export function fmtDelta(deltaC: number, unit: TempUnit, opts?: { digits?: number; signed?: boolean }): string {
  const digits = opts?.digits ?? 1;
  const v = unit === "F" ? (deltaC * 9) / 5 : deltaC;
  const s = toFixedClean(v, digits);
  const sign = opts?.signed !== false && v > 0 && Number(s) !== 0 ? "+" : "";
  return `${sign}${s}°${unit}`;
}

/** Convert °C to unit without formatting (used in chart axes). */
export function toTempUnit(celsius: number, unit: TempUnit): number {
  return unit === "F" ? cToF(celsius) : celsius;
}

/** Convert a °C delta to the unit (°F deltas are 9/5 larger). */
export function toDeltaUnit(deltaC: number, unit: TempUnit): number {
  return unit === "F" ? (deltaC * 9) / 5 : deltaC;
}

/** Format annual precipitation. */
export function fmtPrecip(mm: number, dist: DistUnit, opts?: { short?: boolean }): string {
  if (!isFinite(mm)) return "—";
  if (dist === "imperial") {
    const inches = mmToIn(mm);
    return `${inches.toFixed(inches < 10 ? 1 : 0)} in${opts?.short ? "" : ""}`;
  }
  return `${Math.round(mm)} mm`;
}

/** Format monthly precipitation — always compact. */
export function fmtPrecipSmall(mm: number, dist: DistUnit): string {
  if (!isFinite(mm)) return "—";
  if (dist === "imperial") {
    const inches = mmToIn(mm);
    return `${inches.toFixed(inches < 2 ? 1 : 0)}"`;
  }
  return `${Math.round(mm)}`;
}

/** Format snowfall. Data lives in cm. */
export function fmtSnow(cm: number, dist: DistUnit): string {
  if (!isFinite(cm)) return "—";
  if (dist === "imperial") {
    const inches = cmToIn(cm);
    return `${inches.toFixed(0)}"`;
  }
  return `${Math.round(cm)} cm`;
}

/** Format elevation. Data lives in metres. */
export function fmtElev(m: number, dist: DistUnit): string {
  if (!isFinite(m)) return "—";
  if (dist === "imperial") {
    const ft = mToFt(m);
    return `${Math.round(ft).toLocaleString()} ft`;
  }
  return `${Math.round(m).toLocaleString()} m`;
}

/** Format distance km → mi or km. */
export function fmtDist(km: number, dist: DistUnit): string {
  if (!isFinite(km)) return "—";
  if (dist === "imperial") {
    const mi = kmToMi(km);
    return `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Precipitation axis tick interval (in native unit) given data max. */
export function precipTickStep(maxVal: number, dist: DistUnit): number {
  if (dist === "imperial") {
    if (maxVal > 8) return 4;
    if (maxVal > 3) return 2;
    if (maxVal > 1) return 1;
    return 0.5;
  }
  if (maxVal > 200) return 100;
  if (maxVal > 80) return 50;
  if (maxVal > 30) return 20;
  return 10;
}

// ---------- Prose localization ----------

/**
 * Word-boundary regex patterns that, when found within the SAME CLAUSE as a
 * temperature literal, mark that literal as a DELTA / difference rather
 * than an absolute reading.
 *
 * Crucially: the windows used are narrow and clause-bounded. A 48-char
 * window previously caught "below" from "fall below −25°C" three clauses
 * away from an unrelated "exceed 23°C", and mis-converted 23°C as a delta
 * (23 × 9/5 = 41) instead of an absolute (23 × 9/5 + 32 = 74). We now clip
 * both windows at the nearest clause terminator (. ; : , — | newline) so
 * modifier detection can never cross that boundary.
 *
 * Tight word boundaries prevent false positives like "windchills"
 * triggering on "chill", or "continentality" on "tall".
 */
const DELTA_AFTER_PAT = /\b(warmer|cooler|colder|hotter|higher|lower|wider|narrower|stronger|weaker|apart|bigger|smaller|greater|above|below|milder|harsher|relative|differences?|of (?:cooling|warming))\b/;
/** Comparatives that only ever describe a difference ("10°C hotter"). */
const TRUE_COMPARATIVE_PAT = /\b(warmer|cooler|colder|hotter|milder|harsher)\b/;
/**
 * A comparative only marks the number as a difference when it follows the
 * number directly ("10°C hotter in summer"). After a conjunction it belongs
 * to a new thought about an absolute reading: "afternoons near 41°C and often
 * above 45°C", "nights near −15°C and far colder", "near 30°C in town but much
 * cooler", "from about 13°C to below freezing".
 */
const AFTER_CLAUSE_STOP_PAT = /\b(?:and|but|while|whereas|or|then|yet|though|until|before|after|dropping|falling|rising|climbing|dipping|give|gives|giving|to|in)\b/;
/** Readings introduced by these words are absolute ("exceed 25°C above the caldera"). */
const ABSOLUTE_LEAD_PAT = /\b(?:near|around|exceeds?|exceeding|reach(?:es|ed|ing)?|tops?|topping|hits?|hitting|past|at|hover\w*|into)\s*$/;
/** Hedges that can sit between a delta cue and its number ("by roughly 10 °C"). */
const APPROX_TAIL_PAT = /\s*(?:about|roughly|nearly|around|approximately|almost|some|over|more than|less than|as much as|~|≈)\s*$/;
// Bare "of" is NOT a delta cue — "lows of −30°C" / "highs of 28°C" /
// "afternoons of 25°C" are absolute readings. Compound delta forms that
// happen to contain "of" ("swing of", "drop of", "range of", …) are
// matched explicitly below, so we never need the bare "of" rule.
//
// Bare "by" is kept because corpus prose uses "warmer by 5°C", "punctuated
// by 25°C warm-ups", "differs by 8°C", and similar. The one absolute
// "by 27°C water" phrasing has been rewritten in the corpus.
const DELTA_BEFORE_PAT = /\b(by|spik(?:e|es|ed|ing)(?:\s+temperatures?)?|swing of|range of|spread of|delta|differential|diurnal|amplitude|gradient|shift(?:ed|s)? (?:of|by)|lift(?:ed|s)? (?:of|by)|drop(?:ped|s)? (?:of|by)|rise(?:s)? (?:of|by)|fall(?:s)? (?:of|by)|jump(?:s|ed)? (?:of|by)|climb(?:s|ed)? (?:of|by)|plunge(?:s|d)? (?:of|by)|lift|strip(?:s|ped)?|boost(?:s|ed)? (?:by|of)|warm(?:s|ed|ing)? (?:by|up by)|cool(?:s|ed|ing)? (?:by|down by)|moderat\w+ (?:by)|up to|down to|averag(?:es|ing)? (?:\d+°?\s*[CF] )?(?:warmer|cooler|colder)|drop(?:s|ped)?|plunge(?:s|d)?|rise(?:s)?|jump(?:s|ed)?|climb(?:s|ed)?|add(?:s|ed)?|shav(?:e|es|ed|ing)|knock(?:s|ed)?|trim(?:s|med)?|spans?(?: only)?|spanning(?: only)?|warming|cooling|(?:drop|lift|rais|push|knock|send|bump)\w*\s+(?:the\s+)?(?:temperatures?|mercury|readings?))\s*$/;

/** Characters that terminate a clause for the purposes of delta detection. */
const CLAUSE_TERMINATORS = /[.;:,\u2014\u2013|\n]/;

/**
 * Slice a window of `maxLen` chars from `text` ending at `idx`, but only as
 * far back as the nearest clause terminator. The terminator itself is not
 * included. This makes the "before" context strictly clause-local.
 */
function beforeClauseWindow(text: string, idx: number, maxLen: number): string {
  const start = Math.max(0, idx - maxLen);
  const raw = text.substring(start, idx);
  const m = raw.match(/[.;:,\u2014\u2013|\n][^.;:,\u2014\u2013|\n]*$/);
  return (m ? raw.substring(m.index! + 1) : raw).toLowerCase();
}

/**
 * Slice a window of `maxLen` chars from `text` starting at `idx`, but only
 * up to the nearest clause terminator.
 */
function afterClauseWindow(text: string, idx: number, maxLen: number): string {
  const raw = text.substring(idx, idx + maxLen);
  const m = raw.match(CLAUSE_TERMINATORS);
  return (m ? raw.substring(0, m.index) : raw).toLowerCase();
}

/**
 * Phrases like "summer highs up to 40°C" or "winter lows down to −10°C"
 * describe absolute ceilings/floors, not °C deltas. Those must not match
 * `up to` / `down to` inside DELTA_BEFORE_PAT.
 */
function isAbsoluteTemperatureCeilingContext(before: string): boolean {
  return (
    /\b(highs?|lows?|temperatures?|temps?|days?|nights?|afternoons?|mornings?|readings?)\s+up\s+to\s*$/i.test(before) ||
    /\b(highs?|lows?|temperatures?|temps?|days?|nights?|afternoons?|mornings?|readings?)\s+down\s+to\s*$/i.test(before)
  );
}

/**
 * Signed "+NN°C" is often a projected warming increment, but prose also uses
 * an explicit plus for absolute warm readings ("lift ... to +15°C"). The latter
 * follows prepositions like `to` / `into` / `near` (never the `to` in `up to`).
 */
function signedCelsiusLooksAbsolute(before: string): boolean {
  if (/\bup\s+to\s*$/i.test(before)) return false;
  return /\b(to|into|towards?|near|reaches?|reached|reaching|hits?|hitting|tops?|topping|exceeds?|exceeding|past)\s*$/i.test(before);
}

function signedCelsiusLooksDelta(before: string, token: string): boolean {
  return token.startsWith("+") && !signedCelsiusLooksAbsolute(before) && !isAbsoluteTemperatureCeilingContext(before);
}

function stripApproxTail(before: string): string {
  let out = before;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(APPROX_TAIL_PAT, "");
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Decide whether a temperature token at `idx` is a delta (vs. absolute). */
function isDeltaContext(text: string, idx: number, len: number): boolean {
  // Narrow, clause-local windows.
  const before = beforeClauseWindow(text, idx, 40);
  const lead = stripApproxTail(before);
  const afterFull = afterClauseWindow(text, idx + len, 24);
  const stop = afterFull.match(AFTER_CLAUSE_STOP_PAT);
  const after = stop ? afterFull.slice(0, stop.index) : afterFull;
  if (isAbsoluteTemperatureCeilingContext(before)) return false;
  if (DELTA_BEFORE_PAT.test(before) || DELTA_BEFORE_PAT.test(lead)) return true;
  // Explicit phrasings commonly used for deltas — allow scanning both
  // windows jointly because these phrases are unambiguous.
  if (/\b(thermal windows?|annual (?:temperature )?ranges?|annual swings?|daily ranges?|diurnal swings?|temperature (?:ranges?|differences?|spreads?|gaps?|swings?))\b/.test(before + " " + after)) return true;
  if (ABSOLUTE_LEAD_PAT.test(lead) && !TRUE_COMPARATIVE_PAT.test(after)) return false;
  if (DELTA_AFTER_PAT.test(after)) return true;
  return false;
}

const IMPLICIT_CELSIUS_BAND_CONTEXT_PAT =
  /\b(highs?|lows?|temperatures?|temps?|readings?|afternoons?|mornings?|nights?|days?|dew\s*points?|wet[-\s]?bulb|summer|winter|january|february|july|august|cool(?:s|ed|ing)?|warm(?:s|ed|ing)?|cold|heat|hot|mild|hover(?:s|ed|ing)?|stay(?:s|ed|ing)?|sit(?:s|ting)?|reach(?:es|ed|ing)?|climb(?:s|ed|ing)?|drop(?:s|ped|ping)?|dip(?:s|ped|ping)?|fall(?:s|en|ing)?|range|year-round|season)\b/i;

function implicitBandContextLooksCelsius(text: string, idx: number, len: number): boolean {
  const before = beforeClauseWindow(text, idx, 72);
  const after = afterClauseWindow(text, idx + len, 56);
  return IMPLICIT_CELSIUS_BAND_CONTEXT_PAT.test(before) || IMPLICIT_CELSIUS_BAND_CONTEXT_PAT.test(after);
}

function qualifierRange(
  q1: string | undefined,
  q2: string | undefined,
  base: number,
  top: number,
): readonly [number, number] {
  const segment = (q: string | undefined): readonly [number, number] => {
    if (!q) return [base, top];
    const normalized = q.toLowerCase();
    if (normalized === "low") return [base, Math.min(top, base + 3)];
    if (normalized === "mid") return [Math.min(top, base + 4), Math.min(top, base + 6)];
    return [Math.min(top, base + 7), top];
  };
  const first = segment(q1);
  const second = q2 ? segment(q2) : first;
  return [Math.min(first[0], second[0]), Math.max(first[1], second[1])];
}

function formatFahrenheitBand(loC: number, hiC: number): string {
  const lo = Math.round(cToF(loC));
  const hi = Math.round(cToF(hiC));
  return lo === hi ? `${lo}\u00b0F` : `${lo}\u2013${hi}\u00b0F range`;
}

function wordDecadeBase(word: string): number {
  switch (word.toLowerCase()) {
    case "twenties": return 20;
    case "thirties": return 30;
    case "forties": return 40;
    default: return Number.NaN;
  }
}

function localizeImplicitCelsiusBands(text: string): string {
  const replaceIfCelsiusContext = (
    match: string,
    loC: number,
    hiC: number,
    unitToken: string | undefined,
    offset: number,
    full: string,
  ): string => {
    if (!unitToken && !implicitBandContextLooksCelsius(full, offset, match.length)) return match;
    return formatFahrenheitBand(loC, hiC);
  };

  text = text.replace(
    /\b((?:(low|mid|upper|high)(?:[-\s]+to[-\s]+(low|mid|upper|high))?[-\s]+)?([1-4]0)s)(\s*(?:\u00b0\s*C|Celsius))?\b/gi,
    (match, _phrase: string, q1: string | undefined, q2: string | undefined, tens: string, unitToken: string | undefined, offset: number, full: string) => {
      const base = parseInt(tens, 10);
      const [lo, hi] = qualifierRange(q1, q2, base, base + 9);
      return replaceIfCelsiusContext(match, lo, hi, unitToken, offset, full);
    },
  );

  text = text.replace(
    /\b((?:(low|mid|upper|high)(?:[-\s]+to[-\s]+(low|mid|upper|high))?[-\s]+)?(twenties|thirties|forties))(\s*(?:\u00b0\s*C|Celsius))?\b/gi,
    (match, _phrase: string, q1: string | undefined, q2: string | undefined, decade: string, unitToken: string | undefined, offset: number, full: string) => {
      const base = wordDecadeBase(decade);
      if (!Number.isFinite(base)) return match;
      const [lo, hi] = qualifierRange(q1, q2, base, base + 9);
      return replaceIfCelsiusContext(match, lo, hi, unitToken, offset, full);
    },
  );

  text = text.replace(
    /\b((?:(low|mid|upper|high)(?:[-\s]+to[-\s]+(low|mid|upper|high))?[-\s]+)?teens)(\s*(?:\u00b0\s*C|Celsius))?\b/gi,
    (match, _phrase: string, q1: string | undefined, q2: string | undefined, unitToken: string | undefined, offset: number, full: string) => {
      const [lo, hi] = qualifierRange(q1, q2, 10, 19);
      return replaceIfCelsiusContext(match, lo, hi, unitToken, offset, full);
    },
  );

  text = text.replace(
    /\bsingle[-\s]+digits?(\s*(?:\u00b0\s*C|Celsius))?\b/gi,
    (match, unitToken: string | undefined, offset: number, full: string) =>
      replaceIfCelsiusContext(match, 0, 9, unitToken, offset, full),
  );

  return text;
}

/** Parse a signed numeric literal that may use a Unicode minus. */
function parseSigned(n: string): number {
  return parseFloat(n.replace(/[\u2212\u2013\u2014]/g, "-").replace(/\+/g, ""));
}

function formatLocalized(valueF: number, explicitSign: boolean): string {
  const rounded = Math.round(valueF);
  const sign = rounded < 0 ? "\u2212" : (explicitSign && rounded > 0 ? "+" : "");
  return `${sign}${Math.abs(rounded)}`;
}

function formatLocalizedDecimal(valueF: number, explicitSign: boolean, digits = 1): string {
  const rounded = Number(valueF.toFixed(digits));
  const sign = rounded < 0 ? "\u2212" : (explicitSign && rounded > 0 ? "+" : "");
  return `${sign}${Math.abs(rounded)}`;
}

/**
 * Rewrite a prose string so every °C value becomes the user's preferred unit.
 * Handles:
 *   - single values:   "23°C", "−27 °C", "+3°C"
 *   - dash ranges:     "5–15°C", "-5--3°C", "18-20°C"
 *   - "to" ranges:     "+3 to +5°C", "20 to 30°C"
 *   - delta vs. absolute, via surrounding word context
 *
 * When `dist` is `"imperial"`, also rewrites common editorial metric units:
 *   - "1,427 m" → "4,682 ft"
 *   - "between 1500 and 2500 m" → "between 4,921 and 8,202 ft"
 *   - "3–6 meters" → "10–20 feet"
 *   - "thousands of meters" → "thousands of feet"
 *   - "1,500 mm" → "59 in"
 *   - "80 cm"   → "31 in"
 *   - "10 km"   → "6 mi"
 *   - "25 km/h" / "25 kph" → "16 mph"
 *
 * Temperature deltas such as "spiking temperatures 20–30°C" convert with the
 * ×9/5 scale (not the absolute °C→°F offset).
 *
 * No-op for temperatures when the user prefers Celsius, and no-op for
 * distances when the user prefers metric.
 */
export function localizeProse(text: string | null | undefined, unit: TempUnit, dist: DistUnit = "imperial"): string {
  if (!text) return "";

  // --- Temperature (°C → °F) ---
  if (unit === "F") {
    // Lapse-rate shorthand is a temperature delta per vertical distance, not
    // an absolute reading. Convert common °C/km and °C per 1000 m forms to
    // the familiar °F per 1,000 ft expression.
    const lapseRatePat = /(?:([-+\u2212]?\d+(?:\.\d+)?)\s*([\u2013\u2014-])\s*)?([-+\u2212]?\d+(?:\.\d+)?)\s*\u00b0\s*C\s*(?:\/\s*km|per\s+1,?000\s*m)\b/gi;
    text = text.replace(lapseRatePat, (_m, n1: string | undefined, dash: string | undefined, n2: string) => {
      const per1000Ft = (n: string) => formatLocalizedDecimal((parseSigned(n) * 9) / 5 / 3.28084, n.startsWith("+"));
      return `${n1 ? `${per1000Ft(n1)}${dash}` : ""}${per1000Ft(n2)}\u00b0F per 1,000 ft`;
    });

    // Celsius-band shorthand before numeric passes: explicit "20s °C" plus
    // contextual phrases such as "low-to-mid 20s" and "single digits".
    text = localizeImplicitCelsiusBands(text);

    // Pass 1: dash ranges first (consumes both numbers)
    const rangePat = /([-+\u2212]?\d+(?:\.\d+)?)\s*([\u2013\u2014-])\s*([-+\u2212]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(rangePat, (match, n1: string, dash: string, n2: string, offset: number, full: string) => {
      const v1 = parseSigned(n1);
      const v2 = parseSigned(n2);
      const before = beforeClauseWindow(full, offset, 40);
      const delta = isDeltaContext(full, offset, match.length) || signedCelsiusLooksDelta(before, n1) || signedCelsiusLooksDelta(before, n2);
      const f1 = delta ? (v1 * 9) / 5 : cToF(v1);
      const f2 = delta ? (v2 * 9) / 5 : cToF(v2);
      return `${formatLocalized(f1, delta && n1.startsWith("+"))}${dash}${formatLocalized(f2, delta && n2.startsWith("+"))}°F`;
    });

    // Pass 2: "N to M °C"
    const toPat = /([-+\u2212]?\d+(?:\.\d+)?)\s+to\s+([-+\u2212]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(toPat, (match, n1: string, n2: string, offset: number, full: string) => {
      const v1 = parseSigned(n1);
      const v2 = parseSigned(n2);
      const before = beforeClauseWindow(full, offset, 40);
      const delta = isDeltaContext(full, offset, match.length) || signedCelsiusLooksDelta(before, n1) || signedCelsiusLooksDelta(before, n2);
      const f1 = delta ? (v1 * 9) / 5 : cToF(v1);
      const f2 = delta ? (v2 * 9) / 5 : cToF(v2);
      return `${formatLocalized(f1, delta && n1.startsWith("+"))} to ${formatLocalized(f2, delta && n2.startsWith("+"))}°F`;
    });

    // Pass 3: single values
    const singlePat = /([-+\u2212]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(singlePat, (match, n: string, offset: number, full: string) => {
      const v = parseSigned(n);
      const before = beforeClauseWindow(full, offset, 40);
      const delta = isDeltaContext(full, offset, match.length) || signedCelsiusLooksDelta(before, n);
      const f = delta ? (v * 9) / 5 : cToF(v);
      return `${formatLocalized(f, delta && n.startsWith("+"))}°F`;
    });
  }

  // --- Distance / elevation / precipitation (metric → imperial) ---
  if (dist === "imperial") {
    text = localizeDistanceProse(text);
  }

  return text;
}

/** Parse a possibly comma-separated numeric token ("1,427" → 1427). */
function parseLooseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/** Human-format a number with commas when large, trimmed decimals otherwise. */
function formatUSNumber(n: number, digits = 0): string {
  const rounded = Number(n.toFixed(digits));
  if (Math.abs(rounded) >= 1000) return rounded.toLocaleString("en-US");
  if (digits === 0) return Math.round(rounded).toString();
  return rounded.toString();
}

/**
 * Context-aware metric → imperial rewriter for prose.
 *
 * Rules are careful to avoid false positives:
 *   - Must have a word boundary before the number (so Köppen codes like
 *     "BSk" and compound tokens like "km/h" are handled explicitly rather
 *     than caught mid-word).
 *   - km/h and kph are detected *before* bare km so we don't grab only "km".
 *   - mm is only treated as millimetres when followed by a non-letter
 *     (avoiding "mm-hg" or "mmWh" style compounds) and when the preceding
 *     context suggests precipitation / rainfall / snow (or is simply bare).
 *   - m (bare metres) is the trickiest: we require either a digits-with-unit
 *     shape followed by whitespace / punctuation that isn't "m[a-z]" (so we
 *     don't eat "25 m/s" wind speed or "m²"), *and* some elevation-ish
 *     context nearby ("elevation", "sits at", "rises", "above", "peak",
 *     "summit", altitude, crest, ridge, m.a.s.l., etc.), to avoid mangling
 *     data like "8 m wetland" or "Route 5 m".
 */
const SPELLED_UNITS_BASE: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};
// Compound tens ("twenty-five") are parsed whole; a number that follows a
// hyphen or "… hundred and" is left alone rather than half-converted.
const SPELLED_NUMBER = "(?:a|an|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)";
const SPELLED_METRIC_QUANTITY = new RegExp(
  `(?<![\\w-])(?<!\\b(?:hundred|thousand)\\s+and\\s)(${SPELLED_NUMBER}(?:\\s+(?:hundred|thousand)(?:\\s+and\\s+${SPELLED_NUMBER})?)?)(?!\\s+and\\b)\\s+(met(?:er|re)s?|kilomet(?:er|re)s?|hectares)\\b`,
  "gi",
);
const SPELLED_HYPHEN_METRE = new RegExp(`(?<![\\w-])(${SPELLED_NUMBER})-met(?:er|re)\\b`, "gi");

/** "three hundred" → 300; "a thousand" → 1000. Bare "a"/"an" need a multiplier. */
function spelledNumberValue(words: string): number | null {
  const parts = words.toLowerCase().split(/\s+/);
  const base = parts[0]!.split("-").reduce<number | null>((sum, w) => {
    const v = SPELLED_UNITS_BASE[w];
    return sum == null || v == null ? null : sum + v;
  }, 0);
  if (base == null) return null;
  if (parts.length === 1) return parts[0] === "a" || parts[0] === "an" ? null : base;
  const scaled = base * (parts[1] === "hundred" ? 100 : 1000);
  if (parts[2] !== "and" || !parts[3]) return scaled;
  const tail = spelledNumberValue(parts[3]);
  return tail == null ? null : scaled + tail;
}

/** Areas read best as round figures in prose. */
function roundAreaForProse(v: number): number {
  if (v >= 10000) return Math.round(v / 1000) * 1000;
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 10) * 10;
  return Math.round(v);
}

/**
 * A round metric figure ("3,000 m", "100 km", "500 mm") is itself an
 * approximation, so its conversion should read as one: "9,800 ft" and
 * "20 in" rather than "9,843 ft" and "19.7 in". Exact figures, such as a
 * station elevation of 2,424 m, keep their exact conversion.
 */
function isRoundMetric(n: string): boolean {
  const v = parseLooseNum(n);
  if (!Number.isInteger(v) || v < 10) return false;
  return v % 100 === 0 || (v < 1000 && v % 50 === 0) || (v < 200 && v % 10 === 0);
}

function roundTwoSignificant(v: number): number {
  if (v < 10) return Math.round(v);
  // Two significant figures, three from 10,000 up (13,780 → 13,800, not 14,000).
  const step = 10 ** (Math.floor(Math.log10(v)) - (v >= 10000 ? 2 : 1));
  return Math.round(v / step) * step;
}

/** Convert a metric figure for prose; small results keep one decimal unless `wholeOnly`. */
function convertFigure(n: string, factor: number, wholeOnly = false): string {
  const v = parseLooseNum(n) * factor;
  if (isRoundMetric(n)) return formatUSNumber(roundTwoSignificant(v));
  return formatUSNumber(v, !wholeOnly && v < 10 ? 1 : 0);
}

/** Both ends of a range share one treatment: round only when both are round. */
function convertPair(n1: string, n2: string, factor: number, wholeOnly = false): [string, string] {
  if (isRoundMetric(n1) && isRoundMetric(n2)) return [convertFigure(n1, factor, wholeOnly), convertFigure(n2, factor, wholeOnly)];
  const v1 = parseLooseNum(n1) * factor;
  const v2 = parseLooseNum(n2) * factor;
  const digits = !wholeOnly && Math.max(v1, v2) < 10 ? 1 : 0;
  return [formatUSNumber(v1, digits), formatUSNumber(v2, digits)];
}

/** Replace while keeping a sentence-initial capital ("Metres of snow" → "Feet of snow"). */
function swapKeepCase(text: string, re: RegExp, out: string | ((...groups: string[]) => string)): string {
  return text.replace(re, (...a: unknown[]) => {
    const m = a[0] as string;
    const o = typeof out === "string" ? out : out(...(a as string[]));
    return /^[A-Z]/.test(m) && /^[a-z]/.test(o) ? o.charAt(0).toUpperCase() + o.slice(1) : o;
  });
}

function localizeDistanceProse(text: string): string {
  // --- Hyphenated adjectival forms ---
  //
  // Prose uses a hyphen-bound spelled-out unit as a modifier: "980-meter-high
  // ridge", "4,200-meter summit", "12-kilometer corridor", "15-km pass",
  // "20-centimeter snowpack", "200-millimeter floods". Convert these BEFORE
  // the plain-numeric passes so the numeric portion can't be caught twice.
  //
  // The pattern admits an optional trailing word ("-high", "-tall", "-deep",
  // "-long", "-wide") which we preserve after localization.

  // N-metre[s]- / N-meter[s]-  →  N-foot- (e.g. "980-meter-high" → "3,215-foot-high")
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*met(?:er|re)s?\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => `${convertFigure(n, 3.28084, true)}-foot-${qual.toLowerCase()}`
  );
  // N-metre[s] (no trailing qualifier) as adjectival: "4,200-meter summit"
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*met(?:er|re)s?\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => `${convertFigure(n, 3.28084, true)}-foot`
  );
  // Short "N-m" adjectival form: "~1,400-m elevation" → "~4,600-ft elevation".
  text = text.replace(/(\d+(?:,\d{3})*(?:\.\d+)?)-m\b(?![/²³^]|\.\w)/g, (_m, n: string) => `${convertFigure(n, 3.28084, true)}-ft`);

  // N-kilometre[s]- / N-km- → N-mile-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:kilomet(?:er|re)s?|km)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => `${convertFigure(n, 0.621371)}-mile-${qual.toLowerCase()}`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:kilomet(?:er|re)s?|km)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => `${convertFigure(n, 0.621371)}-mile`
  );

  // N-centimetre[s]- / N-cm- → N-inch-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:centimet(?:er|re)s?|cm)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => `${convertFigure(n, 1 / 2.54)}-inch-${qual.toLowerCase()}`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:centimet(?:er|re)s?|cm)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => `${convertFigure(n, 1 / 2.54)}-inch`
  );

  // N-millimetre[s]- / N-mm- → N-inch-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:millimet(?:er|re)s?|mm)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => `${convertFigure(n, 1 / 25.4)}-inch-${qual.toLowerCase()}`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:millimet(?:er|re)s?|mm)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => `${convertFigure(n, 1 / 25.4)}-inch`
  );

  // Areas: hectares → acres and square kilometres → square miles, including
  // spelled-out quantities ("a thousand hectares", "a 1,300-hectare spit").
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*hectares?\b/gi,
    (_m, n: string) => `${formatUSNumber(roundAreaForProse(parseLooseNum(n) * 2.47105))}-acre`,
  );
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s*(?:hectares?|ha\b)/gi,
    (_m, n: string, plus: string) => `${formatUSNumber(roundAreaForProse(parseLooseNum(n) * 2.47105))}${plus} acres`,
  );
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s*(?:square\s+kilomet(?:er|re)s?\b|sq\.?\s*km\b|km²|km2\b)/gi,
    (_m, n: string, plus: string) => `${formatUSNumber(roundAreaForProse(parseLooseNum(n) * 0.386102))}${plus} square miles`,
  );
  text = swapKeepCase(text, /\b(thousands|hundreds|tens)(\s+of\s+thousands)?\s+of\s+hectares\b/gi, (_m, q: string, t?: string) => `${q}${t ?? ""} of acres`);
  text = swapKeepCase(text, /\b(thousands|hundreds)\s+of\s+square\s+kilomet(?:er|re)s\b/gi, (_m, q: string) => `${q} of square miles`);

  // Spelled-out quantities ("two metres", "sixty kilometres", "a thousand
  // hectares", "three hundred metres") become digits so the numeric passes
  // below convert them.
  text = swapKeepCase(text, SPELLED_METRIC_QUANTITY, (_m, words: string, unit: string) => {
    const value = spelledNumberValue(words);
    return value == null ? _m : `${formatUSNumber(value)} ${unit}`;
  });
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*)\s+hectares\b/gi,
    (_m, n: string) => `${formatUSNumber(roundAreaForProse(parseLooseNum(n) * 2.47105))} acres`,
  );

  // Mass: tonnes → US tons, kilograms handled separately below.
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)(\s+(?:million|billion))?\s+(?:metric\s+)?tonnes?\b/gi,
    (_m, n: string, mult: string | undefined) => {
      const v = parseLooseNum(n) * 1.10231;
      return `${formatUSNumber(mult ? v : roundAreaForProse(v), mult && v < 10 ? 1 : 0)}${mult ?? ""} tons`;
    },
  );
  text = swapKeepCase(text, /\btonnes\b/gi, "tons");
  text = swapKeepCase(text, /\btonne\b/gi, "ton");

  // Large areas and volumes with million multipliers or no figure at all.
  text = swapKeepCase(text, 
    /\b(\d+(?:\.\d+)?)\s+million\s+hectares\b/gi,
    (_m, n: string) => `${formatUSNumber(parseLooseNum(n) * 2.47105, parseLooseNum(n) * 2.47105 < 10 ? 1 : 0)} million acres`,
  );
  text = swapKeepCase(text, /\bhalf\s+a\s+million\s+hectares\b/gi, "1.2 million acres");
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)(\s+million)?\s+cubic\s+met(?:er|re)s\b/gi,
    (_m, n: string, mult: string | undefined) => {
      const v = parseLooseNum(n) * 1.30795;
      return `${formatUSNumber(v, mult && v < 10 ? 1 : 0)}${mult ?? ""} cubic yards`;
    },
  );
  text = swapKeepCase(text, /\bhundreds\s+of\s+cubic\s+kilomet(?:er|re)s\b/gi, "dozens of cubic miles");
  text = swapKeepCase(text, /\bthousands\s+of\s+square\s+met(?:er|re)s\b/gi, "tens of thousands of square feet");
  text = swapKeepCase(text, 
    /(\d+(?:\.\d+)?)\s*(person|people)\s*\/\s*km²/gi,
    (_m, n: string) => `${formatUSNumber(parseLooseNum(n) * 2.58999, 0)} people/sq mi`,
  );

  // Vertical metres and spelled hyphen forms ("twelve-metre tides").
  text = swapKeepCase(text, 
    /\b(\d+(?:,\d{3})*)\s+vertical\s+met(?:er|re)s\b/gi,
    (_m, n: string) => `${convertFigure(n, 3.28084, true)} vertical feet`,
  );
  text = swapKeepCase(text, /\b(a\s+few\s+hundred|several\s+hundred|hundreds\s+of)\s+vertical\s+met(?:er|re)s\b/gi, (_m, q: string) => `${q} vertical feet`);
  text = swapKeepCase(text, /\ba\s+few\s+vertical\s+kilomet(?:er|re)s\b/gi, "a vertical mile or so");
  text = swapKeepCase(text, SPELLED_HYPHEN_METRE, (_m, w: string) => {
    const v = spelledNumberValue(w);
    return v == null ? _m : `${formatUSNumber(v * 3.28084)}-foot`;
  });
  text = swapKeepCase(text, 
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+and\s+a\s+half\s+met(?:er|re)s\b/gi,
    (_m, w: string) => `${formatUSNumber((SPELLED_UNITS_BASE[w.toLowerCase()]! + 0.5) * 3.28084)} feet`,
  );

  // Snow, rain and tide measured loosely in metres or centimetres.
  text = swapKeepCase(text, /\b(several|a\s+few|few)\s+centimet(?:er|re)s\b/gi, "an inch or more");
  text = swapKeepCase(text, /\ba\s+few\s+millimet(?:er|re)s\b/gi, "a fraction of an inch");
  text = swapKeepCase(text, /\b(?:a\s+)?couple\s+of\s+hundred\s+millimet(?:er|re)s\b/gi, "eight inches or so");
  text = swapKeepCase(text, /\ba\s+couple\s+of\s+met(?:er|re)s\b/gi, "six feet or so");
  text = swapKeepCase(text, /(?<![\d+]\s)\bmet(?:er|re)s\s+of\s+/gi, "feet of ");
  text = swapKeepCase(text, /\bin\s+met(?:er|re)s\b/gi, "in feet");
  text = swapKeepCase(text, /\b(in|not)\s+centimet(?:er|re)s\b/gi, (_m, w: string) => `${w} inches`);
  text = swapKeepCase(text, /\b(rise|rises|rose)\s+met(?:er|re)s\b/gi, (_m, v: string) => `${v} many feet`);
  text = swapKeepCase(text, /\bby\s+the\s+met(?:er|re)\b/gi, "by the yard");
  text = swapKeepCase(text, /\ba\s+full\s+kilomet(?:er|re)\b/gi, "more than half a mile");
  text = swapKeepCase(text, /\bkilomet(?:er|re)\s+after\s+kilomet(?:er|re)\b/gi, "mile after mile");
  text = swapKeepCase(text, /\b(several|a\s+few)\s+hundred\s+kilomet(?:er|re)s\b/gi, (_m, q: string) => `${/few/i.test(q) ? "a couple of" : "a few"} hundred miles`);
  text = swapKeepCase(text, /\b(a\s+few\s+dozen|dozens\s+of)\s+kilomet(?:er|re)s\b/gi, (_m, q: string) => `${q} miles`);
  text = swapKeepCase(text, /(?<![\d+]\s)\bkilomet(?:er|re)s\s+(away|of)\b/gi, (_m, w: string) => `miles ${w}`);

  // Vague metric quantities. Keep the vagueness, swap the unit.
  text = swapKeepCase(text, /\b(a\s+few|few|several|many|for|tens\s+of|thousands\s+of)\s+kilomet(?:er|re)s\b/gi, (_m, q: string) => `${q} miles`);
  text = swapKeepCase(text, /(?<![\d+]\s)\bkilomet(?:er|re)s\s+(long|wide)\b/gi, (_m, dim: string) => `miles ${dim}`);
  text = swapKeepCase(text, /\b(several|a\s+few)\s+hundred\s+met(?:er|re)s\b/gi, (_m, q: string) => /few/i.test(q) ? _m : `${q} hundred yards`);
  text = swapKeepCase(text, /\bhalf\s+a\s+kilomet(?:er|re)\b/gi, "a third of a mile");
  text = swapKeepCase(text, /\ba\s+kilomet(?:er|re)\s+and\s+a\s+half\b/gi, "about a mile");
  text = swapKeepCase(text, /\ba\s+kilomet(?:er|re)-/gi, "a half-mile-");
  text = swapKeepCase(text, /\bhalf\s+a\s+met(?:er|re)\b/gi, "a foot and a half");
  text = swapKeepCase(text, /\ba\s+met(?:er|re)\s+and\s+a\s+half\b/gi, "five feet");
  text = swapKeepCase(text, /\ba\s+met(?:er|re)-/gi, "a three-foot-");
  text = swapKeepCase(text, /\ba\s+metre\b|\ba\s+meter\b/gi, "a yard");
  text = swapKeepCase(text, /\ba\s+kilomet(?:er|re)\b/gi, "half a mile");
  text = swapKeepCase(text, /\b(a\s+few|few|several|many)\s+met(?:er|re)s\b/gi, (_m, q: string) => `${q} yards`);
  text = swapKeepCase(text, /\ba\s+few\s+tens\s+of\s+met(?:er|re)s\b/gi, "a hundred feet or so");
  text = swapKeepCase(text, /\btens\s+of\s+met(?:er|re)s\b/gi, "dozens of feet");
  text = swapKeepCase(text, /(?<![\d+]\s)\bmet(?:er|re)s\s+(deep|high|thick)\b/gi, (_m, dim: string) => `feet ${dim}`);

  // Qualitative word-form metric lengths ("thousands of meters", "hundreds of
  // kilometers", "a few hundred meters"). Convert unit nouns only — the
  // quantity words stay, matching common US climate writing.
  text = swapKeepCase(text, /\bthousands of met(?:er|re)s\b/gi, "thousands of feet");
  text = swapKeepCase(text, /\bhundreds of met(?:er|re)s\b/gi, "hundreds of feet");
  text = swapKeepCase(text, /\bhundreds of (?:kilomet(?:er|re)s|km)\b/gi, "hundreds of miles");
  text = swapKeepCase(text, /\b((?:a\s+)?few\s+hundred)\s+met(?:er|re)s\b/gi, (_m, qty: string) => `${qty} feet`);
  text = swapKeepCase(text, /(?<![\d+]\s)\bmet(?:er|re)s across\b/gi, "feet across");
  text = swapKeepCase(text, /(?<![\d+]\s)\b(?:kilomet(?:er|re)s|kilometers) wide\b/gi, "miles wide");

  // Spelled-out ranges BEFORE singular spelled-out units so "3–6 meters"
  // becomes "10–20 feet" rather than orphaning the first endpoint.
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s+met(?:er|re)s?\b/gi,
    (_m, n1: string, sep: string, n2: string) => {
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 3.28084, true);
      return `${a1}${joiner}${a2} feet`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s+kilomet(?:er|re)s?\b/gi,
    (_m, n1: string, sep: string, n2: string) => {
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 0.621371);
      return `${a1}${joiner}${a2} miles`;
    }
  );

  // Spelled-out non-hyphenated metric units. These come before the bare-symbol
  // passes so we consume the entire phrase ("980 meters" stays a single match
  // instead of matching "980 m" and orphaning "eters").
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s+met(?:er|re)s?\b/gi,
    (_m, n: string, plus: string) => `${convertFigure(n, 3.28084, true)}${plus} feet`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s+kilomet(?:er|re)s?\b/gi,
    (_m, n: string, plus: string) => `${convertFigure(n, 0.621371)}${plus} miles`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s+centimet(?:er|re)s?\b/gi,
    (_m, n: string, plus: string) => `${convertFigure(n, 1 / 2.54)}${plus} inches`
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)(\+?)\s+millimet(?:er|re)s?\b/gi,
    (_m, n: string, plus: string) => `${convertFigure(n, 1 / 25.4)}${plus} inches`
  );

  // km/h or kph → mph (do this FIRST so bare "km" doesn't eat the "km" of "km/h")
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*(?:km\/h|kph|km\s*\/\s*h)\b/gi, (_m, n: string) => {
    const v = parseLooseNum(n);
    return `${formatUSNumber(v * 0.621371, v < 10 ? 1 : 0)} mph`;
  });

  // Metric ranges with one trailing unit: "300 to 700 mm", "5–10 km",
  // "20-40 cm", "1500 and 2500 m". Convert both endpoints before the
  // single-unit passes so the first number cannot be orphaned.
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*km\b(?!\/)/gi,
    (_m, n1: string, sep: string, n2: string) => {
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 0.621371);
      return `${a1}${joiner}${a2} mi`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*mm\b(?![a-zA-Z])/gi,
    (_m, n1: string, sep: string, n2: string) => {
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 1 / 25.4);
      return `${a1}${joiner}${a2} in`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*cm\b(?![a-zA-Z])/gi,
    (_m, n1: string, sep: string, n2: string) => {
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 1 / 2.54);
      return `${a1}${joiner}${a2} in`;
    }
  );

  // Weights quoted in site histories ("about 270 kg of butter") → pounds.
  text = text.replace(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kg|kilogram(?:me)?s?)\b(?!\s*\/)/gi, (_m, n: string) => {
    const lb = parseLooseNum(n) * 2.20462;
    return `${formatUSNumber(lb, lb < 10 ? 1 : 0)} lb`;
  });

  // Bare "N km" (word-bounded, not immediately followed by "/" as in km/h which
  // is already handled above).
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*km\b(?!\/)/g, (_m, n: string) => `${convertFigure(n, 0.621371)} mi`);

  // "N mm" — millimetres of precip in this corpus. \b already prevents matching
  // mid-word (e.g. "mm-level" still has \b before the "-"), and any compound
  // unit like "mmHg" can't match because "m" directly followed by "H" isn't a
  // \b-terminated token boundary break we'd be looking at. We block only
  // directly adjacent letters.
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*mm\b(?![a-zA-Z])/g, (_m, n: string) => `${convertFigure(n, 1 / 25.4)} in`);

  // "N cm" — snow / depth contexts in this corpus.
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*cm\b(?![a-zA-Z])/g, (_m, n: string) => `${convertFigure(n, 1 / 2.54)} in`);

  // Metre ranges "N–M m" / "N-M m" / "N to M m" / "N and M m" — used for
  // stratus layers, elevation bands ("homes at 700–900 m", "between 1500
  // and 2500 m"), etc. Run BEFORE the bare-m handler so we consume both
  // numbers as a range.
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014-]|to|and)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*m\b(?![/²³^])/g,
    (match, n1: string, sep: string, n2: string, offset: number, full: string) => {
      const before = full.substring(Math.max(0, offset - 80), offset).toLowerCase();
      const after = full.substring(offset + match.length, offset + match.length + 64).toLowerCase();
      const elevationy =
        /\b(at|to|above|over|between|elevation|altitude|homes?|stratus|layer|depth|rise|rising|drop|peak|peaks|crest|ridge|summit|plateau|capping|band|basins?|relief|dunes?|bluffs?|horizontal)\b/.test(before) ||
        /\b(stratus|layer|peaks?|crest|ridge|summit|plateau|depth|rise|rising|drop|higher|lower|snow|snowfall|annually|elevation|altitude|band|belt|relief|dunes?|bluffs?|horizontal)\b/.test(after);
      if (!elevationy) return match;
      const joiner = sep === "to" || sep.toLowerCase() === "and" ? ` ${sep.toLowerCase()} ` : sep;
      const [a1, a2] = convertPair(n1, n2, 3.28084, true);
      return `${a1}${joiner}${a2} ft`;
    }
  );

  // Bare "N m" as metres — only in elevation / altitude / depth / snow-depth
  // contexts. We require one of the following to hold:
  //
  //   (a) A vocabulary word within ~80 chars *before* the token that signals
  //       vertical position ("at", "to", "above", "over", "sits at",
  //       "perches at", "elevation", "altitude", "rises", …).
  //   (b) A vocabulary word within ~40 chars *after* the token ("higher",
  //       "lower", "rise", "drop", "depth", "of snow", "of annual",
  //       "elevation", "asl", "above", …).
  //
  // The tight negative lookahead `(?![\/²^])` blocks m/s (speed), m² / m^2
  // (area). `\b` already prevents matches inside "mm", "cm", "km", "kph",
  // "kmh", "minutes", "meters", etc.
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*m\b(?![/²³^])/g,
    (match, n: string, offset: number, full: string) => {
      // Keep tilde "~" and opening parenthesis in the view so "(3429 m)" and
      // "~1200 m" get the contextual signal they need.
      const beforeRaw = full.substring(Math.max(0, offset - 80), offset);
      const afterRaw = full.substring(offset + match.length, offset + match.length + 48);
      const before = beforeRaw.toLowerCase();
      const after = afterRaw.toLowerCase();

      // Broad vocabulary of landform / elevation cues. Order is longest-first
      // only where ambiguity could arise; otherwise alphabetical.
      const beforeHit =
        /\b(?:elevation|altitude|sits\s+(?:at|above|on)|perch(?:es|ed)?\s+at|situated\s+at|lies\s+at|located\s+at|rests\s+at|nestled\s+at|grassland\s+at|town\s+(?:at|of)|city\s+(?:at|of)|capital\s+at|town\s+of\s+\w+\s+at|at\s+(?:least|more\s+than|nearly|roughly|about)|more\s+than|from|to|above|over|between|every|approaches?|averag(?:es|ing)?|rises?|rising|peaks?|summit|crest|ridge|plateau|m\.a\.s\.l\.|asl|meters?|metres?|higher\s+than|lower\s+than|tall|climbs?|drops?\s+(?:to|of)?|floor\s+of|basin|basins?|slopes?\s+(?:up|down)?\s*to|pass|saddle|crater|caldera|uplift|escarpment|up\s+to|storms?\s+of|swells?\s+of|layer|stratus|permafrost|kilometer|kilometre|km|volcano|volcan|mountain|mountains|mt\.?|mount|lake|canyon|bluff|headland|cliff|plateau|mesa|dune|dunes|cirque|plate|bedrock|relief|horizontal|with)\b/.test(before) ||
        /\bat\s*$/.test(before) ||
        // Approximation tilde immediately preceding the number: "~1200 m".
        /~\s*$/.test(beforeRaw) ||
        // Parenthetical form: "(3,429 m)" after a proper noun → elevation.
        /\(\s*$/.test(beforeRaw) ||
        // Comma-introduced parenthetical: "White Mtn Peak, 4344 m".
        /,\s*$/.test(beforeRaw);

      // After-context: immediate vertical / dimensional neighbours.
      const afterHit =
        /^\s*(?:above|a\.?s\.?l\.?|elevation|altitude|of\s+elevation|asl\b|peaks?|summit|slope|ridge|plateau|escarpment|higher|lower|rise|rising|drop|depth|deep|high|tall|long|wide|thick|down|up|below|beneath|under|of\s+snow|of\s+annual|annually|of\s+snowfall|snowfall|snow|swells?|layer|range|thermal\s+belt|vertical\s+rise|crest|stack|of\s+relief|of\s+horizontal|relief|dunes?|bluffs?|horizontal|dunes|resolution|pixels?|bands?|vnir|swir|multispectral|thermal|imagery)\b/i.test(after) ||
        /^\s*[)\]]/.test(afterRaw) ||     // "(3429 m)" or "[3429 m]"
        /^\s*[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3}\s+(?:peaks?|crest|ridge|summit|plateau|escarpment|mountains|hills|range)\b/.test(afterRaw);

      const v = parseLooseNum(n);
      // Three- and four-digit figures are elevations in this corpus when they
      // lead a phrase ("— 1400 m in Sierra Vista", "a 2040 m Sierra Norte
      // town", "1474 m of sunshine") or follow an approximation word.
      // Not the second end of a range ("2000–3000 m") or a money figure.
      const rangeOrMoney = /\d\s*[\u2013\u2014-]\s*$|[$£€]\s*$/.test(beforeRaw);
      const bigNumberHit =
        v >= 300 && !rangeOrMoney &&
        (/^\s+(?:in|on|of|into|across|along)\b/i.test(afterRaw) || /(?:—|–|\bnear|\ba|\babout|\bsome|\broughly)\s*$/i.test(beforeRaw));
      const approxHit = /\b(?:offset\s+by\s+(?:about\s+)?|by\s+about|about|nearly|roughly|almost)\s*$/i.test(beforeRaw) && /^[\s]*[.,;]/.test(afterRaw);

      if (!beforeHit && !afterHit && !bigNumberHit && !approxHit) return match;

      return `${convertFigure(n, 3.28084, true)} ft`;
    }
  );

  // "a 8-inch snowpack" → "an 8-inch snowpack" after a conversion lands on an
  // eight, eleven or eighteen.
  text = text.replace(/\b([Aa]) (?=(?:8[\d,.]*|1[18](?:,\d{3})*)(?:-|\s))/g, (_m, a: string) => `${a}n `);

  return text;
}

/** Hook wrapper so components can use `const prose = useProse(); prose(str)`. */
export function useProse(): (s: string | null | undefined) => string {
  const { temp, dist } = useUnits();
  return useCallback((s) => localizeProse(s, temp, dist), [temp, dist]);
}
