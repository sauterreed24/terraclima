// ============================================================
// Terraclima — Place Intelligence Schema
// ============================================================
// This schema models a single "place" at sufficient depth to
// power microclimate analysis, relocation scouting, hidden-gem
// discovery, growability guidance, and climate-risk briefing.
// All numeric climate fields use metric: °C, mm, m, km/h.
// ============================================================

export type Country = "USA" | "Mexico" | "Canada";

export type Confidence = "high" | "moderate" | "low";

export type Tier = "A" | "B" | "C";
// A = flagship deep dive (full narrative + charts)
// B = spotlight place (concise but structured)
// C = broad searchable index (short descriptor)

export type MicroclimateArchetype =
  | "rain-shadow-sanctuary"
  | "sky-island-refuge"
  | "eternal-spring-highland"
  | "cool-summer-maritime"
  | "fog-belt-coast"
  | "orchard-valley"
  | "basin-inversion"
  | "cold-air-pool"
  | "thermal-belt"
  | "lake-moderated"
  | "lake-effect-snowbelt"
  | "chinook-corridor"
  | "santa-ana-corridor"
  | "gap-wind-corridor"
  | "high-desert-escape"
  | "canyon-sheltered"
  | "coastal-upwelling"
  | "monsoon-edge"
  | "humidity-refuge"
  | "mild-winter-foothills"
  | "mediterranean-pocket"
  | "cloud-forest"
  | "volcanic-upland"
  | "limestone-karst"
  | "river-valley-moderation"
  | "urban-heat-contrast"
  | "desert-oasis"
  | "hyper-maritime"
  | "fjord-inlet"
  | "driftless-relief"
  | "piedmont-transition"
  | "alpine-tundra"
  | "subarctic-continental"
  | "tropical-isothermal"
  | "tropical-dry"
  | "hurricane-coast"
  | "frost-hollow"
  | "badland-steppe";

export type TopographicDriver =
  | "orographic-lift"
  | "rain-shadow"
  | "elevation-lapse-rate"
  | "cold-air-drainage"
  | "marine-layer"
  | "upwelling"
  | "chinook-foehn"
  | "lake-effect"
  | "gap-winds"
  | "inversion"
  | "aspect-slope"
  | "monsoon-lift"
  | "karst-infiltration"
  | "river-moderation"
  | "santa-ana"
  | "katabatic-flow"
  | "sea-breeze"
  | "continentality"
  | "polar-jet-exposure"
  | "tropical-convection"
  | "trade-wind"
  | "hurricane-track";

export type RiskLevel = "very-low" | "low" | "moderate" | "elevated" | "high" | "very-high";

export type RiskDirection = "improving" | "stable" | "worsening" | "mixed";

export interface RiskAssessment {
  level: RiskLevel;
  note?: string;
  /** Direction of change under current warming trajectories. */
  trend?: RiskDirection;
}

/** Twelve monthly values, Jan..Dec. */
export type Monthly12 = [number, number, number, number, number, number, number, number, number, number, number, number];

export interface ClimateProfile {
  /** Mean daily high by month (°C). */
  tempHighC: Monthly12;
  /** Mean daily low by month (°C). */
  tempLowC: Monthly12;
  /** Mean precipitation by month (mm). */
  precipMm: Monthly12;
  /** Mean snowfall by month (cm). Optional. */
  snowCm?: Monthly12;
  /** Relative humidity mean by month (%). Optional. */
  humidity?: Monthly12;
  /** Sunshine % of possible by month. Optional. */
  sunshinePct?: Monthly12;
  /** Annual precipitation (mm), computed or given directly. */
  annualPrecipMm?: number;
  /** Approximate frost-free days per year. */
  frostFreeDays?: number;
  /** Growing degree days (base 10°C) rough estimate. */
  gdd10?: number;
  /** USDA hardiness zone or Canadian equivalent. */
  hardinessZone?: string;
  /** Est. chill hours below 7.2°C. */
  chillHours?: number;
  /** Typical diurnal swing (°C) — summer midpoint. */
  diurnalSummerC?: number;
  /** Typical diurnal swing (°C) — winter midpoint. */
  diurnalWinterC?: number;
}

export interface SoilProfile {
  texture: string;                // e.g. "sandy loam over gravel"
  drainage: "excessive" | "good" | "moderate" | "imperfect" | "poor";
  phRange: [number, number];
  organicMatterPct?: [number, number];
  waterHolding: "low" | "moderate" | "high";
  notes?: string;                 // regional soils, parent material, etc.
}

