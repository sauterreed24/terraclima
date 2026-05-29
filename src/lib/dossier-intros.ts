/**
 * Place-specific dossier intro copy for analytical sections — gives every
 * location a localized lead-in before charts and scores.
 */
import type { Place } from "../types";
import type { GeospatialAnalysis } from "./geospatial-analysis";
import type { BioclimResult } from "./bioclim";
import type { LivabilityResult } from "./livability-score";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { DRIVER_LABELS } from "../types";
import { getAnnualPrecipMm, meanJanLow, meanSummerHigh } from "./climate-metrics";
import { getBestMonths } from "./best-months";
import { scorePlaceFeel } from "./place-feel";

function shortName(place: Place): string {
  return place.name.split("(")[0]!.trim();
}

function joinHumanList(items: readonly string[], max = 3): string {
  const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean))).slice(0, max);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

export function composeAgricultureIntro(place: Place): string {
  const score = place.growability.score;
  const frost = place.climate.frostFreeDays ?? null;
  const zone = place.growability.hardinessZone ?? place.climate.hardinessZone;
  const archetype = ARCHETYPE_BY_ID[place.archetypes[0]]?.label?.toLowerCase() ?? "this climate";
  const topCrops = joinHumanList(place.growability.growsWell.map(c => c.toLowerCase()), 3);
  const tricky = joinHumanList(place.growability.tricky.map(c => c.toLowerCase()), 2);
  const phMid = (place.soil.phRange[0] + place.soil.phRange[1]) / 2;
  const organicMid = place.soil.organicMatterPct
    ? (place.soil.organicMatterPct[0] + place.soil.organicMatterPct[1]) / 2
    : null;

  const scoreRead =
    score >= 75 ? "strong for careful growers"
    : score >= 55 ? "workable with irrigation discipline and variety choice"
    : score >= 38 ? "limited — success depends on season extension and micro-sites"
    : "a challenge except for the hardiest specialists";

  const frostRead =
    frost == null ? "frost-free runway varies by micro-site — check parcel elevation"
    : frost >= 200 ? `${frost} frost-free days give a long outdoor runway`
    : frost >= 140 ? `${frost} frost-free days support a real but not endless season`
    : frost >= 90 ? `only about ${frost} frost-free days — timing matters`
    : `a very short ${frost}-day frost-free window`;

  const soilDetail =
    organicMid != null
      ? `Soil pH near ${phMid.toFixed(1)} with ~${organicMid.toFixed(1)}% organic matter`
      : `Soil pH near ${phMid.toFixed(1)}`;

  const orchardNote = place.growability.orchard
    ? ` Orchard analog: ${place.growability.orchard.toLowerCase()}.`
    : place.growability.homeGarden
      ? ` Home-garden note: ${place.growability.homeGarden.replace(/\.$/, "").toLowerCase()}.`
      : "";

  return `${shortName(place)} sits in ${archetype} terrain on ${place.soil.texture.toLowerCase()} with ${place.soil.drainage} drainage — growability is ${scoreRead} (score ${score}/100, zone ${zone ?? "n/a"}). ${frostRead}; ${soilDetail} on ${place.elevationM >= 1000 ? `${Math.round(place.elevationM)} m` : "low"} relief. ${topCrops || "Local-adapted crops"} tend to reward the envelope while ${tricky || "heat- or humidity-demanding crops"} fight it.${orchardNote}`;
}

export function composeGeospatialIntro(place: Place, geo: GeospatialAnalysis): string {
  const sh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const precip = getAnnualPrecipMm(place);
  const drivers = joinHumanList(place.drivers.map(d => DRIVER_LABELS[d] ?? d), 2);
  const canopy =
    geo.structuralTextureScore >= 65 ? "canopy texture and slope aspect matter for parcel-scale reads"
    : geo.structuralTextureScore >= 40 ? "mixed open-canopy and bare-ground signals are both useful"
    : "open terrain favors thermal and moisture contrast over canopy texture";

  return `For ${shortName(place)}, the geospatial read starts with ${place.reliefContext.replace(/\.$/, "").toLowerCase()}. Signal score ${geo.geospatialSignalScore}/100 reflects relief energy near ${Math.round(geo.reliefEnergyMPerKm)} m/km, a ${Math.round(geo.annualThermalAmplitudeC)}°C annual thermal span (summer highs ~${Math.round(sh)}°C, winter lows ~${Math.round(jl)}°C), and ${Math.round(precip)} mm of precipitation shaped by ${drivers || "terrain exposure"}. EO observability ${geo.eoObservabilityScore}/100 — ${canopy}. Use Sentinel-2 for surface texture and Landsat thermal history when verifying ${place.region} field conditions.`;
}

