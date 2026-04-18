import { createContext, useContext, useState, useEffect } from "react";
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

const STORAGE_KEY = "terraclima.units.v1";

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

export function UnitProvider({ children }: { children: ReactNode }) {
  const [temp, setTempRaw] = useState<TempUnit>("F");
  const [dist, setDistRaw] = useState<DistUnit>("imperial");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { temp?: TempUnit; dist?: DistUnit };
        if (parsed.temp === "F" || parsed.temp === "C") setTempRaw(parsed.temp);
        if (parsed.dist === "imperial" || parsed.dist === "metric") setDistRaw(parsed.dist);
      }
    } catch { /* noop */ }
  }, []);

  const setTemp = (t: TempUnit) => {
    setTempRaw(t);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ temp: t, dist })); } catch { /* noop */ }
  };
  const setDist = (d: DistUnit) => {
    setDistRaw(d);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ temp, dist: d })); } catch { /* noop */ }
  };
  const toggle = () => setTemp(temp === "F" ? "C" : "F");

  const value: UnitState = { temp, dist, setTemp, setDist, toggle };
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

/** Format a temperature in °C to the user's preferred unit. */
export function fmtTemp(celsius: number | null | undefined, unit: TempUnit, opts?: { digits?: number; unit_symbol?: boolean }): string {
  if (celsius == null || !isFinite(celsius)) return "—";
  const digits = opts?.digits ?? 0;
  const suffix = opts?.unit_symbol !== false ? `°${unit}` : "°";
  const v = unit === "F" ? cToF(celsius) : celsius;
  return `${v.toFixed(digits)}${suffix}`;
}

