/**
 * Climate Data V2 internal contracts.
 *
 * Public Place.climate keeps a stable monthly access shape for scoring/UI.
 * Provenance, period, validation, and source refs live alongside generated
 * records and are exposed through evidence / methodology surfaces — not as
 * required fields on every Place consumer.
 */

import type { Monthly12 } from "../../types";

/** Rolling “Now” window vs official WMO standard normal comparison period. */
export type ClimatePeriodId = "rolling-1996-2025" | "wmo-1991-2020";

export type ClimateObservationClass = "observation" | "reanalysis" | "model" | "derived";

export type ClimateFallbackStatus =
  | "none"
  | "era5-land"
  | "station-override"
  | "unavailable";

export type ClimateQualityFlag =
  | "ok"
  | "estimated-from-vapor-pressure"
  | "grid-only"
  | "reviewed-exception"
  | "elevation-mismatch"
  | "incomplete-year"
  | "unavailable"
  | "template-retired";

export type ClimateValidationStatus = "validated" | "grid-only" | "reviewed-exception";

export type ClimateDataConfidence = "high" | "moderate" | "low";

export interface ClimateSourceRef {
  provider: string;
  product: string;
  doiOrUrl: string;
  version: string;
  spatialResolution: string;
  accessedDate: string;
  sourceHash: string;
  observationClass: ClimateObservationClass;
}

export interface ClimateMetricProvenance {
  metric: string;
  sourceId: string;
  period: ClimatePeriodId;
  method: string;
  units: string;
  completeness: number;
  fallback: ClimateFallbackStatus;
  qualityFlags: ClimateQualityFlag[];
}

export interface ClimateStationRef {
  network: "GHCNd" | "ECCC" | "SMN" | "WMO" | "other";
  stationId: string;
  name?: string;
  lat: number;
  lon: number;
  elevationM?: number;
  distanceKm: number;
  elevationDeltaM?: number;
  usableYears: number;
  monthCompletenessMin: number;
}

export interface ClimateBiasStats {
  annualTempMaeC?: number;
  annualPrecipBiasPct?: number;
  monthlyTempMaeC?: Monthly12;
  monthlyPrecipBiasPct?: Monthly12;
}

export interface ClimateValidation {
  status: ClimateValidationStatus;
  stations: ClimateStationRef[];
  bias?: ClimateBiasStats;
  exceptionReason?: string;
  notes?: string;
}

/** Compact monthly climatology for one period (runtime Place.climate shape). */
export interface ClimatePeriodNormals {
  period: ClimatePeriodId;
  label: string;
  /** Explicit: rolling windows are not WMO standard normals. */
  isWmoStandardNormal: boolean;
  tempHighC: Monthly12;
  tempLowC: Monthly12;
  precipMm: Monthly12;
  annualPrecipMm: number;
  humidity?: Monthly12;
  solarEnergyMjM2Day?: Monthly12;
  /** Station-sourced snowfall normals only — never Daymet SWE relabeled. */
  snowCm?: Monthly12;
  frostFreeDays?: number;
  gdd10?: number;
  diurnalSummerC?: number;
  diurnalWinterC?: number;
  heatDays35C?: number;
  warmNights20C?: number;
  frostDays?: number;
  meanDrySpellDays?: number;
  maxDrySpellDays?: number;
  wetDayP95Mm?: number;
  rx5dayMm?: number;
  snowpackDays?: number;
  meanSweMm?: number;
  maxSweMm?: number;
  /** Chill hours require hourly sources; absent ⇒ unavailable. */
  chillHours?: number | null;
}

export interface ClimateAnchor {
  lat: number;
  lon: number;
  elevationM: number;
  /** Why this pixel represents the place (required when overriding place coords). */
  note: string;
  overrideReason?: string;
}

export interface ClimatePlaceRecordV2 {
  placeId: string;
  generatedAt: string;
  dataThroughYear: number;
  anchor: ClimateAnchor;
  gridElevationM: number;
  elevationDeltaM: number;
  daymetVersion: string;
  daymetSoftwareVersion: string;
  sources: Record<string, ClimateSourceRef>;
  periods: {
    "rolling-1996-2025": ClimatePeriodNormals;
    "wmo-1991-2020": ClimatePeriodNormals;
  };
  /** Compact receipt: recent window minus WMO normal. */
  recentShift: {
    jjaHighDeltaC: number;
    janLowDeltaC: number;
    annualPrecipDeltaPct: number;
  };
  provenance: ClimateMetricProvenance[];
  validation: ClimateValidation;
  climateDataConfidence: ClimateDataConfidence;
  projection?: ClimateProjectionEnsemble;
}

export interface ClimateProjectionEnsemble {
  product: string;
  doiOrUrl: string;
  baselinePeriod: "1995-2014";
  futurePeriod: "2041-2060";
  appliedTo: ClimatePeriodId;
  models: string[];
  modelCount: number;
  ssp245: ClimateEnsembleDelta;
  ssp585: ClimateEnsembleDelta;
  disclaimer: string;
  status: "ok" | "unavailable";
  unavailableReason?: string;
}

export interface ClimateEnsembleDelta {
  deltaJJAHighC: { p10: number; median: number; p90: number };
  deltaJANLowC: { p10: number; median: number; p90: number };
  /** Multiplicative precip ratio minus 1, expressed as percent (median −10 ⇒ 0.9×). */
  deltaPrecipPct: { p10: number; median: number; p90: number };
}

export const DAYMET_SOURCE: Omit<ClimateSourceRef, "accessedDate" | "sourceHash"> = {
  provider: "ORNL DAAC",
  product: "Daymet V4 R1 Daily Surface Weather",
  doiOrUrl: "https://doi.org/10.3334/ORNLDAAC/2129",
  version: "4.0 R1",
  spatialResolution: "1 km",
  observationClass: "observation",
};

export const PERIOD_LABELS: Record<ClimatePeriodId, string> = {
  "rolling-1996-2025": "Recent · 1996–2025",
  "wmo-1991-2020": "WMO normal · 1991–2020",
};

export const DEFAULT_CLIMATE_PERIOD: ClimatePeriodId = "rolling-1996-2025";
export const COMPARISON_CLIMATE_PERIOD: ClimatePeriodId = "wmo-1991-2020";

export const NASA_PROJECTION_DISCLAIMER =
  "NASA NEX-GDDP-CMIP6 ensemble deltas are for research and screening only. Not for engineering, design, or regulatory decisions.";