export function composeClimateIntro(place: Place): string {
  const sh = meanSummerHigh(place);
  const jl = meanJanLow(place);
  const precip = getAnnualPrecipMm(place);
  const drivers = joinHumanList(place.drivers.map(d => DRIVER_LABELS[d] ?? d), 2);
  const diurnal = place.climate.diurnalSummerC;
  const diurnalRead =
    diurnal != null && diurnal >= 14 ? `strong summer night cooling (~${Math.round(diurnal)}°C daily swing)`
    : diurnal != null && diurnal >= 10 ? `moderate day–night separation (~${Math.round(diurnal)}°C in summer)`
    : "relatively muted day–night separation";

  return `${shortName(place)} (${place.koppen}, ${Math.round(place.elevationM)} m) runs ${Math.round(jl)}°C winter lows to ~${Math.round(sh)}°C summer highs with ${Math.round(precip)} mm annual precipitation — ${diurnalRead}. Monthly normals below encode how ${drivers || "local terrain"} shapes ${place.biome.toLowerCase()} rhythm across the year.`;
}

export function composeBioclimIntro(place: Place, bio: BioclimResult): string {
  const mat = `${bio.breakdown.matC.toFixed(1)}°C mean annual temperature`;
  const aridity =
    bio.unepAridity.value != null
      ? bio.unepAridity.classLabel.toLowerCase()
      : "aridity class unavailable";
  const growing =
    bio.breakdown.growingSeasonMonths > 0
      ? `${bio.breakdown.growingSeasonMonths} growing-season months (>10°C)`
      : "no conventional growing season in the monthly normals";

  return `Bioclimatic indices for ${shortName(place)} summarize ${mat}, ${aridity} moisture balance, and ${growing} — independent checks on the authored Köppen ${place.koppen} label. Percentile ranks compare this stop to every other place in the atlas on the same formula, useful for growers, hydrologists, and relocation scouts who want citable numbers beyond the feel read.`;
}

export function composeRiskIntro(place: Place): string {
  const top = Object.entries(place.risks)
    .filter(([, v]) => v.level === "high" || v.level === "very-high")
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim())
    .slice(0, 2);
  const moderate = Object.entries(place.risks)
    .filter(([, v]) => v.level === "elevated" || v.level === "moderate")
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim())
    .slice(0, 2);
  const hazard =
    top.length ? top.join(" and ")
    : moderate.length ? `${moderate.join(" and ")} (moderate screening levels)`
    : "moderate multi-hazard exposure";
  return `Climate risk for ${shortName(place)} is dominated by ${hazard} in the atlas screening — paired with ${place.climateChange.outlook2050.replace(/\.$/, "").toLowerCase()}. Treat parcel-level checks (insurance, drainage, smoke, water rights, slope stability) as mandatory, not optional, before committing to land or long stays.`;
}

export function composeCorpusIntro(place: Place, totalPlaces: number): string {
  const sh = meanSummerHigh(place);
  const precip = getAnnualPrecipMm(place);
  return `How ${shortName(place)} compares to the other ${totalPlaces - 1} curated stops: summer highs near ${Math.round(sh)}°C, ${Math.round(precip)} mm annual precipitation, growability ${place.growability.score}/100, and livability tradeoff ${place.scores.tradeoff}/100. High “wetter than” or “cooler than” shares mean this field beats most atlas entries — not that more rain or less heat is automatically better for your goals.`;
}

export function composeAtAGlanceIntro(place: Place): string {
  const feel = scorePlaceFeel(place);
  const tierRead =
    place.tier === "A" ? "flagship depth with full story, risks, and sources"
    : place.tier === "B" ? "spotlight depth — enough structure to compare cleanly"
    : "index entry — lean, map-first, still fully scorable";
  return `${shortName(place)} at a glance: ${tierRead}, place-feel ${feel.score}/100 (${feel.headline.toLowerCase()}), Köppen ${place.koppen} on ${place.biome.toLowerCase()}. Tiles below pull from the same structured record as the charts — elevation ${Math.round(place.elevationM)} m, growability ${place.growability.score}/100, confidence ${place.confidence}.`;
}

