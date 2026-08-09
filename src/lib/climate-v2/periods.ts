/**
 * Period labels and editorial snapshot helpers for Climate Data V2.
 */

import {
  COMPARISON_CLIMATE_PERIOD,
  DEFAULT_CLIMATE_PERIOD,
  PERIOD_LABELS,
  type ClimatePeriodId,
} from "./contracts";
import {
  CLIMATE_V2_DATA_THROUGH_YEAR,
  CLIMATE_V2_GENERATED_AT,
} from "../../data/generated/climate-v2/index";

export { DEFAULT_CLIMATE_PERIOD, COMPARISON_CLIMATE_PERIOD, PERIOD_LABELS };

/** Active “Now” label shown in scenario controls and evidence. */
export const CLIMATE_NOW_PERIOD_LABEL = PERIOD_LABELS[DEFAULT_CLIMATE_PERIOD];

/** Comparison / reference WMO normal label. */
export const CLIMATE_WMO_PERIOD_LABEL = PERIOD_LABELS[COMPARISON_CLIMATE_PERIOD];

export const CLIMATE_ROLLING_DISCLAIMER =
  "Rolling climatology, not WMO standard normal." as const;

export function isWmoStandardNormal(period: ClimatePeriodId): boolean {
  return period === "wmo-1991-2020";
}

/** Manifest-derived editorial snapshot: “Data through 2025 · generated YYYY-MM-DD”. */
export function climateDataSnapshotLabel(): string {
  return `Data through ${CLIMATE_V2_DATA_THROUGH_YEAR} · generated ${CLIMATE_V2_GENERATED_AT}`;
}

export function climateManifestGeneratedAt(): string {
  return CLIMATE_V2_GENERATED_AT;
}

export function climateDataThroughYear(): number {
  return CLIMATE_V2_DATA_THROUGH_YEAR;
}
