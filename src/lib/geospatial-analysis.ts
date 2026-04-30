import type { MicroclimateArchetype, Place, RiskLevel, TopographicDriver } from "../types";
import { getPlaceCorpusRanks } from "./atlas-corpus-stats";

const RISK_NUMERIC: Record<RiskLevel, number> = {
  "very-low": 0,
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  "very-high": 5,
};

/** Archetypes where fine-scale topography or canopy structure usually matters for interpretation. */
const STRUCTURE_ARCHETYPES: readonly MicroclimateArchetype[] = [
  "rain-shadow-sanctuary",
  "cool-summer-maritime",
  "canyon-sheltered",
  "fog-belt-coast",
  "cloud-forest",
  "limestone-karst",
  "driftless-relief",
  "fjord-inlet",
  "cold-air-pool",
  "basin-inversion",
  "alpine-tundra",
  "badland-steppe",
  "gap-wind-corridor",
  "hyper-maritime",
  "frost-hollow",
  "lake-effect-snowbelt",
] as const;

/** Drivers tied to sharp surface geometry or infiltration patterns. */
const STRUCTURE_DRIVERS: readonly TopographicDriver[] = [
  "karst-infiltration",
  "aspect-slope",
  "cold-air-drainage",
  "gap-winds",
  "orographic-lift",
] as const;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalize(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v) || hi <= lo) return 0;
  return clamp01((v - lo) / (hi - lo));
}

function safeRatio(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 1;
  return a / b;
}

function topRiskAverage(place: Place): number {
  const vals = Object.values(place.risks)
    .map(r => RISK_NUMERIC[r.level] ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 3);
  if (vals.length === 0) return 0;
  return vals.reduce((s, x) => s + x, 0) / vals.length;
}

