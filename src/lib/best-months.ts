/**
 * Derive planning-oriented "best months" windows for a Place from its
 * existing monthly climate signals — no new data required.
 *
 * This module is the single source of truth for month-window intelligence;
 * both the detail panel (full list) and the place card (top-1 chip) import
 * from here so there is no drift.
 */

import type { Place } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export interface BestWindow {
  /** Stable identifier — used as React key and for selective filtering. */
  id: "garden" | "outdoor" | "snow" | "dry" | "crisp" | "heat" | "cold";
  label: string;
  glyph: string;
  range: string;
  note?: string;
  /**
   * Positive windows (things you'd want the place for) get `kind: "good"`.
   * "Avoid if…" windows get `kind: "caution"`.
   */
  kind: "good" | "caution";
}

/**
 * Compute ordered windows. Positive windows first so the top-1 consumer
 * (PlaceCard) can safely just pick `windows.find(w => w.kind === "good")`.
 */
export function computeBestMonths(place: Place): BestWindow[] {
  const highs = place.climate.tempHighC;
  const lows = place.climate.tempLowC;
  const precip = place.climate.precipMm;
  const snow = place.climate.snowCm;
  const humidity = place.climate.humidity;

  const windows: BestWindow[] = [];

  const gardenMask = highs.map((h, i) => h >= 15 && h <= 28 && lows[i] >= 4);
  const gardenRange = formatMonthMask(gardenMask);
  if (gardenRange) {
    windows.push({
      id: "garden",
      kind: "good",
      label: "Gardening window",
      glyph: "\u{1F331}",
      range: gardenRange,
      note: "Mild highs, nights above frost — safe for most annual vegetables.",
    });
  }

  const meanPrecip = precip.reduce((a, b) => a + b, 0) / 12;
  const comfortMask = highs.map((h, i) => h >= 12 && h <= 25 && precip[i] <= meanPrecip * 1.1);
  const comfortRange = formatMonthMask(comfortMask);
  if (comfortRange) {
    windows.push({
      id: "outdoor",
      kind: "good",
      label: "Outdoor comfort",
      glyph: "\u{1F97E}",
      range: comfortRange,
      note: "Walkable temperatures with at-or-below-average rainfall.",
    });
  }

  if (snow) {
    const snowMask = snow.map(v => v >= 15);
    const snowRange = formatMonthMask(snowMask);
    if (snowRange) {
      windows.push({
        id: "snow",
        kind: "good",
        label: "Snow-on-ground window",
        glyph: "\u2744",
        range: snowRange,
        note: "Months with meaningful snow accumulation.",
      });
    }
  }

  const p33 = quantile(precip, 0.33);
  const dryMask = precip.map(v => v <= p33);
  const dryRange = formatMonthMask(dryMask);
  if (dryRange) {
    windows.push({
      id: "dry",
      kind: "good",
      label: "Dry travel window",
      glyph: "\u2600",
      range: dryRange,
      note: "Driest third of the year — best for road trips and photography.",
    });
  }

  if (humidity) {
    const crispMask = humidity.map((h, i) => h < 55 && highs[i] >= 10 && highs[i] <= 28);
    const crispRange = formatMonthMask(crispMask);
    if (crispRange) {
      windows.push({
        id: "crisp",
        kind: "good",
        label: "Crisp-air window",
        glyph: "\u{1F4A8}",
        range: crispRange,
        note: "Low humidity with comfortable temperatures.",
      });
    }
  }

  const heatMask = highs.map(h => h >= 32);
  const heatRange = formatMonthMask(heatMask);
  if (heatRange) {
    windows.push({
      id: "heat",
      kind: "caution",
      label: "Avoid if heat-sensitive",
      glyph: "\u{1F525}",
      range: heatRange,
      note: "Typical daily highs above 32°C / 90°F.",
    });
  }

  const coldMask = lows.map(l => l <= -10);
  const coldRange = formatMonthMask(coldMask);
  if (coldRange) {
    windows.push({
      id: "cold",
      kind: "caution",
      label: "Deep-cold window",
      glyph: "\u{1F9CA}",
      range: coldRange,
      note: "Overnight lows commonly below \u221210°C / 14°F.",
    });
  }

  return windows;
}

function quantile(arr: readonly number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Format a 12-length boolean mask as human-readable month ranges, handling
 * December → January wraparound (e.g. `Nov\u2013Feb` instead of
 * `Jan\u2013Feb, Nov\u2013Dec`).
 */
export function formatMonthMask(mask: readonly boolean[]): string | null {
  const trueCount = mask.filter(Boolean).length;
  if (trueCount === 0) return null;
  if (trueCount === 12) return "Year-round";

  const segments: Array<[number, number]> = [];
  let start = -1;
  for (let i = 0; i < 12; i++) {
    if (mask[i] && start === -1) start = i;
    if (!mask[i] && start !== -1) {
      segments.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) segments.push([start, 11]);

  // Wrap Dec→Jan if the year starts and ends "on".
  if (segments.length >= 2 && segments[0][0] === 0 && segments[segments.length - 1][1] === 11) {
    const first = segments.shift()!;
    const last = segments.pop()!;
    segments.push([last[0], first[1] + 12]);
  }

  return segments
    .map(([a, b]) => {
      const ma = MONTHS[a % 12];
      const mb = MONTHS[b % 12];
      return a === b ? ma : `${ma}\u2013${mb}`;
    })
    .join(", ");
}
