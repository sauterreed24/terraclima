import type { Place, RiskLevel, TopographicDriver } from "../types";
import { ARCHETYPE_LABELS, DRIVER_LABELS } from "../types";
import { computeBestMonths } from "./best-months";
import { avgRisk, meanJanLow, meanSummerHigh, RISK_VALUE } from "./scoring";
import { buildGeospatialAnalysis } from "./geospatial-analysis";
import {
  buildNearbyContextRows,
  buildPracticalActivities,
  buildSettlementAnchors,
} from "./practical-read";

export type TourismScoreLabel = "low" | "moderate" | "strong" | "exceptional";

export interface ClimateTourismProfile {
  placeId: string;
  climateStory: string;
  bestVisitWindow: {
    label: string;
    range: string;
    reason: string;
  };
  growThere: {
    headline: string;
    bestFits: string[];
    tricky: string[];
  };
  wildlifeAndHabitat: {
    headline: string;
    cues: string[];
    caveat: string;
  };
  soilRead: {
    headline: string;
    bullets: string[];
  };
  riskRead: {
    headline: string;
    topRisks: string[];
    caveat: string;
  };
  vibe: {
    label: string;
    description: string;
    tags: string[];
  };
  lodgingRead: {
    base: string;
    searchCues: string[];
    caveat: string;
  };
  itinerary: {
    title: string;
    days: Array<{
      day: 1 | 2 | 3;
      title: string;
      morning: string;
      afternoon: string;
      evening: string;
      climateLens: string;
    }>;
  };
  scores: {
    tourismAppeal: number;
    wouldLiveHere: number;
    climateLandOptionality: number;
  };
  scoreNotes: {
    tourismAppeal: string;
    wouldLiveHere: string;
    climateLandOptionality: string;
  };
}

export const TOURISM_SCORE_WEIGHTS = {
  tourismAppeal: {
    uniqueness: 0.24,
    hiddenGem: 0.18,
    travelRichness: 0.16,
    activityRichness: 0.14,
    bestWindowClarity: 0.12,
    geospatialSignal: 0.10,
    riskEase: 0.06,
  },
  wouldLiveHere: {
    resilience: 0.24,
    comfort: 0.20,
    growability: 0.16,
    winterEase: 0.14,
    summerEase: 0.12,
    hazardEase: 0.10,
    tradeoffPenalty: 0.04,
  },
  climateLandOptionality: {
    resilience: 0.20,
    growability: 0.18,
    uniqueness: 0.16,
    geospatialSignal: 0.16,
    soilUtility: 0.14,
    hazardEase: 0.12,
    coherentBurden: 0.04,
  },
} as const;

export const TOURISM_SCORE_PARAMS = {
  travelFitTarget: 5,
  activityTarget: 6,
  goodWindowTarget: 3,
  winterPerDegC: 4.5,
  summerComfortHighC: 26,
  summerPerDegC: 5,
  hazardPerRiskUnit: 14,
  tradeoffPenaltyScale: 0.35,
  highRiskPenalty: 7,
  elevatedRiskPenalty: 3,
} as const;

const RISK_LABEL: Record<string, string> = {
  wildfire: "wildfire",
  flood: "flood",
  drought: "drought",
  extremeHeat: "extreme heat",
  extremeCold: "extreme cold",
  smoke: "smoke",
  storm: "storm",
  landslide: "slope or landslide",
  coastal: "coastal exposure",
};

const SOIL_DRAINAGE_SCORE: Record<Place["soil"]["drainage"], number> = {
  excessive: 58,
  good: 92,
  moderate: 78,
  imperfect: 48,
  poor: 30,
};

