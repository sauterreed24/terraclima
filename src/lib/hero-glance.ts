import type { Place } from "../types";
import { meanAnnualHumidityPct } from "./climate-metrics";

/**
 * Mean percent of possible sunshine from the authored monthly series.
 * Returns null when only Daymet solar energy is present — that series is
 * not observed sunshine hours and must not be shown as sky brightness.
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

/** First-page / Compare sunshine cell — percent of possible, never solar MJ. */
export function sunshineDisplayValue(place: Place): string {
  const pct = observedSunshinePct(place);
  return pct == null ? "not sourced" : `${pct}%`;
}

export function precipHeroLabel(place: Place): string {
  const snow = place.climate.snowCm;
  // Missing snowfall observations do not establish that precipitation is rain.
  if (!snow) return "Precipitation";
  return snow.some(value => value > 0) ? "Rain & snow" : "Yearly rain";
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
  const sunshinePct = observedSunshinePct(place);
  if (sunshinePct != null) {
    return {
      kind: "sunshine",
      label: "Sunshine",
      value: `${sunshinePct}%`,
      hint: "Percent of possible sunshine across the year — how often the sky actually opens up, not a count of cloudless calendar days.",
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
