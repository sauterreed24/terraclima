import type { Place } from "../types";
import { meanAnnualHumidityPct, meanAnnualSunshinePct } from "./climate-metrics";

/**
 * Mean percent of possible sunshine from the authored monthly series.
 * Returns null when only Daymet solar energy is present — that series is
 * not observed sunshine hours, so it is never shown as a measured figure; where
 * a figure is needed anyway (Compare), it appears as a marked estimate.
 */
export function observedSunshinePct(place: Place): number | null {
  const sun = place.climate.sunshinePct;
  if (!sun || sun.length !== 12) return null;
  const mean = sun.reduce((sum, value) => sum + value, 0) / sun.length;
  if (!Number.isFinite(mean) || mean < 0) return null;
  return Math.round(mean);
}

/** True when the place has a sky series for evidence — authored sunshine or Daymet solar. */
export function hasSourcedSkySeries(place: Place): boolean {
  return observedSunshinePct(place) != null
    || place.climate.solarEnergyMjM2Day?.length === 12;
}

/**
 * Compare sunshine cell — percent of possible, never solar MJ. Where no station
 * records sunshine, the estimate from solar energy that the "Sunniest winters"
 * ranking and the exports use, marked as approximate ("~74% est."; mean error
 * against station records ≈ 9 points).
 */
export function sunshineDisplayValue(place: Place): string {
  const pct = observedSunshinePct(place);
  if (pct != null) return `${pct}%`;
  const estimate = meanAnnualSunshinePct(place);
  return estimate == null ? "no data" : `~${Math.round(estimate)}% est.`;
}

export function precipHeroLabel(place: Place): string {
  const snow = place.climate.snowCm;
  const annualSnowCm = snow?.reduce((sum, value) => sum + value, 0) ?? 0;
  return annualSnowCm >= 25 ? "Rain & snow" : "Yearly rain";
}

export type HeroFourthKind = "sunshine" | "humidity" | "frost-free" | "hardiness" | "biome";

export interface HeroFourthStat {
  kind: HeroFourthKind;
  label: string;
  value: string;
  hint: string;
}

function humidityStat(humidity: number): HeroFourthStat {
  const rounded = Math.round(humidity);
  const feel = rounded <= 42 ? "dry" : rounded >= 72 ? "humid" : "moderate";
  return {
    kind: "humidity",
    label: "Humidity",
    value: `${rounded}%`,
    hint: `Average relative humidity over the year (${feel} air).`,
  };
}

function growingSeasonStat(days: number): HeroFourthStat {
  return {
    kind: "frost-free",
    label: "Growing season",
    value: `${Math.round(days)} days`,
    hint: "Approximate frost-free days in a typical year: the season for growing outdoors.",
  };
}

/** Fourth first-page climate number — something a visitor can feel. */
export function fourthHeroStat(place: Place): HeroFourthStat {
  const sunshinePct = observedSunshinePct(place);
  if (sunshinePct != null) {
    return {
      kind: "sunshine",
      label: "Sunshine",
      value: `${sunshinePct}%`,
      hint: "Share of daylight hours with sun, over the year. It is not a count of cloudless days.",
    };
  }

  const humidity = meanAnnualHumidityPct(place);
  const distinctiveHumidity = humidity != null && (humidity <= 42 || humidity >= 78);
  if (distinctiveHumidity && humidity != null) {
    return humidityStat(humidity);
  }

  if (place.climate.frostFreeDays != null) {
    return growingSeasonStat(place.climate.frostFreeDays);
  }

  if (humidity != null) {
    return humidityStat(humidity);
  }

  if (place.climate.hardinessZone) {
    return {
      kind: "hardiness",
      label: "Hardiness",
      value: place.climate.hardinessZone,
      hint: "USDA or Canadian-equivalent hardiness zone.",
    };
  }

  return {
    kind: "biome",
    label: "Biome",
    value: place.biome.split(" / ")[0] ?? place.biome,
    hint: "The natural vegetation this climate supports.",
  };
}
