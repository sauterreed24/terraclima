import type { Place, RiskLevel, ZoneActivity, ZoneSettlement } from "../types";
import { DRIVER_LABELS } from "../types";
import { getBestMonths } from "./best-months";
import { buildGeospatialAnalysis } from "./geospatial-analysis";

export type PracticalReadId = "agriculture" | "spatial" | "housing" | "nearby";
export type PracticalReadTone = "sage" | "ice" | "ember" | "aurora";

export interface PracticalReadCard {
  id: PracticalReadId;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  tone: PracticalReadTone;
}

export interface PracticalActivity extends ZoneActivity {
  source: "authored" | "derived";
}

export interface SettlementAnchor extends ZoneSettlement {
  source: "authored" | "primary" | "contrast" | "regional";
  relation: string;
}

export interface NearbyContextRow {
  label: string;
  note: string;
  placeId?: string;
  source: "nearby-contrast" | "local-contrast" | "derived";
}

const RISK_LABEL: Record<string, string> = {
  wildfire: "wildfire",
  flood: "flood",
  drought: "drought",
  extremeHeat: "extreme heat",
  extremeCold: "extreme cold",
  smoke: "smoke",
  storm: "storm",
  landslide: "slope",
  coastal: "coastal",
};

const RISK_RANK: Record<RiskLevel, number> = {
  "very-low": 0,
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  "very-high": 5,
};

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function cleanList(items: readonly string[], max = 4): string {
  const clean = uniq(items.map(s => s.trim()).filter(Boolean));
  if (clean.length === 0) return "none called out";
  const head = clean.slice(0, max);
  const rest = clean.length - head.length;
  return rest > 0 ? `${head.join(", ")}, plus ${rest} more` : head.join(", ");
}

function trimSentence(s: string | undefined, fallback: string, max = 220): string {
  const text = (s?.trim() || fallback).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function baseName(place: Place): string {
  const fromMunicipality = place.municipality?.split("/")[0]?.trim();
  if (fromMunicipality) return fromMunicipality;
  return place.name
    .replace(/\([^)]*\)/g, "")
    .split("&")[0]!
    .split(",")[0]!
    .trim() || place.name;
}

function riskRows(place: Place): Array<{ key: string; label: string; level: RiskLevel; note?: string }> {
  const rows = Object.entries(place.risks).map(([key, risk]) => ({
    key,
    label: RISK_LABEL[key] ?? key,
    level: risk.level,
    note: risk.note,
  }));
  rows.sort((a, b) => RISK_RANK[b.level] - RISK_RANK[a.level]);
  return rows;
}

function topRiskPhrase(place: Place, max = 3): string {
  return riskRows(place)
    .slice(0, max)
    .map(r => `${r.label} (${r.level})`)
    .join(", ");
}

