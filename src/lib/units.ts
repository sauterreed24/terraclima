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
 * Word-boundary regex patterns that, when found within ~48 chars of a
 * temperature literal, mark that literal as a DELTA / difference rather
 * than an absolute reading. Tight word boundaries prevent false positives
 * like "windchills" triggering on "chill", or "continentality" on "tall".
 */
const DELTA_AFTER_PAT = /\b(warmer|cooler|colder|hotter|higher|lower|wider|narrower|stronger|weaker|apart|bigger|smaller|greater|above|below)\b/;
const DELTA_BEFORE_PAT = /\b(by|of|spike[sd]?|swing of|range of|spread of|delta|differential|diurnal|amplitude|gradient|shift(?:ed|s)? (?:of|by)|lift(?:ed|s)? (?:of|by)|drop(?:ped|s)? (?:of|by)|rise(?:s)? (?:of|by)|fall(?:s)? (?:of|by)|jump(?:s|ed)? (?:of|by)|climb(?:s|ed)? (?:of|by)|plunge(?:s|d)? (?:of|by)|lift|strip(?:s|ped)?|boost(?:s|ed)? (?:by|of)|warm(?:s|ed|ing)? (?:by|up by)|cool(?:s|ed|ing)? (?:by|down by)|moderat\w+ (?:by)|up to|down to|averag(?:es|ing)? (?:\d+°?\s*[CF] )?(?:warmer|cooler|colder))\s*$/;

/** Decide whether a temperature token at `idx` is a delta (vs. absolute). */
function isDeltaContext(text: string, idx: number, len: number): boolean {
  const before = text.substring(Math.max(0, idx - 48), idx).toLowerCase();
  const after = text.substring(idx + len, idx + len + 48).toLowerCase();
  if (DELTA_AFTER_PAT.test(after)) return true;
  if (DELTA_BEFORE_PAT.test(before)) return true;
  // Explicit phrasings commonly used for deltas
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
 * No-op when the user prefers Celsius.
 */
export function localizeProse(text: string | null | undefined, unit: TempUnit): string {
  if (!text) return "";
  if (unit === "C") return text;

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

  // Pass 4: bare mm/km in prose — only when user is imperial
  // (We only touch common editorial tokens to avoid mangling IDs or numbers.)
  return text;
}

/** Hook wrapper so components can use `const prose = useProse(); prose(str)`. */
export function useProse(): (s: string | null | undefined) => string {
  const { temp } = useUnits();
  return (s) => localizeProse(s, temp);
}
