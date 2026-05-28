/**
 * Pure synthesis of "numbers together" lines + top risks for the dossier.
 *
 * The "How the numbers read together" section in the place detail panel
 * stitches together a few headline climate signals — annual thermal span,
 * wettest/driest month with ratio, comfort-window months, optional
 * humidity regime, optional snow-active months — and a short ranked list
 * of the top risk categories for the place. The math is deterministic and
 * pure: no React, no state, no I/O. Extracted from PlaceDetail.tsx so the
 * dossier component file shrinks and the helper gains its own test
 * coverage.
 */
import type { Place } from "../types";
import { fmtDelta, fmtPrecipSmall, fmtTemp, type DistUnit, type TempUnit } from "./units";

export const PLACE_SIGNALS_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const RISK_SCORE: Record<string, number> = {
  "very-low": 0,
  "low": 1,
  "moderate": 2,
  "elevated": 3,
  "high": 4,
  "very-high": 5,
};

const RISK_LABEL: Record<string, string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal",
};

export interface PlaceSignal {
  label: string;
  value: string;
}

export interface PlaceSignalsResult {
  lines: PlaceSignal[];
  topRisks: string[];
}

export function synthesizePlaceSignals(
  place: Place,
  temp: TempUnit,
  dist: DistUnit,
): PlaceSignalsResult {
  const highs = place.climate.tempHighC;
  const lows = place.climate.tempLowC;
  const precip = place.climate.precipMm;
  const snow = place.climate.snowCm;

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const annualSpan = maxHigh - minLow;

  const wetIdx = precip.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
  const dryIdx = precip.reduce((best, v, i, arr) => (v < arr[best] ? i : best), 0);
  const wet = precip[wetIdx];
  const dry = precip[dryIdx];
  const wetDryRatio = dry <= 0.1 ? "∞" : `${(wet / dry).toFixed(1)}×`;

  const comfortMonths = highs.filter(h => h >= 12 && h <= 28).length;

  const lines: PlaceSignal[] = [
    {
      label: "Annual thermal span",
      value: `${fmtTemp(minLow, temp)} to ${fmtTemp(maxHigh, temp)} (${fmtDelta(annualSpan, temp, { signed: false })})`,
    },
    {
      label: "Wettest / driest month",
      value: `${PLACE_SIGNALS_MONTHS[wetIdx]} ${fmtPrecipSmall(wet, dist)} · ${PLACE_SIGNALS_MONTHS[dryIdx]} ${fmtPrecipSmall(dry, dist)} (${wetDryRatio})`,
    },
    {
      label: temp === "F"
        ? "Comfort-window months (54–82°F highs)"
        : "Comfort-window months (12–28°C highs)",
      value: `${comfortMonths} / 12`,
    },
  ];

  if (place.climate.humidity) {
    const h = place.climate.humidity;
    const summerAvg = (h[5] + h[6] + h[7]) / 3;
    const winterAvg = (h[11] + h[0] + h[1]) / 3;
    lines.push({
      label: "Humidity regime",
      value: `Summer ${Math.round(summerAvg)}% · Winter ${Math.round(winterAvg)}%`,
    });
  }

  if (snow) {
    const snowMonths = snow.filter(v => v > 0.5).length;
    lines.push({
      label: "Snow-active months",
      value: `${snowMonths} / 12`,
    });
  }

  const topRisks = Object.entries(place.risks)
    .map(([k, v]) => ({ key: k, level: v.level, score: RISK_SCORE[v.level] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score >= 3)
    .slice(0, 3)
    .map(r => `${RISK_LABEL[r.key] ?? r.key} · ${r.level}`);

  return { lines, topRisks };
}