const SOIL_WATER_SCORE: Record<Place["soil"]["waterHolding"], number> = {
  low: 45,
  moderate: 78,
  high: 86,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function richnessScore(count: number, target: number): number {
  return clampScore((count / target) * 100);
}

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function compact(items: readonly (string | undefined | null)[], max: number): string[] {
  return unique(items.map(item => item?.trim()).filter((item): item is string => Boolean(item))).slice(0, max);
}

function sentence(text: string | undefined, fallback: string, max = 230): string {
  const clean = (text?.trim() || fallback).replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function baseName(place: Place): string {
  const fromSettlement = buildSettlementAnchors(place)[0]?.name?.trim();
  if (fromSettlement) return fromSettlement;
  const fromMunicipality = place.municipality?.split("/")[0]?.trim();
  if (fromMunicipality) return fromMunicipality;
  return place.name.replace(/\([^)]*\)/g, "").split("&")[0]?.split(",")[0]?.trim() || place.name;
}

function riskRows(place: Place): Array<{ key: string; label: string; level: RiskLevel; note?: string; value: number }> {
  return Object.entries(place.risks)
    .map(([key, risk]) => ({
      key,
      label: RISK_LABEL[key] ?? key,
      level: risk.level,
      note: risk.note,
      value: RISK_VALUE[risk.level] ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function riskEase(place: Place): number {
  return clampScore(100 - avgRisk(place) * TOURISM_SCORE_PARAMS.hazardPerRiskUnit);
}

function winterEase(place: Place): number {
  return clampScore(100 - Math.max(0, -meanJanLow(place)) * TOURISM_SCORE_PARAMS.winterPerDegC);
}

function summerEase(place: Place): number {
  return clampScore(
    100 - Math.max(0, meanSummerHigh(place) - TOURISM_SCORE_PARAMS.summerComfortHighC) * TOURISM_SCORE_PARAMS.summerPerDegC,
  );
}

function highRiskPenalty(place: Place): number {
  const penalized = ["wildfire", "flood", "drought", "coastal", "landslide", "extremeHeat"] as const;
  let penalty = 0;
  for (const key of penalized) {
    const level = place.risks[key].level;
    if (level === "high" || level === "very-high") penalty += TOURISM_SCORE_PARAMS.highRiskPenalty;
    if (level === "elevated") penalty += TOURISM_SCORE_PARAMS.elevatedRiskPenalty;
  }
  return penalty;
}

function soilUtility(place: Place): number {
  const phMid = (place.soil.phRange[0] + place.soil.phRange[1]) / 2;
  const phScore = clampScore(100 - Math.abs(phMid - 6.6) * 22);
  return clampScore(
    SOIL_DRAINAGE_SCORE[place.soil.drainage] * 0.36 +
    SOIL_WATER_SCORE[place.soil.waterHolding] * 0.26 +
    phScore * 0.18 +
    place.growability.score * 0.20,
  );
}

function topDriverLabels(place: Place): string[] {
  return place.drivers.slice(0, 3).map(d => DRIVER_LABELS[d] ?? d);
}

function hasDriver(place: Place, drivers: readonly TopographicDriver[]): boolean {
  return place.drivers.some(d => drivers.includes(d));
}

function vibeFor(place: Place): ClimateTourismProfile["vibe"] {
  const hay = `${place.name} ${place.biome} ${place.summaryShort} ${place.summaryImmersive} ${place.travelFit.join(" ")} ${place.growability.growsWell.join(" ")}`.toLowerCase();
  if (place.archetypes.includes("fog-belt-coast") || hasDriver(place, ["marine-layer", "upwelling"])) {
    return {
      label: "Fog-belt field notes",
      description: "Cool air, marine layers, and edge-of-continent light make the place read by hour and exposure.",
      tags: compact(["fog belt", "cool summer", "water edge", ...place.travelFit], 5),
    };
  }
  if (place.archetypes.includes("sky-island-refuge")) {
    return {
      label: "Sky-island contrast",
      description: "The trip works best when you move vertically and watch desert, woodland, and high-country air trade places.",
      tags: compact(["sky island", "vertical gradient", "ridge to basin", ...place.travelFit], 5),
    };
  }
  if (place.archetypes.includes("rain-shadow-sanctuary")) {
    return {
      label: "Rain-shadow clarity",
      description: "A mountain barrier edits the weather into sharper light, drier roads, and sudden nearby contrasts.",
      tags: compact(["rain shadow", "dry light", "nearby contrast", ...place.travelFit], 5),
    };
  }
  if (place.archetypes.includes("cold-air-pool") || place.archetypes.includes("frost-hollow")) {
    return {
      label: "Cold-air basin",
      description: "The place is most legible at daybreak, when valley floor, midslope, and ridge show different thermal rules.",
      tags: compact(["cold-air pool", "frost hollow", "inversion", ...place.travelFit], 5),
    };
  }
  if (/wine|vineyard|orchard|fruit|grape|apple|citrus|coffee/.test(hay)) {
    return {
      label: "Growing-zone scouting",
      description: "Crops and perennial plantings become field evidence for the climate niche.",
      tags: compact(["orchard clues", "growing zone", "soil read", ...place.travelFit], 5),
    };
  }
  return {
    label: "Microclimate scouting",
    description: "A place starts to make sense when the terrain explains the weather.",
    tags: compact([ARCHETYPE_LABELS[place.archetypes[0]], ...place.travelFit], 5),
  };
}

function bestVisitWindow(place: Place): ClimateTourismProfile["bestVisitWindow"] {
  const windows = computeBestMonths(place);
  const good = windows.filter(w => w.kind === "good");
  const first = good[0] ?? windows[0];
  if (!first) {
    return {
      label: "Scouting window",
      range: "Check local seasonality",
      reason: "The atlas has enough climate structure for a field read, but no single monthly window stands out cleanly.",
    };
  }
  const caution = windows.find(w => w.kind === "caution");
  return {
    label: first.label,
    range: first.range,
    reason: sentence(
      first.note,
      caution
        ? `${first.label} is the cleanest first read; also note ${caution.label.toLowerCase()} in ${caution.range}.`
        : "This is the clearest deterministic travel window from the monthly climate profile.",
      210,
    ),
  };
}

function habitatCues(place: Place): ClimateTourismProfile["wildlifeAndHabitat"] {
  const explicit = compact([
    ...(place.thingsToDo ?? []).filter(a => a.kind === "wildlife").map(a => a.label),
    ...place.travelFit.filter(t => /wildlife|bird|whale|bear|puffin|beluga|habitat|refuge|reserve|park/i.test(t)),
  ], 4);
  const cues = compact([
    explicit.length > 0 ? `Corpus wildlife cue: ${explicit.join(", ")}` : undefined,
    `Habitat cue: ${place.biome}`,
    place.reliefContext ? `Terrain cue: ${sentence(place.reliefContext, "Read slope, water, shade, and exposure together.", 150)}` : undefined,
    place.climate.snowCm?.some(cm => cm >= 15) ? "Seasonal cue: snow persistence changes access, albedo, and habitat timing." : undefined,
    hasDriver(place, ["marine-layer", "upwelling", "lake-effect", "river-moderation", "trade-wind"])
      ? "Water-edge cue: moisture, wind, and thermal moderation can change habitat over short distances."
      : undefined,
    hasDriver(place, ["orographic-lift", "elevation-lapse-rate", "cold-air-drainage", "aspect-slope"])
      ? "Relief cue: elevation, aspect, and drainage sort vegetation and exposure locally."
      : undefined,
  ], 5);

  return {
    headline: explicit.length > 0 ? "Use the named corpus cue, then read the habitat." : "Read habitat cues, not an invented species list.",
    cues: cues.length > 0 ? cues : ["Habitat cue: compare shade, water, slope, and wind exposure in person."],
    caveat: "Wildlife notes are habitat cues unless the atlas corpus explicitly names an activity or species. Verify access, closures, and local conservation guidance.",
  };
}

function lodgingRead(place: Place): ClimateTourismProfile["lodgingRead"] {
  const base = baseName(place);
  const cues = compact([
    `Use ${base} as the base`,
    place.tier === "A" ? "look for walkable historic-core stays or quiet edge-of-town rentals" : undefined,
    place.archetypes.includes("fog-belt-coast") ? "search near the water edge, fog belt, or sheltered harbor" : undefined,
    place.archetypes.includes("sky-island-refuge") ? "search for mountain-town bases near a valley-to-ridge road" : undefined,
    place.archetypes.includes("orchard-valley") || /wine|orchard|fruit|vineyard/i.test(`${place.name} ${place.growability.orchard ?? ""}`)
      ? "search near orchard benches, vineyard districts, or the main valley town"
      : undefined,
    buildSettlementAnchors(place).slice(1, 3).map(s => `compare ${s.name} as a secondary base`).join("; ") || undefined,
  ], 5);
  return {
    base,
    searchCues: cues.length > 0 ? cues : [`Use ${base} as the base`, "search for quiet stays near the profile area"],
    caveat: "Static lodging-style guidance only. Terraclima has no reservation inventory, prices, paid-placement links, named stay partners, or live stay data.",
  };
}

function buildItinerary(place: Place, profileBits: {
  window: ClimateTourismProfile["bestVisitWindow"];
  habitat: ClimateTourismProfile["wildlifeAndHabitat"];
  vibe: ClimateTourismProfile["vibe"];
}): ClimateTourismProfile["itinerary"] {
  const base = baseName(place);
  const activities = buildPracticalActivities(place);
  const nearby = buildNearbyContextRows(place);
  const firstActivity = activities[0];
  const secondActivity = activities[1] ?? firstActivity;
  const contrast = nearby[0];
  const secondContrast = nearby[1] ?? contrast;
  const drivers = topDriverLabels(place).join(", ") || "terrain drivers";
  return {
    title: `Three-day climate scouting loop from ${base}`,
    days: [
      {
        day: 1,
        title: "Read the base climate",
        morning: `Start in ${base}; walk the main settlement edge and note shade, wind, drainage, and building exposure.`,
        afternoon: firstActivity
          ? `${firstActivity.label}: ${sentence(firstActivity.note, "Use the activity as a field check, not just a stop.", 150)}`
          : "Use a short local walk or overlook to compare sun, shade, slope, and water edges.",
        evening: `Review the day's notes against ${place.summaryShort}`,
        climateLens: `Look for the contrast: ${drivers}.`,
      },
      {
        day: 2,
        title: "Follow the gradient",
        morning: contrast
          ? `Drive or walk toward ${contrast.label}; use it as the first side-by-side climate contrast.`
          : "Move from valley floor to midslope or from water edge to interior exposure.",
        afternoon: secondActivity
          ? `${secondActivity.label}: ${sentence(secondActivity.note, "Use the stop to verify terrain and season cues.", 150)}`
          : "Check gardens, roadside vegetation, soil moisture, and wind exposure across the gradient.",
        evening: `Compare comfort after sunset: valley floor, midslope, ridge, water edge, shade, and wind.`,
        climateLens: `The useful question is not only what the weather is, but why it changes over short distance.`,
      },
      {
        day: 3,
        title: "Stress-test the fit",
        morning: `Use the ${profileBits.window.range} window as the reference season and ask what breaks outside it.`,
        afternoon: secondContrast
          ? `Sample ${secondContrast.label} or another nearby baseline so the microclimate does not get mistaken for the whole region.`
          : "Visit a nearby baseline town or road segment and compare heat, wind, moisture, and vegetation.",
        evening: "Sort the notes into travel appeal, liveability fit, and climate-land due diligence questions.",
        climateLens: `${profileBits.vibe.label}: ${profileBits.habitat.headline}`,
      },
    ],
  };
}

function computeScores(place: Place): ClimateTourismProfile["scores"] {
  const geo = buildGeospatialAnalysis(place);
  const goodWindows = computeBestMonths(place).filter(w => w.kind === "good").length;
  const travelRichness = richnessScore(place.travelFit.length, TOURISM_SCORE_PARAMS.travelFitTarget);
  const activityRichness = richnessScore(buildPracticalActivities(place).length, TOURISM_SCORE_PARAMS.activityTarget);
  const bestWindowClarity = richnessScore(goodWindows, TOURISM_SCORE_PARAMS.goodWindowTarget);
  const ease = riskEase(place);
  const wTourism = TOURISM_SCORE_WEIGHTS.tourismAppeal;
  const tourismAppeal = clampScore(
    place.scores.microclimateUniqueness * wTourism.uniqueness +
    place.scores.hiddenGem * wTourism.hiddenGem +
    travelRichness * wTourism.travelRichness +
    activityRichness * wTourism.activityRichness +
    bestWindowClarity * wTourism.bestWindowClarity +
    geo.geospatialSignalScore * wTourism.geospatialSignal +
    ease * wTourism.riskEase,
  );

  const wLive = TOURISM_SCORE_WEIGHTS.wouldLiveHere;
  const wouldLiveHere = clampScore(
    place.scores.resilience * wLive.resilience +
    place.scores.comfort * wLive.comfort +
    place.scores.growability * wLive.growability +
    winterEase(place) * wLive.winterEase +
    summerEase(place) * wLive.summerEase +
    ease * wLive.hazardEase -
    place.scores.tradeoff * TOURISM_SCORE_PARAMS.tradeoffPenaltyScale * wLive.tradeoffPenalty,
  );

  const wLand = TOURISM_SCORE_WEIGHTS.climateLandOptionality;
  const coherentBurden = clampScore(100 - highRiskPenalty(place) * 2.5);
  const climateLandOptionality = clampScore(
    place.scores.resilience * wLand.resilience +
    place.scores.growability * wLand.growability +
    place.scores.microclimateUniqueness * wLand.uniqueness +
    geo.geospatialSignalScore * wLand.geospatialSignal +
    soilUtility(place) * wLand.soilUtility +
    ease * wLand.hazardEase +
    coherentBurden * wLand.coherentBurden -
    highRiskPenalty(place),
  );

  return { tourismAppeal, wouldLiveHere, climateLandOptionality };
}

export function tourismScoreLabel(score: number): TourismScoreLabel {
  if (score >= 86) return "exceptional";
  if (score >= 70) return "strong";
  if (score >= 45) return "moderate";
  return "low";
}

export function buildClimateTourismProfile(place: Place): ClimateTourismProfile {
  const window = bestVisitWindow(place);
  const habitat = habitatCues(place);
  const vibe = vibeFor(place);
  const risks = riskRows(place).slice(0, 4);
  const scores = computeScores(place);
  const geo = buildGeospatialAnalysis(place);
  const lodging = lodgingRead(place);
  const bestFits = compact(place.growability.growsWell, 5);
  const tricky = compact(place.growability.tricky, 4);
  const soilBullets = compact([
    `${place.soil.texture}, ${place.soil.drainage} drainage, pH ${place.soil.phRange[0]}-${place.soil.phRange[1]}.`,
    `${place.soil.waterHolding} water holding; growability ${place.growability.score}/100.`,
    place.soil.notes ? sentence(place.soil.notes, "", 190) : undefined,
    geo.spectralSignals[0] ? `Remote-sensing cue: ${geo.spectralSignals[0].label} (${geo.spectralSignals[0].index}).` : undefined,
  ], 4);
  const itinerary = buildItinerary(place, { window, habitat, vibe });

  return {
    placeId: place.id,
    climateStory: sentence(
      `${place.summaryShort} ${place.whyDistinct}`,
      "Use this place as a field read: terrain, water, elevation, and exposure explain why the weather diverges from the region around it.",
      320,
    ),
    bestVisitWindow: window,
    growThere: {
      headline: `Climate-and-ground fit for ${bestFits[0] ?? "garden experiments"}`,
      bestFits: bestFits.length > 0 ? bestFits : ["Use the growability score as a climate screen."],
      tricky: tricky.length > 0 ? tricky : ["Verify water, frost pockets, soil depth, and local exposure."],
    },
    wildlifeAndHabitat: habitat,
    soilRead: {
      headline: "Read soil as part of the climate mechanism.",
      bullets: soilBullets,
    },
    riskRead: {
      headline: risks[0] ? `Lead screen: ${risks[0].label} (${risks[0].level})` : "Risk screen",
      topRisks: risks.map(r => `${r.label}: ${r.level}${r.note ? ` - ${sentence(r.note, "", 120)}` : ""}`),
      caveat: "Hazards are screening-grade atlas signals. Local official maps, warnings, access rules, and site-scale conditions matter.",
    },
    vibe,
    lodgingRead: lodging,
    itinerary,
    scores,
    scoreNotes: {
      tourismAppeal:
        `Tourism appeal blends uniqueness, hidden-gem signal, trip richness, seasonal clarity, geospatial signal, and risk ease. Label: ${tourismScoreLabel(scores.tourismAppeal)}.`,
      wouldLiveHere:
        "Would I live here? is limited to climate comfort, hazards, resilience, growability, and tradeoffs. It does not use demographics, school quality, crime, politics, income, or market claims.",
      climateLandOptionality:
        "Investment lens: climate/land signal only. This is not financial advice, not a real estate valuation, not a parcel-level recommendation, and not a recommendation to buy.",
    },
  };
}

const TOURISM_PROFILE_CACHE = new WeakMap<Place, ClimateTourismProfile>();

export function getClimateTourismProfile(place: Place): ClimateTourismProfile {
  const cached = TOURISM_PROFILE_CACHE.get(place);
  if (cached) return cached;
  const profile = buildClimateTourismProfile(place);
  TOURISM_PROFILE_CACHE.set(place, profile);
  return profile;
}