function waterYearPhrase(place: Place): string {
  const precip = place.climate.precipMm;
  let wet = 0;
  let dry = 0;
  for (let i = 1; i < precip.length; i++) {
    if (precip[i]! > precip[wet]!) wet = i;
    if (precip[i]! < precip[dry]!) dry = i;
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `wettest around ${months[wet]}, driest around ${months[dry]}`;
}

function bestOutdoorSeason(place: Place): string {
  const windows = getBestMonths(place);
  const outdoor = windows.find(w => /outdoor|hike|dry|comfort/i.test(w.label)) ?? windows[0];
  return outdoor ? outdoor.range : "seasonal windows vary by exposure";
}

export function buildPracticalReadCards(place: Place): PracticalReadCard[] {
  const geo = buildGeospatialAnalysis(place);
  const driverLabels = place.drivers.map(d => DRIVER_LABELS[d] ?? d);
  const spectral = geo.spectralSignals.slice(0, 2).map(s => s.label);
  const frost = place.climate.frostFreeDays != null
    ? `about ${place.climate.frostFreeDays} non-freezing days per year (not a continuous growing season)`
    : "annual non-freezing-day count not estimated";
  const gdd = place.climate.gdd10 != null ? `GDD10 about ${Math.round(place.climate.gdd10)}` : "heat units not estimated";
  const soilPh = `${place.soil.phRange[0]}-${place.soil.phRange[1]}`;
  const nearbyRows = buildNearbyContextRows(place);
  const activities = buildPracticalActivities(place);
  const anchors = buildSettlementAnchors(place);
  const anchorNames = anchors.length > 0 ? anchors.slice(0, 2).map(a => a.name).join(", ") : baseName(place);

  return [
    {
      id: "agriculture",
      eyebrow: "Agriculture",
      title: "What the ground can grow",
      tone: "sage",
      body:
        `Read the growing signal as climate plus ground truth: ${place.growability.score}/100 growability on ${place.soil.texture}, ${place.soil.drainage} drainage, pH ${soilPh}, and ${place.soil.waterHolding} water holding. ${trimSentence(place.growability.homeGarden ?? place.growability.orchard, "Use the crop list as a climate fit screen, then verify irrigation, frost pockets, and soil depth locally.")}`,
      bullets: [
        `Best fits: ${cleanList(place.growability.growsWell, 5)}`,
        `Needs care: ${cleanList(place.growability.tricky, 4)}`,
        `Season to verify: ${frost}; ${gdd}`,
      ],
    },
    {
      id: "spatial",
      eyebrow: "Spatial",
      title: "How to read the terrain",
      tone: "ice",
      body:
        `This is a landscape pattern, not just a weather-station average. The profile scores ${geo.geospatialSignalScore}/100 for geospatial signal and ${geo.eoObservabilityScore}/100 for earth-observation fit, with ${geo.analysisConfidence} analysis confidence.`,
      bullets: [
        `Terrain engines: ${cleanList(driverLabels, 4)}`,
        `Relief context: ${trimSentence(place.reliefContext, "Read slope, aspect, water, and elevation together.")}`,
        `Analyst checks: ${cleanList(spectral, 3)}; relief texture ${geo.structuralTextureScore}/100`,
      ],
    },
    {
      id: "housing",
      eyebrow: "Homes & land",
      title: "Homes, land, and tradeoffs",
      tone: "ember",
      body:
        `Use this as climate and land due diligence, not a housing-market claim. Strongest fit: ${trimSentence(place.whoWouldLove, "Start with the fit tags, then check water, access, and exposure.")} Harder fit: ${trimSentence(place.whoMightNot, "Some households will find the tradeoffs too large.")}`,
      bullets: [
        `Main climate checks: ${topRiskPhrase(place, 4)}`,
        `Long-term read: ${trimSentence(place.climateChange.resilienceNote, "Climate outlook should be verified against local hazard maps.")}`,
        `Practical anchors: ${anchorNames}`,
      ],
    },
    {
      id: "nearby",
      eyebrow: "Nearby",
      title: "Walk the contrasts",
      tone: "aurora",
      body:
        `Use the place as a base for side-by-side scouting. Walk or drive across elevation, water, shade, and exposure changes before assuming one average describes the whole zone.`,
      bullets: [
        `Trip modes: ${cleanList(place.travelFit, 4)}`,
        `Outdoor window: ${bestOutdoorSeason(place)}; water year is ${waterYearPhrase(place)}`,
        `Compare against: ${cleanList(nearbyRows.map(r => r.label), 3)}; start with ${cleanList(activities.map(a => a.label), 2)}`,
      ],
    },
  ];
}

export function buildPracticalActivities(place: Place): PracticalActivity[] {
  const targetMax = place.tier === "A" ? 6 : place.tier === "B" ? 5 : Infinity;
  const authored = (place.thingsToDo ?? []).map(a => ({ ...a, source: "authored" as const }));
  if (place.tier === "C") return authored;
  const out: PracticalActivity[] = [...authored];
  const labels = new Set(out.map(a => a.label.toLowerCase()));

  const add = (activity: ZoneActivity) => {
    if (labels.has(activity.label.toLowerCase())) return;
    labels.add(activity.label.toLowerCase());
    out.push({ ...activity, source: "derived" });
  };

  const drivers = cleanList(place.drivers.map(d => DRIVER_LABELS[d] ?? d), 3);
  const bestSeason = bestOutdoorSeason(place);
  const water = waterYearPhrase(place);

  add({
    label: "Read the terrain gradient on foot or by road",
    kind: "trail",
    season: bestSeason,
    note: `Use short walks, overlooks, or a valley-to-ridge drive to see how ${drivers} changes shade, wind, and temperature.`,
  });
  add({
    label: "Compare the main town with a nearby climate contrast",
    kind: "vista",
    season: "clear days",
    note: `Make the atlas practical by comparing this stop with ${cleanList(buildNearbyContextRows(place).map(r => r.label), 2)}.`,
  });
  add({
    label: "Check gardens, drainage, and shade in person",
    kind: "nature",
    season: "growing season",
    note: `Look for the same signals behind the growability score: soil depth, water access, frost pooling, and afternoon shade.`,
  });
  add({
    label: "Plan around the wet and dry parts of the year",
    kind: "seasonal",
    season: water,
    note: `Travel, trail footing, roof work, and planting all change when the local water year shifts from ${water}.`,
  });
  if ((place.climate.snowCm ?? []).some(cm => cm > 10)) {
    add({
      label: "Scout winter access and snow behavior",
      kind: "winter-sport",
      season: "winter",
      note: "Snow, plowing, freeze-thaw, and shaded road cuts can matter as much as the monthly average.",
    });
  }
  if (/lake|coast|bay|river|fjord|water|shore/i.test(`${place.name} ${place.biome} ${place.reliefContext}`)) {
    add({
      label: "Watch the water-edge microclimate",
      kind: "water",
      season: "shoulder seasons",
      note: "Breezes, fog, lake moderation, floodplain position, and shoreline exposure can flip comfort over short distances.",
    });
  }
  if (/orchard|wine|vineyard|fruit|garden|coffee|citrus/i.test(`${place.name} ${place.growability.growsWell.join(" ")} ${place.growability.orchard ?? ""}`)) {
    add({
      label: "Follow the local food and orchard clues",
      kind: "food-drink",
      season: "harvest window",
      note: `Crops and perennial plantings are field evidence for the climate niche: ${cleanList(place.growability.growsWell, 4)}.`,
    });
  }

  return out.slice(0, targetMax);
}

export function buildSettlementAnchors(place: Place): SettlementAnchor[] {
  const targetMin = place.tier === "A" ? 2 : place.tier === "B" ? 1 : 0;
  const out: SettlementAnchor[] = (place.settlementsWithinZone ?? []).map(s => ({
    ...s,
    source: "authored" as const,
    relation: "In-zone settlement",
  }));
  const names = new Set(out.map(s => s.name.toLowerCase()));
  const add = (anchor: Omit<SettlementAnchor, "source"> & { source: SettlementAnchor["source"] }) => {
    if (names.has(anchor.name.toLowerCase())) return;
    names.add(anchor.name.toLowerCase());
    out.push(anchor);
  };

  if (out.length < targetMin) {
    const name = baseName(place);
    add({
      name,
      role: place.tier === "A" ? "hub" : "town",
      source: "primary",
      relation: "Primary profile base",
      note: `${name} is the practical base named by this profile; use it to line up roads, services, water, and parcel-scale exposure before widening the search.`,
    });
  }

  for (const n of place.nearbyContrasts ?? []) {
    if (out.length >= targetMin) break;
    add({
      name: n.label,
      role: "waypoint",
      source: "contrast",
      relation: "Nearby contrast base",
      note: `A comparison point for the local climate gradient: ${trimSentence(n.note, "Use it for side-by-side scouting, not as a claim that it shares the same microclimate.")}`,
    });
  }

  if (out.length < targetMin) {
    add({
      name: `${place.region} context`,
      role: "waypoint",
      source: "regional",
      relation: "Regional context",
      note: `Use the wider ${place.region} context to compare services, access, hazard maps, and land constraints around this microclimate.`,
    });
  }

  return out;
}

export function buildNearbyContextRows(place: Place): NearbyContextRow[] {
  const targetMin = place.tier === "A" ? 2 : place.tier === "B" ? 1 : 0;
  const out: NearbyContextRow[] = [];

  for (const n of place.nearbyContrasts ?? []) {
    out.push({
      label: n.label,
      note: n.note,
      placeId: n.placeId,
      source: "nearby-contrast",
    });
  }
  for (const c of place.localContrast ?? []) {
    if (!c.note) continue;
    out.push({
      label: `Within ${c.radiusKm} km`,
      note: c.note,
      source: "local-contrast",
    });
  }
  if (out.length < targetMin) {
    out.push({
      label: "Immediate site exposure",
      note: "Compare sun, shade, slope, drainage, and wind exposure over a short walk or drive; the atlas point is a starting coordinate, not a parcel survey.",
      source: "derived",
    });
  }
  if (out.length < targetMin) {
    out.push({
      label: "Regional baseline",
      note: `Use surrounding ${place.region} terrain and towns as a baseline so the microclimate signal does not get mistaken for the whole region.`,
      source: "derived",
    });
  }
  return out;
}
