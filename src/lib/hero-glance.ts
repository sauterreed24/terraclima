import type { Place } from "../types";
import { meanAnnualHumidityPct } from "./climate-metrics";

/**
 * Station-style sunny-day estimate from percent of possible sunshine.
 * Returns null when only Daymet solar energy is present — that series is
 * not observed sunshine hours and must not be relabeled as sunny days.
 */
export function observedSunnyDaysPerYear(place: Place): number | null {
  const sun = place.climate.sunshinePct;
  if (!sun || sun.length !== 12) return null;
  const mean = sun.reduce((sum, value) => sum + value, 0) / sun.length;
  if (!Number.isFinite(mean) || mean < 0) return null;
  return Math.round((mean / 100) * 365);
}

export function precipHeroLabel(place: Place): string {
  const snow = place.climate.snowCm;
  const annualSnowCm = snow?.reduce((sum, value) => sum + value, 0) ?? 0;
  return annualSnowCm >= 25 ? "Rain & snow" : "Yearly rain";
}

export type HeroFourthKind = "sunny-days" | "humidity" | "frost-free" | "hardiness" | "biome";

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
    hint: `Mean relative humidity across the year (${feel} air).`,
  };
}

function growingSeasonStat(days: number): HeroFourthStat {
  return {
    kind: "frost-free",
    label: "Growing season",
    value: `${Math.round(days)} days`,
    hint: "Approximate frost-free days in a typical year — the outdoor growing window.",
  };
}

/** Fourth first-page climate number — something a visitor can feel. */
export function fourthHeroStat(place: Place): HeroFourthStat {
  const sunnyDays = observedSunnyDaysPerYear(place);
  if (sunnyDays != null) {
    return {
      kind: "sunny-days",
      label: "Sunny days",
      value: `${sunnyDays} days`,
      hint: "Estimated from percent of possible sunshine across the year — how often the sky actually opens up.",
    };
  }

  const humidity = meanAnnualHumidityPct(place);
  const distinctiveHumidity = humidity != null && (humidity <= 42 || humidity >= 72);
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
    hint: "Plant community that this climate actually supports.",
  };
}
