/**
 * Editorial / provenance copy shared across the shell and place detail.
 * WMO 30-year normals; atlas corpus is hand-curated, not a live API feed.
 */
export const CLIMATE_NORMALS_PERIOD = "1991–2020" as const;

/** Shown in the footer and detail panel so readers know the corpus is versioned, not real-time. */
export const ATLAS_EDITORIAL_SNAPSHOT = "April 2026" as const;

export interface EarthObservationSource {
  id: "sentinel-2" | "landsat";
  label: string;
  operator: string;
  nominalResolutionM: number;
  revisitDays: string;
  role: string;
}

export const EARTH_OBSERVATION_SOURCES: readonly EarthObservationSource[] = [
  {
    id: "sentinel-2",
    label: "Sentinel-2 MSI",
    operator: "ESA / Copernicus",
    nominalResolutionM: 10,
    revisitDays: "~5 days",
    role: "Vegetation vigor, moisture gradients, and land-surface contrast checks.",
  },
  {
    id: "landsat",
    label: "Landsat 8/9 OLI-TIRS",
    operator: "USGS / NASA",
    nominalResolutionM: 30,
    revisitDays: "~8 days combined",
    role: "Long-baseline thermal and land-cover context tied to station normals.",
  },
] as const;

export const GEOSPATIAL_ANALYSIS_METHOD =
  "Topography-, climate-, and risk-derived terrain analytics over the atlas corpus (deterministic, not ML-inferred)." as const;