/** Format a temperature delta (Δ°C). Fahrenheit deltas use the 9/5 ratio only. */
export function fmtDelta(deltaC: number, unit: TempUnit, opts?: { digits?: number; signed?: boolean }): string {
  const digits = opts?.digits ?? 1;
  const v = unit === "F" ? (deltaC * 9) / 5 : deltaC;
  const sign = opts?.signed !== false && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}°${unit}`;
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
const DELTA_AFTER_PAT = /\b(warmer|cooler|colder|hotter|higher|lower|wider|narrower|stronger|weaker|apart|bigger|smaller|greater|above|below)\b/;
const DELTA_BEFORE_PAT = /\b(by|of|spike[sd]?|swing of|range of|spread of|delta|differential|diurnal|amplitude|gradient|shift(?:ed|s)? (?:of|by)|lift(?:ed|s)? (?:of|by)|drop(?:ped|s)? (?:of|by)|rise(?:s)? (?:of|by)|fall(?:s)? (?:of|by)|jump(?:s|ed)? (?:of|by)|climb(?:s|ed)? (?:of|by)|plunge(?:s|d)? (?:of|by)|lift|strip(?:s|ped)?|boost(?:s|ed)? (?:by|of)|warm(?:s|ed|ing)? (?:by|up by)|cool(?:s|ed|ing)? (?:by|down by)|moderat\w+ (?:by)|up to|down to|averag(?:es|ing)? (?:\d+°?\s*[CF] )?(?:warmer|cooler|colder))\s*$/;

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

/** Decide whether a temperature token at `idx` is a delta (vs. absolute). */
function isDeltaContext(text: string, idx: number, len: number): boolean {
  // Narrow, clause-local windows.
  const before = beforeClauseWindow(text, idx, 40);
  const after = afterClauseWindow(text, idx + len, 24);
  if (DELTA_AFTER_PAT.test(after)) return true;
  if (DELTA_BEFORE_PAT.test(before)) return true;
  // Explicit phrasings commonly used for deltas — allow scanning both
  // windows jointly because these phrases are unambiguous.
  if (/\b(thermal window|annual range|annual swing|daily range|diurnal swing|temperature (?:range|difference|spread|gap|swing))\b/.test(before + " " + after)) return true;
  return false;
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
 *   - "1,500 mm" → "59 in"
 *   - "80 cm"   → "31 in"
 *   - "10 km"   → "6 mi"
 *   - "25 km/h" / "25 kph" → "16 mph"
 *
 * No-op for temperatures when the user prefers Celsius, and no-op for
 * distances when the user prefers metric.
 */
export function localizeProse(text: string | null | undefined, unit: TempUnit, dist: DistUnit = "imperial"): string {
  if (!text) return "";

  // --- Temperature (°C → °F) ---
  if (unit === "F") {
    // Pass 1: dash ranges first (consumes both numbers)
    const rangePat = /([\u2212\-+]?\d+(?:\.\d+)?)\s*([\u2013\u2014\-])\s*([\u2212\-+]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(rangePat, (match, n1: string, dash: string, n2: string, offset: number, full: string) => {
      const v1 = parseSigned(n1);
      const v2 = parseSigned(n2);
      const delta = isDeltaContext(full, offset, match.length) || n1.startsWith("+") || n2.startsWith("+");
      const f1 = delta ? (v1 * 9) / 5 : cToF(v1);
      const f2 = delta ? (v2 * 9) / 5 : cToF(v2);
      return `${formatLocalized(f1, n1.startsWith("+"))}${dash}${formatLocalized(f2, n2.startsWith("+"))}°F`;
    });

    // Pass 2: "N to M °C"
    const toPat = /([\u2212\-+]?\d+(?:\.\d+)?)\s+to\s+([\u2212\-+]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(toPat, (match, n1: string, n2: string, offset: number, full: string) => {
      const v1 = parseSigned(n1);
      const v2 = parseSigned(n2);
      const delta = isDeltaContext(full, offset, match.length) || n1.startsWith("+") || n2.startsWith("+");
      const f1 = delta ? (v1 * 9) / 5 : cToF(v1);
      const f2 = delta ? (v2 * 9) / 5 : cToF(v2);
      return `${formatLocalized(f1, n1.startsWith("+"))} to ${formatLocalized(f2, n2.startsWith("+"))}°F`;
    });

    // Pass 3: single values
    const singlePat = /([\u2212\-+]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
    text = text.replace(singlePat, (match, n: string, offset: number, full: string) => {
      const v = parseSigned(n);
      const delta = isDeltaContext(full, offset, match.length) || n.startsWith("+");
      const f = delta ? (v * 9) / 5 : cToF(v);
      return `${formatLocalized(f, n.startsWith("+"))}°F`;
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
    (_m, n: string, qual: string) => {
      const ft = parseLooseNum(n) * 3.28084;
      return `${formatUSNumber(ft)}-foot-${qual.toLowerCase()}`;
    }
  );
  // N-metre[s] (no trailing qualifier) as adjectival: "4,200-meter summit"
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*met(?:er|re)s?\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => {
      const ft = parseLooseNum(n) * 3.28084;
      return `${formatUSNumber(ft)}-foot`;
    }
  );

  // N-kilometre[s]- / N-km- → N-mile-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:kilomet(?:er|re)s?|km)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => {
      const mi = parseLooseNum(n) * 0.621371;
      return `${formatUSNumber(mi, mi < 10 ? 1 : 0)}-mile-${qual.toLowerCase()}`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:kilomet(?:er|re)s?|km)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => {
      const mi = parseLooseNum(n) * 0.621371;
      return `${formatUSNumber(mi, mi < 10 ? 1 : 0)}-mile`;
    }
  );

  // N-centimetre[s]- / N-cm- → N-inch-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:centimet(?:er|re)s?|cm)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => {
      const inches = parseLooseNum(n) / 2.54;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)}-inch-${qual.toLowerCase()}`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:centimet(?:er|re)s?|cm)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => {
      const inches = parseLooseNum(n) / 2.54;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)}-inch`;
    }
  );

  // N-millimetre[s]- / N-mm- → N-inch-
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:millimet(?:er|re)s?|mm)\s*-\s*(high|tall|deep|long|wide|thick)\b/gi,
    (_m, n: string, qual: string) => {
      const inches = parseLooseNum(n) / 25.4;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)}-inch-${qual.toLowerCase()}`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*(?:millimet(?:er|re)s?|mm)\b(?!\s*-\s*(?:high|tall|deep|long|wide|thick))/gi,
    (_m, n: string) => {
      const inches = parseLooseNum(n) / 25.4;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)}-inch`;
    }
  );

  // Spelled-out non-hyphenated metric units. These come before the bare-symbol
  // passes so we consume the entire phrase ("980 meters" stays a single match
  // instead of matching "980 m" and orphaning "eters").
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s+met(?:er|re)s?\b/gi,
    (_m, n: string) => {
      const ft = parseLooseNum(n) * 3.28084;
      return `${formatUSNumber(ft)} feet`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s+kilomet(?:er|re)s?\b/gi,
    (_m, n: string) => {
      const mi = parseLooseNum(n) * 0.621371;
      return `${formatUSNumber(mi, mi < 10 ? 1 : 0)} miles`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s+centimet(?:er|re)s?\b/gi,
    (_m, n: string) => {
      const inches = parseLooseNum(n) / 2.54;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)} inches`;
    }
  );
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s+millimet(?:er|re)s?\b/gi,
    (_m, n: string) => {
      const inches = parseLooseNum(n) / 25.4;
      return `${formatUSNumber(inches, inches < 10 ? 1 : 0)} inches`;
    }
  );

  // km/h or kph → mph (do this FIRST so bare "km" doesn't eat the "km" of "km/h")
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*(?:km\/h|kph|km\s*\/\s*h)\b/gi, (_m, n: string) => {
    const v = parseLooseNum(n);
    return `${formatUSNumber(v * 0.621371, v < 10 ? 1 : 0)} mph`;
  });

  // Bare "N km" (word-bounded, not immediately followed by "/" as in km/h which
  // is already handled above).
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*km\b(?!\/)/g, (_m, n: string) => {
    const v = parseLooseNum(n);
    const mi = v * 0.621371;
    return `${formatUSNumber(mi, mi < 10 ? 1 : 0)} mi`;
  });

  // "N mm" — millimetres of precip in this corpus. \b already prevents matching
  // mid-word (e.g. "mm-level" still has \b before the "-"), and any compound
  // unit like "mmHg" can't match because "m" directly followed by "H" isn't a
  // \b-terminated token boundary break we'd be looking at. We block only
  // directly adjacent letters.
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*mm\b(?![a-zA-Z])/g, (_m, n: string) => {
    const v = parseLooseNum(n);
    const inches = v / 25.4;
    return `${formatUSNumber(inches, inches < 10 ? 1 : 0)} in`;
  });

  // "N cm" — snow / depth contexts in this corpus.
  text = text.replace(/(\d+(?:[,.]\d+)?)\s*cm\b(?![a-zA-Z])/g, (_m, n: string) => {
    const v = parseLooseNum(n);
    const inches = v / 2.54;
    return `${formatUSNumber(inches, inches < 10 ? 1 : 0)} in`;
  });

  // Metre ranges "N–M m" / "N-M m" / "N to M m" — used for stratus layers,
  // elevation bands ("homes at 700–900 m"), etc. Run BEFORE the bare-m
  // handler so we consume both numbers as a range.
  text = text.replace(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*([\u2013\u2014\-]|to)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*m\b(?![\/²^])/g,
    (match, n1: string, sep: string, n2: string, offset: number, full: string) => {
      const before = full.substring(Math.max(0, offset - 80), offset).toLowerCase();
      const after = full.substring(offset + match.length, offset + match.length + 64).toLowerCase();
      const elevationy =
        /\b(at|to|above|over|elevation|altitude|homes?|stratus|layer|depth|rise|rising|drop|peak|peaks|crest|ridge|summit|plateau|capping|band)\b/.test(before) ||
        /\b(stratus|layer|peaks?|crest|ridge|summit|plateau|depth|rise|rising|drop|higher|lower|snow|snowfall|annually|elevation|altitude|band|belt)\b/.test(after);
      if (!elevationy) return match;
      const v1 = parseLooseNum(n1);
      const v2 = parseLooseNum(n2);
      const ft1 = v1 * 3.28084;
      const ft2 = v2 * 3.28084;
      return `${formatUSNumber(ft1)}${sep === "to" ? " to " : sep}${formatUSNumber(ft2)} ft`;
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
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*m\b(?![\/²^])/g,
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
        /\b(?:elevation|altitude|sits\s+(?:at|above|on)|perch(?:es|ed)?\s+at|situated\s+at|lies\s+at|located\s+at|rests\s+at|nestled\s+at|grassland\s+at|town\s+(?:at|of)|city\s+(?:at|of)|capital\s+at|town\s+of\s+\w+\s+at|at\s+nearly|at\s+roughly|at\s+about|from|to|above|over|approaches?|averag(?:es|ing)?|rises?|rising|peaks?|summit|crest|ridge|plateau|m\.a\.s\.l\.|asl|meters?|metres?|higher\s+than|lower\s+than|tall|climbs?|drops?\s+(?:to|of)?|floor\s+of|basin|slopes?\s+(?:up|down)?\s*to|pass|saddle|crater|caldera|uplift|escarpment|up\s+to|storms?\s+of|swells?\s+of|layer|stratus|permafrost|kilometer|kilometre|km|volcano|volcan|mountain|mountains|mt\.?|mount|lake|canyon|bluff|headland|cliff|plateau|mesa|dune|dunes|cirque|plate|bedrock)\b/.test(before) ||
        /\bat\s*$/.test(before) ||
        // Approximation tilde immediately preceding the number: "~1200 m".
        /~\s*$/.test(beforeRaw) ||
        // Parenthetical form: "(3,429 m)" after a proper noun → elevation.
        /\(\s*$/.test(beforeRaw) ||
        // Comma-introduced parenthetical: "White Mtn Peak, 4344 m".
        /,\s*$/.test(beforeRaw);

      // After-context: immediate vertical / dimensional neighbours.
      const afterHit =
        /^\s*(?:above|a\.?s\.?l\.?|elevation|altitude|of\s+elevation|asl\b|peaks?|summit|slope|ridge|plateau|escarpment|higher|lower|rise|rising|drop|depth|deep|high|tall|long|wide|thick|down|up|of\s+snow|of\s+annual|annually|of\s+snowfall|snowfall|snow|swells?|layer|range|thermal\s+belt|vertical\s+rise|crest|stack)\b/i.test(after) ||
        /^\s*[\)\]]/.test(afterRaw) ||     // "(3429 m)" or "[3429 m]"
        /^\s*[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3}\s+(?:peaks?|crest|ridge|summit|plateau|escarpment|mountains|hills|range)\b/.test(afterRaw);

      if (!beforeHit && !afterHit) return match;

      const v = parseLooseNum(n);
      const ft = v * 3.28084;
      return `${formatUSNumber(ft)} ft`;
    }
  );

  return text;
}

/** Hook wrapper so components can use `const prose = useProse(); prose(str)`. */
export function useProse(): (s: string | null | undefined) => string {
  const { temp, dist } = useUnits();
  return (s) => localizeProse(s, temp, dist);
}
