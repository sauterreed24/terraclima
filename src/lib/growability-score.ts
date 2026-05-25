import type { Place, RiskLevel } from "../types";
import { computeBioclim, type BioclimIndex } from "./bioclim";

export interface GrowabilityRationale {
  lines: readonly string[];
}

function hasBioclimValue(index: BioclimIndex): index is Extract<BioclimIndex, { value: number }> {
  return index.value !== null;
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatRiskLevel(level: RiskLevel): string {
  return level.replace("-", " ");
}

function compactList(items: readonly string[], count: number): string {
  if (items.length === 0) return "none listed";
  return items.slice(0, count).join(", ");
}

function textSignals(place: Place): string {
  return [
    place.soil.notes,
    place.growability.orchard,
    place.growability.homeGarden,
    ...place.growability.growsWell,
    ...place.growability.tricky,
  ].filter(Boolean).join(" ").toLowerCase();
}

function mentionsWaterAccess(place: Place): boolean {
  return /\b(irrigat|water|drought|dry|non-irrigated|xeric|drip|salinity|saline)\b/.test(textSignals(place));
}

function hasStrongDroughtPressure(place: Place): boolean {
  return place.risks.drought.level === "high" || place.risks.drought.level === "very-high";
}

function buildWaterStressLine(place: Place, selianinov: BioclimIndex): string | null {
  const signals: string[] = [];
  if (hasBioclimValue(selianinov) && selianinov.value < 0.7) {
    signals.push(`Selianinov HTC ${formatNumber(selianinov.value, 2)}`);
  }
  if (hasStrongDroughtPressure(place)) {
    signals.push(`${formatRiskLevel(place.risks.drought.level)} drought risk`);
  }
  if (place.risks.drought.trend === "worsening") {
    signals.push("worsening drought trend");
  }
  if (place.soil.waterHolding === "low") {
    signals.push("low soil water holding");
  }
  if (mentionsWaterAccess(place)) {
    signals.push("crop or soil notes flag water access");
  }

  if (signals.length === 0) return null;
  return `Water access is the limiting check: ${signals.slice(0, 3).join(", ")}; read irrigation, soil storage, and drought trend alongside the score.`;
}

function buildSeasonLine(place: Place): string {
  const frost = place.climate.frostFreeDays;
  const gdd = place.climate.gdd10;
  const hardiness = place.climate.hardinessZone ?? place.growability.hardinessZone;
  const seasonParts: string[] = [];

  if (frost != null) seasonParts.push(`${formatNumber(frost)} frost-free days`);
  if (gdd != null) seasonParts.push(`GDD10 ${formatNumber(gdd)}`);
  if (hardiness) seasonParts.push(`zone ${hardiness}`);

  if (seasonParts.length === 0) {
    return "Season length is not separately quantified here, so crop fit carries the practical screen.";
  }

  const isShortSeason = (frost != null && frost < 120) || (gdd != null && gdd < 900);
  const lead = isShortSeason ? "Season length caps the score" : "Season support comes from";
  return `${lead}: ${seasonParts.join(", ")}.`;
}

function buildCropFitLine(place: Place): string {
  const well = compactList(place.growability.growsWell, 3);
  const tricky = compactList(place.growability.tricky, 2);
  return `Crop fit keeps it practical: best fits include ${well}; trickier choices include ${tricky}.`;
}

export function buildGrowabilityRationale(place: Place): GrowabilityRationale {
  const bio = computeBioclim(place);
  if (!bio) {
    return {
      lines: [
        `The ${place.growability.score}/100 score is based on existing climate, soil, frost, and crop-fit fields; the computed bioclim suite is unavailable for this record.`,
        buildSeasonLine(place),
        buildCropFitLine(place),
      ],
    };
  }

  const petMm = Math.round(bio.thornthwaitePet.value);
  const baseLine = hasBioclimValue(bio.selianinov)
    ? `Bioclim basis: Selianinov HTC ${formatNumber(bio.selianinov.value, 2)} (${bio.selianinov.classLabel}) and Thornthwaite PET ${formatNumber(petMm)} mm/yr frame this ${place.growability.score}/100 score.`
    : `Bioclim basis: Selianinov HTC is undefined because no month clears the GDD10 growing-season threshold; Thornthwaite PET is ${formatNumber(petMm)} mm/yr.`;

  const middleLine = hasBioclimValue(bio.selianinov)
    ? buildWaterStressLine(place, bio.selianinov) ?? buildSeasonLine(place)
    : `With the active growing-season moisture index undefined, the read leans on frost limits, GDD10, hardiness, and what the crop list can realistically support.`;

  return {
    lines: [baseLine, middleLine, buildCropFitLine(place)],
  };
}
