import { fileURLToPath } from "node:url";
/**
 * Generate compact Climate V2 place records + manifest from cached Daymet CSVs.
 *
 * Offline once cache (or committed fixtures) is present.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
  ClimateMetricProvenance,
  ClimatePlaceRecordV2,
  ClimateSourceRef,
  ClimateValidation,
} from "../../src/lib/climate-v2/contracts";
import { DAYMET_SOURCE, NASA_PROJECTION_DISCLAIMER } from "../../src/lib/climate-v2/contracts";
import { aggregateDaymetPeriod, recentShiftReceipt } from "./lib/aggregate";
import { parseDaymetCsv, type DaymetDailyRow } from "./lib/daymet-parse";
import { sha256Hex, stableJsonHash, stableStringify } from "./lib/hash";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CACHE_ROOT = join(ROOT, ".cache/daymet");
const OUT_DIR = join(ROOT, "src/data/generated/climate-v2");
const MANIFEST_PATH = join(ROOT, "data/climate-v2/manifest.json");
const ANCHORS_PATH = join(ROOT, "data/climate-v2/anchors.json");
const STATIONS_PATH = join(ROOT, "data/climate-v2/stations/station-map.json");
const EXCEPTIONS_PATH = join(ROOT, "data/climate-v2/stations/reviewed-exceptions.json");
const AUDIT_DIR = join(ROOT, "data/climate-v2/audit");

interface AnchorEntry {
  id: string;
  name: string;
  country: string;
  tier: string;
  lat: number;
  lon: number;
  elevationM: number;
  climateAnchor: { lat: number; lon: number; elevationM: number; note: string; overrideReason?: string };
}

interface StationMapFile {
  stations: Record<string, ClimateValidation>;
}

function loadYears(placeId: string, start: number, end: number): {
  rows: DaymetDailyRow[];
  hashes: Record<string, string>;
  softwareVersion: string;
  gridElevationM: number;
} {
  const rows: DaymetDailyRow[] = [];
  const hashes: Record<string, string> = {};
  let softwareVersion = "4.0";
  let gridElevationM = NaN;

  for (let y = start; y <= end; y++) {
    const path = join(CACHE_ROOT, placeId, `${y}.csv`);
    if (!existsSync(path)) {
      throw new Error(`Missing Daymet cache for ${placeId} year ${y}: ${path}`);
    }
    const raw = readFileSync(path, "utf8");
    hashes[String(y)] = sha256Hex(raw);
    const parsed = parseDaymetCsv(raw);
    softwareVersion = parsed.header.softwareVersion;
    gridElevationM = parsed.header.elevationM;
    rows.push(...parsed.rows.filter(r => r.year === y));
  }
  return { rows, hashes, softwareVersion, gridElevationM };
}

function metricProvenance(
  metrics: string[],
  sourceId: string,
  period: "rolling-1996-2025" | "wmo-1991-2020",
  method: string,
  units: string,
  flags: ClimateMetricProvenance["qualityFlags"] = ["ok"],
): ClimateMetricProvenance[] {
  return metrics.map(metric => ({
    metric,
    sourceId,
    period,
    method,
    units,
    completeness: 1,
    fallback: "none",
    qualityFlags: flags,
  }));
}

function resolveValidation(
  placeId: string,
  tier: string,
  stationMap: StationMapFile,
  exceptions: Record<string, ClimateValidation>,
): ClimateValidation {
  if (exceptions[placeId]) return exceptions[placeId]!;
  if (stationMap.stations[placeId]) return stationMap.stations[placeId]!;
  // Default: grid-only until station mapping is filled
  const status = tier === "C" ? "grid-only" : "reviewed-exception";
  return {
    status,
    stations: [],
    notes:
      status === "grid-only"
        ? "Tier C grid-only Daymet climatology; station validation pending."
        : "Tier A/B awaiting reviewed station mapping or documented exception.",
    exceptionReason:
      status === "reviewed-exception" ? "station-mapping-pending" : undefined,
  };
}

function climateDataConfidence(
  validation: ClimateValidation,
  elevDelta: number,
): "high" | "moderate" | "low" {
  if (Math.abs(elevDelta) > 250) return "low";
  if (validation.status === "validated") return "high";
  if (validation.status === "reviewed-exception") return "moderate";
  return "low"; // grid-only cannot inherit high confidence
}

async function main(): Promise<void> {
  const through = 2025;
  const generatedAt = new Date().toISOString().slice(0, 10);
  const anchors = (JSON.parse(readFileSync(ANCHORS_PATH, "utf8")) as { anchors: AnchorEntry[] }).anchors;

  const stationMap: StationMapFile = existsSync(STATIONS_PATH)
    ? JSON.parse(readFileSync(STATIONS_PATH, "utf8"))
    : { stations: {} };
  const exceptions: Record<string, ClimateValidation> = existsSync(EXCEPTIONS_PATH)
    ? JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")).exceptions ?? {}
    : {};

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(AUDIT_DIR, { recursive: true });

  const records: ClimatePlaceRecordV2[] = [];
  const placeHashes: Record<string, string> = {};
  const cacheHashes: Record<string, Record<string, string>> = {};
  const elevOutliers: Array<{ id: string; authored: number; grid: number; delta: number }> = [];

  for (const anchor of anchors) {
    const { rows, hashes, softwareVersion, gridElevationM } = loadYears(anchor.id, 1991, through);
    cacheHashes[anchor.id] = hashes;

    const rolling = aggregateDaymetPeriod(rows, {
      period: "rolling-1996-2025",
      startYear: 1996,
      endYear: 2025,
    });
    const wmo = aggregateDaymetPeriod(rows, {
      period: "wmo-1991-2020",
      startYear: 1991,
      endYear: 2020,
    });

    const sourceHash = sha256Hex(Object.values(hashes).sort().join(""));
    const sourceId = "daymet-v4r1";
    const source: ClimateSourceRef = {
      ...DAYMET_SOURCE,
      version: `${DAYMET_SOURCE.version} (software ${softwareVersion})`,
      accessedDate: generatedAt,
      sourceHash,
    };

    const elevDelta = gridElevationM - anchor.climateAnchor.elevationM;
    if (Math.abs(elevDelta) > 250) {
      elevOutliers.push({
        id: anchor.id,
        authored: anchor.climateAnchor.elevationM,
        grid: gridElevationM,
        delta: Math.round(elevDelta),
      });
    }

    const validation = resolveValidation(anchor.id, anchor.tier, stationMap, exceptions);
    const provenance: ClimateMetricProvenance[] = [
      ...metricProvenance(
        ["tempHighC", "tempLowC", "precipMm", "annualPrecipMm", "gdd10", "frostFreeDays"],
        sourceId,
        "rolling-1996-2025",
        "Daymet daily aggregation (monthly mean tmax/tmin; yearly-monthly precip mean)",
        "°C / mm / days",
      ),
      ...metricProvenance(
        ["humidity"],
        sourceId,
        "rolling-1996-2025",
        "Estimated from Daymet vapor pressure + daily mean temperature (Magnus)",
        "%",
        ["estimated-from-vapor-pressure"],
      ),
      ...metricProvenance(
        ["solarEnergyMjM2Day"],
        sourceId,
        "rolling-1996-2025",
        "srad × dayl / 1e6 (solar resource, not observed sunshine hours)",
        "MJ/m²/day",
      ),
      ...metricProvenance(
        ["tempHighC", "tempLowC", "precipMm", "annualPrecipMm"],
        sourceId,
        "wmo-1991-2020",
        "Same-source Daymet aggregation for WMO comparison period",
        "°C / mm",
      ),
    ];

    const record: ClimatePlaceRecordV2 = {
      placeId: anchor.id,
      generatedAt,
      dataThroughYear: through,
      anchor: {
        lat: anchor.climateAnchor.lat,
        lon: anchor.climateAnchor.lon,
        elevationM: anchor.climateAnchor.elevationM,
        note: anchor.climateAnchor.note,
        overrideReason: anchor.climateAnchor.overrideReason,
      },
      gridElevationM,
      elevationDeltaM: Math.round(elevDelta * 10) / 10,
      daymetVersion: "V4 R1",
      daymetSoftwareVersion: softwareVersion,
      sources: { [sourceId]: source },
      periods: {
        "rolling-1996-2025": rolling.normals,
        "wmo-1991-2020": wmo.normals,
      },
      recentShift: recentShiftReceipt(rolling.normals, wmo.normals),
      provenance,
      validation,
      climateDataConfidence: climateDataConfidence(validation, elevDelta),
      projection: {
        product: "NASA NEX-GDDP-CMIP6",
        doiOrUrl: "https://www.nasa.gov/nex/gddp",
        baselinePeriod: "1995-2014",
        futurePeriod: "2041-2060",
        appliedTo: "rolling-1996-2025",
        models: [],
        modelCount: 0,
        ssp245: {
          deltaJJAHighC: { p10: 0, median: 0, p90: 0 },
          deltaJANLowC: { p10: 0, median: 0, p90: 0 },
          deltaPrecipPct: { p10: 0, median: 0, p90: 0 },
        },
        ssp585: {
          deltaJJAHighC: { p10: 0, median: 0, p90: 0 },
          deltaJANLowC: { p10: 0, median: 0, p90: 0 },
          deltaPrecipPct: { p10: 0, median: 0, p90: 0 },
        },
        disclaimer: NASA_PROJECTION_DISCLAIMER,
        status: "unavailable",
        unavailableReason:
          "Per-place NEX-GDDP ensemble ingest pending authenticated Earthdata access; do not invent deltas.",
      },
    };

    // Guard against NaN/Infinity leaking into committed assets
    const json = stableStringify(record);
    if (/\bnull\b/.test(json) === false && /NaN|Infinity|-Infinity/.test(json)) {
      throw new Error(`Non-finite values in record ${anchor.id}`);
    }
    // chillHours is intentionally null
    if (/NaN|Infinity|-Infinity/.test(json)) {
      throw new Error(`Non-finite values in record ${anchor.id}`);
    }

    const hash = sha256Hex(json);
    placeHashes[anchor.id] = hash;
    records.push(record);

  }

  // Full provenance bundle (lazy-loaded by evidence/detail surfaces).
  const bundlePath = join(OUT_DIR, "records.json");
  writeFileSync(bundlePath, JSON.stringify(records) + "\n");

  // Compact eager overlay — only fields needed to populate Place.climate.
  const overlay = records.map(r => {
    const recent = r.periods["rolling-1996-2025"];
    return {
      placeId: r.placeId,
      climateDataConfidence: r.climateDataConfidence,
      validationStatus: r.validation.status,
      gridElevationM: r.gridElevationM,
      elevationDeltaM: r.elevationDeltaM,
      recentShift: r.recentShift,
      climate: {
        tempHighC: recent.tempHighC,
        tempLowC: recent.tempLowC,
        precipMm: recent.precipMm,
        annualPrecipMm: recent.annualPrecipMm,
        humidity: recent.humidity,
        solarEnergyMjM2Day: recent.solarEnergyMjM2Day,
        frostFreeDays: recent.frostFreeDays,
        gdd10: recent.gdd10,
        diurnalSummerC: recent.diurnalSummerC,
        diurnalWinterC: recent.diurnalWinterC,
        chillHours: recent.chillHours,
        snowCm: recent.snowCm,
      },
      projectionStatus: r.projection?.status ?? "unavailable",
      projection: r.projection?.status === "ok" ? r.projection : undefined,
    };
  });
  writeFileSync(join(OUT_DIR, "overlay.json"), JSON.stringify(overlay) + "\n");

  const indexSource = `/* AUTO-GENERATED — Climate Data V2. Do not edit. */