function mean(arr: readonly number[]): number {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function hasArchetype(place: Place, ids: readonly MicroclimateArchetype[]): boolean {
  return place.archetypes.some(a => ids.includes(a));
}

function hasDriver(place: Place, ids: readonly TopographicDriver[]): boolean {
  return place.drivers.some(d => ids.includes(d));
}

function structureContextBoost(place: Place): number {
  let b = 0;
  for (const id of STRUCTURE_ARCHETYPES) {
    if (place.archetypes.includes(id)) b += 0.038;
  }
  for (const id of STRUCTURE_DRIVERS) {
    if (place.drivers.includes(id)) b += 0.028;
  }
  return Math.min(0.16, b);
}

/**
 * 0–100 screening score for where **fine-scale topography / canopy structure**
 * would materially change interpretation — the same places airborne or spaceborne
 * lidar is often flown to tighten DEMs and vegetation structure. Derived only from
 * atlas terrain, climate, and archetype fields (no lidar scenes ingested).
 */
function structuralTextureScore(
  place: Place,
  reliefEnergyMPerKm: number,
  annualThermalAmplitudeC: number,
  hydroSeasonalityRatio: number,
): number {
  const rRel = normalize(reliefEnergyMPerKm, 6, 170);
  const rElev = normalize(place.elevationM, 80, 4000);
  const rAmp = normalize(annualThermalAmplitudeC, 9, 54);
  const rHydro = normalize(Math.min(hydroSeasonalityRatio, 11), 1.2, 11);
  const rUniq = normalize(place.scores.microclimateUniqueness, 12, 96);
  const canopy = place.climate.humidity != null ? normalize(mean(place.climate.humidity), 38, 90) : 0.45;
  const boost = structureContextBoost(place);
  const blend =
    0.26 * rRel +
    0.2 * rElev +
    0.18 * rAmp +
    0.14 * rHydro +
    0.12 * rUniq +
    0.1 * canopy +
    boost;
  return Math.round(clamp01(blend) * 100);
}

function sourceScoreLabel(score: number): string {
  if (score >= 78) return "strong";
  if (score >= 55) return "useful";
  if (score >= 35) return "contextual";
  return "limited";
}

export interface EarthObservationFit {
  sourceId: "sentinel-2" | "landsat";
  score: number;
  label: string;
  note: string;
}

export interface SpectralSignal {
  label: string;
  index: string;
  sourceId: "sentinel-2" | "landsat";
  reason: string;
}

export interface GeospatialAnalysis {
  reliefEnergyMPerKm: number;
  annualThermalAmplitudeC: number;
  hydroSeasonalityRatio: number;
  terrainExposureIndex: number;
  /** Fine-scale relief / canopy-structure screening (DEM + archetype proxy — not lidar tiles). */
  structuralTextureScore: number;
  eoObservabilityScore: number;
  geospatialSignalScore: number;
  sourceFits: readonly EarthObservationFit[];
  spectralSignals: readonly SpectralSignal[];
  analysisConfidence: "high" | "moderate" | "screening";
  contextLine: string;
  limitNote: string;
}

const CACHE = new WeakMap<Place, GeospatialAnalysis>();

function buildSpectralSignals(place: Place, annualPrecipMm: number, snowMonths: number): SpectralSignal[] {
  const out: SpectralSignal[] = [];

  const pushFront = (s: SpectralSignal) => {
    out.unshift(s);
  };

  if (hasArchetype(place, ["urban-heat-contrast"])) {
    pushFront({
      label: "Urban fabric contrast",
      index: "Impervious / ISA proxies",
      sourceId: "landsat",
      reason: "Thermal and shortwave contrast separates dense core, park cool islands, and exurban fringe in screening work.",
    });
  }

  if (hasArchetype(place, ["coastal-upwelling", "hyper-maritime", "fog-belt-coast"]) || hasDriver(place, ["marine-layer"])) {
    pushFront({
      label: "Coastal haze and glint",
      index: "Aerosol-aware RGB / turbidity",
      sourceId: "sentinel-2",
      reason: "Marine stratus and sunglint complicate water-leaving reflectance; analysts clip glint and lean on repeat passes.",
    });
  }

  if (hasArchetype(place, ["limestone-karst"]) || hasDriver(place, ["karst-infiltration"])) {
    pushFront({
      label: "Sparse canopy / bright substrate",
      index: "Bare-soil / limestone separation",
      sourceId: "sentinel-2",
      reason: "Karst landscapes mix bright limestone, thin soils, and patchy forest — multispectral shape helps before field lidar.",
    });
  }

  out.push(
    {
      label: "Vegetation vigor",
      index: "NDVI / red-edge NDVI",
      sourceId: "sentinel-2",
      reason: "Useful for separating irrigated, riparian, forest, and dryland texture at 10 m scale.",
    },
    {
      label: "Surface thermal contrast",
      index: "LST anomaly",
      sourceId: "landsat",
      reason: "Thermal bands help spot valley heat, bare-ground loading, and urban/rural contrast.",
    },
  );

  if (annualPrecipMm > 450 || RISK_NUMERIC[place.risks.drought.level] >= 2) {
    out.push({
      label: "Canopy / soil moisture",
      index: "NDMI",
      sourceId: "sentinel-2",
      reason: "Highlights moisture storage, rain-shadow boundaries, and irrigation dependence.",
    });
  }
  if (RISK_NUMERIC[place.risks.wildfire.level] >= 3 || RISK_NUMERIC[place.risks.smoke.level] >= 3) {
    out.push({
      label: "Burn and smoke context",
      index: "NBR / dNBR",
      sourceId: "landsat",
      reason: "Long archive supports burn-severity comparison and disturbance history.",
    });
  }
  if (snowMonths >= 2) {
    out.push({
      label: "Snow persistence",
      index: "NDSI",
      sourceId: "sentinel-2",
      reason: "Snow cover timing often controls albedo, frost pockets, and spring recharge.",
    });
  }

  const seen = new Set<string>();
  const dedup: SpectralSignal[] = [];
  for (const s of out) {
    const k = `${s.sourceId}:${s.index}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(s);
  }
  return dedup.slice(0, 5);
}

export function buildGeospatialAnalysis(place: Place): GeospatialAnalysis {
  const cached = CACHE.get(place);
  if (cached) return cached;

  const wettest = Math.max(...place.climate.precipMm);
  const driest = Math.max(0.1, Math.min(...place.climate.precipMm));
  const radiusKm = Math.max(8, place.localContrast?.[0]?.radiusKm ?? 24);
  const reliefEnergyMPerKm = place.elevationM / radiusKm;
  const annualThermalAmplitudeC = Math.max(...place.climate.tempHighC) - Math.min(...place.climate.tempLowC);
  const hydroSeasonalityRatio = safeRatio(wettest, driest);
  const annualPrecipMm = place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const humidityMean = place.climate.humidity ? mean(place.climate.humidity) : null;
  const snowMonths = place.climate.snowCm?.filter(v => v > 2).length ?? 0;

  const riskAvg = topRiskAverage(place); // 0..5
  const driverDiversity = Math.min(1, place.drivers.length / 6);
  const terrainExposureIndex = riskAvg * 0.72 + driverDiversity + normalize(reliefEnergyMPerKm, 10, 140) * 0.45;

  const cloudPenalty =
    hasArchetype(place, ["fog-belt-coast", "cloud-forest", "hyper-maritime", "lake-effect-snowbelt"]) ? 18 : 0;
  const snowPenalty = snowMonths >= 5 ? 8 : 0;
  const moistureSignal = normalize(annualPrecipMm, 250, 2400) * 24 + normalize(hydroSeasonalityRatio, 1, 9) * 16;
  const vegetationSignal = normalize(place.scores.growability, 35, 95) * 22 + (hasDriver(place, ["river-moderation", "lake-effect", "marine-layer"]) ? 8 : 0);
  const sentinelScore = Math.round(clamp01((42 + moistureSignal + vegetationSignal - cloudPenalty - snowPenalty) / 100) * 100);

  const thermalSignal =
    normalize(annualThermalAmplitudeC, 12, 55) * 26 +
    normalize(place.scores.tradeoff, 20, 95) * 14 +
    (hasArchetype(place, ["urban-heat-contrast", "desert-oasis", "high-desert-escape"]) ? 10 : 0) +
    (place.risks.extremeHeat.level === "high" || place.risks.extremeHeat.level === "very-high" ? 8 : 0);
  const landsatScore = Math.round(clamp01((44 + thermalSignal - cloudPenalty * 0.45) / 100) * 100);
  const eoObservabilityScore = Math.round(sentinelScore * 0.52 + landsatScore * 0.48);

  const structuralTexture = structuralTextureScore(place, reliefEnergyMPerKm, annualThermalAmplitudeC, hydroSeasonalityRatio);

  const corpus = getPlaceCorpusRanks(place);
  const structuralN = normalize(structuralTexture, 22, 94);
  const combined =
    0.18 * normalize(reliefEnergyMPerKm, 8, 180) +
    0.17 * normalize(annualThermalAmplitudeC, 8, 55) +
    0.16 * normalize(Math.min(hydroSeasonalityRatio, 10), 1, 10) +
    0.14 * normalize(terrainExposureIndex, 0, 5) +
    0.12 * normalize(eoObservabilityScore, 30, 92) +
    0.11 * corpus.higherUniquenessShare +
    0.12 * structuralN;
  const geospatialSignalScore = Math.round(combined * 100);

  const spectralSignals = buildSpectralSignals(place, annualPrecipMm, snowMonths);

  const sourceFits: EarthObservationFit[] = [
    {
      sourceId: "sentinel-2",
      score: sentinelScore,
      label: sourceScoreLabel(sentinelScore),
      note: humidityMean != null && humidityMean > 78
        ? "High cloud/fog frequency can limit clean scenes, but 10 m bands still resolve land-cover texture."
        : "Best for fine-grained vegetation, moisture, snow, and land-cover edges.",
    },
    {
      sourceId: "landsat",
      score: landsatScore,
      label: sourceScoreLabel(landsatScore),
      note: "Best for thermal contrast and a long, stable archive for change-over-time checks.",
    },
  ];

  const analysisConfidence =
    place.confidence === "high" && eoObservabilityScore >= 55
      ? "high"
      : place.confidence === "low" || eoObservabilityScore < 40
        ? "screening"
        : "moderate";

  const contextLine =
    `Relief energy ~${Math.round(reliefEnergyMPerKm)} m/km, ` +
    `hydro seasonality ${hydroSeasonalityRatio.toFixed(1)}x, ` +
    `thermal span ${Math.round(annualThermalAmplitudeC)}°C, ` +
    `structure texture ${structuralTexture}/100, ` +
    `EO observability ${eoObservabilityScore}/100.`;

  const limitNote =
    "Scores are deterministic screening analytics from atlas fields plus published sensor families (Sentinel-2, Landsat) and public topography context — not cloud-masked scene composites, lidar point clouds, or field-survey measurements.";

  const out: GeospatialAnalysis = {
    reliefEnergyMPerKm,
    annualThermalAmplitudeC,
    hydroSeasonalityRatio,
    terrainExposureIndex,
    structuralTextureScore: structuralTexture,
    eoObservabilityScore,
    geospatialSignalScore,
    sourceFits,
    spectralSignals,
    analysisConfidence,
    contextLine,
    limitNote,
  };
  CACHE.set(place, out);
  return out;
}