export interface Growability {
  score: number;                  // 0..100
  hardinessZone?: string;
  growsWell: string[];
  tricky: string[];
  orchard?: string;               // vineyard / orchard analog
  homeGarden?: string;            // home-gardener-oriented note
}

export interface ClimateChangeOutlook {
  /** Short text on mid-century (~2050) direction. */
  outlook2050: string;
  /** Short text on late-century (~2100) direction. */
  outlook2100: string;
  /** Variables expected to shift the most, with direction. */
  keyShifts: { variable: string; direction: "up" | "down" | "mixed"; note?: string }[];
  /** Rough resilience read: does terrain/position insulate this place? */
  resilienceNote: string;
}

/** Local contrast vs nearby surrounding ring. */
export interface LocalContrast {
  radiusKm: number;
  summerHighDeltaC?: number;     // + = warmer than surroundings
  winterLowDeltaC?: number;
  precipDeltaPct?: number;       // relative annual precip delta
  humidityDeltaPct?: number;
  growingSeasonDeltaDays?: number;
  note?: string;
}

export interface ScoreBundle {
  hiddenGem: number;              // 0..100
  microclimateUniqueness: number; // 0..100
  comfort: number;                // 0..100 (habitability for typical adult)
  resilience: number;             // 0..100 (climate-change resilience)
  growability: number;            // 0..100
  tradeoff: number;               // 0..100 (higher = more significant tradeoffs)
}

export interface Citation {
  label: string;
  kind: "noaa" | "prism" | "usda" | "usgs" | "fema" | "epa" | "eccc" | "climate-atlas-canada" | "smn" | "inegi" | "inecc" | "atlas-riesgos" | "worldclim" | "soilgrids" | "nasa-nex" | "cmip6" | "oss-data" | "academic" | "field-observation" | "other";
  note?: string;
  url?: string;
}

/**
 * A populated settlement that shares this microclimate zone. Keeps both
 * structured attributes (population, role) and a light prose note so the
 * detail panel can surface human context alongside terrain & climate.
 */
export interface ZoneSettlement {
  name: string;
  /** What role this settlement plays within the zone. */
  role: "hub" | "town" | "village" | "hamlet" | "resort" | "ranching" | "tribal" | "waypoint" | "ghost-town";
  /** Rough population — kept as a string so we can say "~3,500" etc. */
  population?: string;
  /** Optional one-liner: what makes this settlement noteworthy in-zone. */
  note?: string;
}

/**
 * A curated activity or attraction within the microclimate zone. We group
 * things loosely by cadence so the UI can theme accordingly (e.g. a
 * seasonal icon for "summer-only" experiences).
 */
export interface ZoneActivity {
  label: string;
  /** Functional category — UI chip + future filtering. */
  kind:
    | "nature"
    | "trail"
    | "vista"
    | "water"
    | "stargazing"
    | "wildlife"
    | "culture"
    | "food-drink"
    | "seasonal"
    | "winter-sport"
    | "urban"
    | "historic";
  /** When it's best: "year-round", "summer", "winter", "shoulder seasons", etc. */
  season?: string;
  note?: string;
}

export interface Place {
  id: string;
  tier: Tier;

  // Location
  country: Country;
  region: string;                    // State / province / territory
  municipality?: string;             // Nearest town / municipality
  name: string;                      // Place display name
  lat: number;
  lon: number;
  elevationM: number;
  reliefContext: string;             // e.g. "Cochise / Chiricahua uplift, 1500 m above surrounding desert"

  // Classification
  biome: string;                     // e.g. "Madrean pine-oak woodland"
  koppen: string;                    // e.g. "Csb", "BSk", "Cfb", "Cwb"
  archetypes: MicroclimateArchetype[];
  drivers: TopographicDriver[];

  // Narrative
  summaryShort: string;              // 1 sentence
  summaryImmersive: string;          // 1 rich paragraph (Tier A/B)
  whyDistinct: string;               // Explicit mechanism-based explanation

  // Data profiles
  climate: ClimateProfile;
  soil: SoilProfile;
  growability: Growability;
  climateChange: ClimateChangeOutlook;

  // Risk matrix
  risks: {
    wildfire: RiskAssessment;
    flood: RiskAssessment;
    drought: RiskAssessment;
    extremeHeat: RiskAssessment;
    extremeCold: RiskAssessment;
    smoke: RiskAssessment;
    storm: RiskAssessment;        // severe conv. storms / winter storms / tropical
    landslide: RiskAssessment;
    coastal: RiskAssessment;      // SLR + surge; use "very-low" for inland
  };