import type { Confidence, Monthly12 } from "../../../types";
import type {
  ClimateDataConfidence,
  ClimateEnsembleDelta,
  ClimatePlaceRecordV2,
  ClimateProjectionEnsemble,
  ClimateValidationStatus,
} from "../../../lib/climate-v2/contracts";
import overlayJson from "./overlay.json";

export const CLIMATE_V2_GENERATED_AT = ${JSON.stringify(generatedAt)};
export const CLIMATE_V2_DATA_THROUGH_YEAR = ${through} as const;

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
`;

  writeFileSync(join(OUT_DIR, "index.ts"), indexSource);

  const manifest = {
    version: 2,
    product: "terraclima-climate-v2",
    dataThroughYear: through,
    generatedAt,
    defaultPeriod: "rolling-1996-2025",
    comparisonPeriod: "wmo-1991-2020",
    daymet: {
      product: DAYMET_SOURCE.product,
      doi: DAYMET_SOURCE.doiOrUrl,
      version: DAYMET_SOURCE.version,
      pinnedSoftwareMajor: "4.0",
    },
    placeCount: records.length,
    placeHashes,
    // Per-year cacheHashes stay in .cache/daymet (gitignored). Commit a
    // compact place-level source fingerprint map instead.
    placeSourceHashes: Object.fromEntries(
      records.map(r => [r.placeId, r.sources["daymet-v4r1"]!.sourceHash]),
    ),
    elevOutliers,
    notes: [
      "1996–2025 is a rolling climatology, not a WMO standard normal.",
      "1991–2020 is the official WMO comparison/reference normal from the same Daymet source.",
      "Daymet SWE is exposed as snowpack/SWE metrics only — never as snowfall cm.",
      "Humidity is estimated from vapor pressure.",
    ],
  };

  const manifestHash = stableJsonHash(manifest);
  const manifestWithHash = { ...manifest, manifestHash };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifestWithHash, null, 2) + "\n");

  // Keep bulky per-year cache hashes local for resume/drift tooling.
  writeFileSync(
    join(CACHE_ROOT, "cache-hashes.json"),
    JSON.stringify({ generatedAt, cacheHashes }, null, 2) + "\n",
  );

  writeFileSync(
    join(AUDIT_DIR, "generation-summary.json"),
    JSON.stringify(
      {
        generatedAt,
        placeCount: records.length,
        elevOutliers,
        validationCounts: {
          validated: records.filter(r => r.validation.status === "validated").length,
          gridOnly: records.filter(r => r.validation.status === "grid-only").length,
          reviewedException: records.filter(r => r.validation.status === "reviewed-exception").length,
        },
        manifestHash,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`Generated ${records.length} climate-v2 records → ${OUT_DIR}`);
  console.log(`Manifest → ${MANIFEST_PATH}`);
  console.log(`Elevation outliers (>250 m): ${elevOutliers.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