export function composePracticalReadIntro(place: Place, geo: GeospatialAnalysis): string {
  const best = getBestMonths(place, "C").slice(0, 2).map(m => m.label).join(" and ") || "shoulder seasons";
  const tradeoff =
    place.scores.tradeoff >= 60 ? "real tradeoffs to weigh before committing"
    : place.scores.tradeoff >= 45 ? "a few compromises worth checking in person"
    : "relatively straightforward settling-in signals";
  return `Practical read for ${shortName(place)}: what the ground can grow, how to read ${place.region} terrain (geospatial signal ${geo.geospatialSignalScore}/100), housing and hazard tradeoffs (${tradeoff}), and nearby contrasts to test on a scouting trip. Best on-the-ground windows often cluster around ${best}.`;
}

export function composeTourismIntro(place: Place): string {
  const best = getBestMonths(place, "C").slice(0, 2);
  const windowRead = best.length
    ? `${best.map(m => m.label).join("–")}${best[0]?.note ? ` (${best[0].note.slice(0, 100)}…)` : ""}`
    : "shoulder seasons when comfort and access balance";
  const draws = joinHumanList(
    place.travelFit.filter(t => !/^(year-round|summer|winter|spring|fall|autumn|shoulder seasons?)$/i.test(t.trim())),
    3,
  );
  return `Climate tourism scout for ${shortName(place)}: test ${place.biome.toLowerCase()} in person, not from averages alone. Strongest visit window — ${windowRead}. Come for ${draws || "the local climate story"}; use the three-day itinerary below to compare morning fog, afternoon heat, and night recovery against your tolerance.`;
}

export function composeLivabilityIntro(place: Place, livability: LivabilityResult): string {
  const driverLabels = livability.drivers
    .map(k => livability.components.find(c => c.key === k)?.label)
    .filter(Boolean)
    .slice(0, 2);
  const dragLabels = livability.drags
    .map(k => livability.components.find(c => c.key === k)?.label)
    .filter(Boolean)
    .slice(0, 2);
  const driverRead = driverLabels.length ? `led by ${driverLabels.join(" and ")}` : "balanced across components";
  const dragRead = dragLabels.length ? `; watch ${dragLabels.join(" and ")}` : "";
  return `Livability lens for ${shortName(place)} blends thermal comfort, atmosphere, hazards, growability, and lived friction into ${livability.score}/100 — ${driverRead}${dragRead}. Hover any row for the formula; this is a screening score, not a property appraisal.`;
}

export function composeLiveSignalsIntro(place: Place): string {
  const ls = place.liveSignals!;
  const axes: string[] = [];
  if (ls.costPressure != null && ls.costPressure >= 55) axes.push("housing cost pressure");
  if (ls.socialStress != null && ls.socialStress >= 55) axes.push("social-fabric stress");
  if (ls.accessFriction != null && ls.accessFriction >= 55) axes.push("services access friction");
  const focus = axes.length
    ? `Editorial screening flags elevated ${axes.join(" and ")} here`
    : "All three axes sit in moderate range — still verify locally";
  return `Lived signals for ${shortName(place)} (${place.municipality ?? place.region}): ${focus}. Climate normals cannot capture cost burden, civic stress, or hospital/airport distance — these 0–100 scores anchor to public sources, not insurance or appraisal workflows.`;
}

export function composeDeepDossierIntro(place: Place, sectionCount: number, hasBestMonthsGuide: boolean): string {
  const calendar = hasBestMonthsGuide ? " Best months for… handles calendars below;" : "";
  return `Field dossier for ${shortName(place)} — ${sectionCount} curated ${sectionCount === 1 ? "essay" : "essays"} on ${place.region} mechanisms, hydrology, gardens, and long-stay fit.${calendar} Read this as the atlas field notebook after the overview spotlight: authored depth first, then derived backbone sections where the corpus has them.`;
}

export function composeLivabilityMethodNote(): string {
  return "Human-felt thermal comfort, atmosphere (sky, wind, humidity, smoke, and solar load), tail-risk-aware hazard cushion, U-shaped precip moderation, curated lived friction, and derived place feel. Hover a row for its formula.";
}
