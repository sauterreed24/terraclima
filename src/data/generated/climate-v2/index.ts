/* AUTO-GENERATED — Climate Data V2. Do not edit. */
import type { Confidence, Monthly12 } from "../../../types";
import type {
  ClimateDataConfidence,
  ClimateEnsembleDelta,
  ClimatePlaceRecordV2,
  ClimateProjectionEnsemble,
  ClimateValidationStatus,
} from "../../../lib/climate-v2/contracts";
import overlayJson from "./overlay.json";

export const CLIMATE_V2_GENERATED_AT = "2026-08-09";
export const CLIMATE_V2_DATA_THROUGH_YEAR = 2025 as const;

export interface ClimateV2OverlayClimate {
  tempHighC: Monthly12;
  tempLowC: Monthly12;
  precipMm: Monthly12;
  annualPrecipMm: number;
  humidity?: Monthly12;
  solarEnergyMjM2Day?: Monthly12;
  frostFreeDays?: number;
  gdd10?: number;
  diurnalSummerC?: number;
  diurnalWinterC?: number;
  chillHours?: number | null;
  snowCm?: Monthly12;
}

export interface ClimateV2Overlay {
  placeId: string;
  climateDataConfidence: ClimateDataConfidence;
  validationStatus: ClimateValidationStatus;
  gridElevationM: number;
  elevationDeltaM: number;
  recentShift: {
    jjaHighDeltaC: number;
    janLowDeltaC: number;
    annualPrecipDeltaPct: number;
  };
  climate: ClimateV2OverlayClimate;
  projectionStatus: "ok" | "unavailable";
  projection?: ClimateProjectionEnsemble;
}

export const CLIMATE_V2_OVERLAY_BY_ID: Record<string, ClimateV2Overlay> = Object.fromEntries(
  (overlayJson as unknown as ClimateV2Overlay[]).map(r => [r.placeId, r]),
);

export const CLIMATE_V2_PLACE_IDS: readonly string[] = Object.keys(CLIMATE_V2_OVERLAY_BY_ID);

/** Eager compact overlay used during corpus assembly. */
export function getClimateV2Overlay(placeId: string): ClimateV2Overlay | undefined {
  return CLIMATE_V2_OVERLAY_BY_ID[placeId];
}

let _fullById: Record<string, ClimatePlaceRecordV2> | null = null;

/** Lazy full provenance records (evidence / methodology). */
export async function loadClimateV2Records(): Promise<Record<string, ClimatePlaceRecordV2>> {
  if (_fullById) return _fullById;
  const mod = await import("./records.json");
  const list = (mod.default ?? mod) as unknown as ClimatePlaceRecordV2[];
  _fullById = Object.fromEntries(list.map(r => [r.placeId, r]));
  return _fullById;
}

export function getClimateV2(placeId: string): ClimatePlaceRecordV2 | undefined {
  return _fullById?.[placeId];
}

/** @deprecated Use CLIMATE_V2_OVERLAY_BY_ID for eager paths. */
export const CLIMATE_V2_BY_ID: Record<string, ClimatePlaceRecordV2> = new Proxy(
  {} as Record<string, ClimatePlaceRecordV2>,
  {
    get(_t, prop: string) {
      if (!_fullById) return undefined;
      return _fullById[prop];
    },
  },
);

// Keep Confidence / ClimateEnsembleDelta referenced for declaration emit stability.
export type _ClimateV2TypeAnchors = Confidence | ClimateEnsembleDelta;
