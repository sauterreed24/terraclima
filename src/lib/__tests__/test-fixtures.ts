import type { Place, ClimateProfile, RiskAssessment, Monthly12 } from "../../types";

const monthly = (...vals: number[]): Monthly12 => {
  if (vals.length === 1) return Array(12).fill(vals[0]) as Monthly12;
  if (vals.length !== 12) throw new Error(`monthly() needs 1 or 12 values, got ${vals.length}`);
  return vals as unknown as Monthly12;
};

const lowRisk: RiskAssessment = { level: "low" };

export function makeClimate(overrides: Partial<ClimateProfile> = {}): ClimateProfile {
  return {
    tempHighC: monthly(8, 10, 14, 18, 22, 26, 28, 27, 24, 19, 13, 9),
    tempLowC: monthly(0, 1, 4, 7, 11, 15, 17, 16, 13, 8, 3, 1),
    precipMm: monthly(40, 38, 50, 55, 60, 45, 30, 28, 40, 50, 55, 45),
    snowCm: monthly(20, 16, 8, 0, 0, 0, 0, 0, 0, 0, 6, 18),
    humidity: monthly(70, 65, 60, 55, 55, 50, 48, 50, 55, 60, 65, 70),
    annualPrecipMm: 536,
    diurnalSummerC: 11,
    ...overrides,
  };
}

export function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "test-place",
    tier: "B",
    country: "USA",
    region: "Test State",
    name: "Test Place",
    lat: 40,
    lon: -100,
    elevationM: 1000,
    reliefContext: "test relief",
    biome: "test biome",
    koppen: "Csb",
    archetypes: ["mediterranean-pocket"],
    drivers: ["orographic-lift"],
    summaryShort: "test summary",
    summaryImmersive: "test long summary",
    whyDistinct: "test distinct",
    climate: makeClimate(),
    soil: {
      texture: "loam",
      drainage: "good",
      phRange: [6.0, 7.0],
      waterHolding: "moderate",
    },
    growability: {
      score: 70,
      hardinessZone: "8a",
      growsWell: ["lavender"],
      tricky: ["citrus"],
    },
    climateChange: {
      outlook2050: "warmer",
      outlook2100: "much warmer",
      keyShifts: [],
      resilienceNote: "moderate",
    },
    risks: {
      wildfire: lowRisk,
      flood: lowRisk,
      drought: lowRisk,
      extremeHeat: lowRisk,
      extremeCold: lowRisk,
      smoke: lowRisk,
      storm: lowRisk,
      landslide: lowRisk,
      coastal: { level: "very-low" },
    },
    scores: {
      hiddenGem: 60,
      microclimateUniqueness: 55,
      comfort: 70,
      resilience: 72,
      growability: 70,
      tradeoff: 30,
    },
    relocationFit: ["remote workers"],
    travelFit: ["spring wildflowers"],
    whoWouldLove: "lovers of cool summers",
    whoMightNot: "heat seekers",
    confidence: "high",
    citations: [],
    ...overrides,
  };
}
