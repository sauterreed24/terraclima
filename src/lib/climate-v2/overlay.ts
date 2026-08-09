/**
 * Overlay generated Climate V2 normals onto Place.climate for runtime use.
 * Keeps the Place.climate access shape stable for scoring/components.
 */

import type { ClimateProfile, Monthly12, Place } from "../../types";
import type { ClimateV2Overlay } from "../../data/generated/climate-v2";

function asMonthly(values: readonly number[] | undefined): Monthly12 | undefined {
  if (!values || values.length !== 12) return undefined;
  return [...values] as Monthly12;
}

export function climateProfileFromOverlay(record: ClimateV2Overlay): ClimateProfile {
  const c = record.climate;
  return {
    tempHighC: asMonthly(c.tempHighC)!,
    tempLowC: asMonthly(c.tempLowC)!,
    precipMm: asMonthly(c.precipMm)!,
    annualPrecipMm: c.annualPrecipMm,
    humidity: asMonthly(c.humidity),
    solarEnergyMjM2Day: asMonthly(c.solarEnergyMjM2Day),
    frostFreeDays: c.frostFreeDays,
    gdd10: c.gdd10,
    diurnalSummerC: c.diurnalSummerC,
    diurnalWinterC: c.diurnalWinterC,
    chillHours: c.chillHours ?? undefined,
    snowCm: asMonthly(c.snowCm),
  };
}

/**
 * Merge V2 core climate variables onto an authored place. Editorial fields
 * (hardinessZone, authored snowCm when V2 has none, risks, prose) remain.
 */
export function applyClimateV2Overlay(
  place: Place,
  record: ClimateV2Overlay | undefined,
): Place {
  if (!record) return place;
  const generated = climateProfileFromOverlay(record);
  const climate: ClimateProfile = {
    ...place.climate,
    ...generated,
    sunshinePct: undefined,
    hardinessZone: place.climate.hardinessZone,
    snowCm: generated.snowCm ?? place.climate.snowCm,
    chillHours:
      generated.chillHours != null
        ? generated.chillHours
        : place.climate.chillHours,
  };

  return {
    ...place,
    climate,
    climateDataConfidence: record.climateDataConfidence,
    editorialConfidence: place.editorialConfidence ?? place.confidence,
    confidence: place.editorialConfidence ?? place.confidence,
  };
}