  // Local contrast
  localContrast?: LocalContrast[];
  nearbyContrasts?: { placeId?: string; label: string; note: string }[];

  // Scoring
  scores: ScoreBundle;

  // Fit tags
  relocationFit: string[];           // e.g. ["retirees", "remote workers", "young families"]
  travelFit: string[];               // e.g. ["spring wildflowers", "dark-sky observers"]
  whoWouldLove: string;
  whoMightNot: string;

  // Integrity
  confidence: Confidence;
  confidenceNotes?: string;
  citations: Citation[];

  /**
   * Populated places that share this microclimate zone — helps anchor the
   * abstract climate signal in lived context (e.g. "Sierra Vista, Hereford,
   * Bisbee all share the Huachuca sky-island influence").
   */
  settlementsWithinZone?: ZoneSettlement[];
  /**
   * Curated things to do inside the zone. Optional; when present the detail
   * panel renders a compact grid with kind/season chips.
   */
  thingsToDo?: ZoneActivity[];
}

/** Derived helpers. */
export const MONTHS: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const ARCHETYPE_LABELS: Record<MicroclimateArchetype, string> = {
  "rain-shadow-sanctuary": "Rain-Shadow Sanctuary",
  "sky-island-refuge": "Sky-Island Refuge",
  "eternal-spring-highland": "Eternal-Spring Highland",
  "cool-summer-maritime": "Cool-Summer Maritime",
  "fog-belt-coast": "Fog-Belt Coast",
  "orchard-valley": "Orchard Valley",
  "basin-inversion": "Basin Inversion",
  "cold-air-pool": "Cold-Air Pool",
  "thermal-belt": "Thermal Belt",
  "lake-moderated": "Lake-Moderated",
  "lake-effect-snowbelt": "Lake-Effect Snowbelt",
  "chinook-corridor": "Chinook Corridor",
  "santa-ana-corridor": "Santa Ana / Sundowner Corridor",
  "gap-wind-corridor": "Gap / Gorge Wind Corridor",
  "high-desert-escape": "High-Desert Escape",
  "canyon-sheltered": "Canyon-Sheltered",
  "coastal-upwelling": "Coastal-Upwelling Belt",
  "monsoon-edge": "Monsoon-Edge Zone",
  "humidity-refuge": "Humidity Refuge",
  "mild-winter-foothills": "Mild-Winter Foothills",
  "mediterranean-pocket": "Mediterranean Pocket",
  "cloud-forest": "Cloud Forest",
  "volcanic-upland": "Volcanic Upland",
  "limestone-karst": "Limestone / Karst Pocket",
  "river-valley-moderation": "River-Valley Moderation",
  "urban-heat-contrast": "Urban Heat Contrast",
  "desert-oasis": "Desert Oasis",
  "hyper-maritime": "Hyper-Maritime",
  "fjord-inlet": "Fjord / Inlet Coast",
  "driftless-relief": "Driftless Relief Pocket",
  "piedmont-transition": "Piedmont Transition",
  "alpine-tundra": "Alpine Tundra",
  "subarctic-continental": "Subarctic Continental",
  "tropical-isothermal": "Tropical Isothermal Coast",
  "tropical-dry": "Tropical Wet-Dry",
  "hurricane-coast": "Hurricane-Exposed Coast",
  "frost-hollow": "Frost Hollow",
  "badland-steppe": "Badland / Steppe Pocket",
};

export const DRIVER_LABELS: Record<TopographicDriver, string> = {
  "orographic-lift": "Orographic lift",
  "rain-shadow": "Rain shadow",
  "elevation-lapse-rate": "Elevation lapse rate",
  "cold-air-drainage": "Cold-air drainage",
  "marine-layer": "Marine layer",
  "upwelling": "Coastal upwelling",
  "chinook-foehn": "Chinook / foehn downslope",
  "lake-effect": "Lake effect",
  "gap-winds": "Gap winds",
  "inversion": "Temperature inversion",
  "aspect-slope": "Slope / aspect",
  "monsoon-lift": "Monsoon convective lift",
  "karst-infiltration": "Karst infiltration",
  "river-moderation": "River-valley moderation",
  "santa-ana": "Santa Ana / sundowner downslope",
  "katabatic-flow": "Katabatic drainage flow",
  "sea-breeze": "Diurnal sea breeze",
  "continentality": "Continental extremity",
  "polar-jet-exposure": "Polar jet / arctic front",
  "tropical-convection": "Tropical convective regime",
  "trade-wind": "Trade-wind regime",
  "hurricane-track": "Tropical-cyclone exposure",
};
