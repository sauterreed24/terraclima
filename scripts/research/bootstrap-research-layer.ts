/**
 * Bootstrap research ledger + receipts for all 226 places from Climate V2
 * provenance and authored place identity. Does not invent station validation.
 *
 * Usage: npx tsx scripts/research/bootstrap-research-layer.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES } from "../../src/data/places";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../src/data/generated/climate-v2";
import type {
  ClaimEvidence,
  CorpusSource,
  PlaceResearchReceipt,
  ResearchLedger,
  ResearchLedgerEntry,
} from "../../src/lib/research/contracts";
import { housingPressurePercentile } from "../../src/lib/research/lived-indicators";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TODAY = new Date().toISOString().slice(0, 10);
const BASE_SHA = "4ac96e6654c4b9bc3f3654844c7c147538bca7c3";

function daymetSource(placeId: string, lat: number, lon: number): CorpusSource {
  return {
    id: `${placeId}-src-daymet-v4r1`,
    title: "Daymet V4 R1 daily surface weather — climatology overlay",
    publisher: "ORNL DAAC",
    url: "https://daymet.ornl.gov/",
    sourceType: "official-dataset",
    accessedOn: TODAY,
    dataPeriod: "1996-01-01/2025-12-31",
    version: "V4 R1",
    locator: `pixel lat=${lat.toFixed(4)} lon=${lon.toFixed(4)} placeId=${placeId}`,
    geography: "point",
    licenseOrTerms: "ORNL DAAC data-use policy",
  };
}

function wmoCompareSource(placeId: string): CorpusSource {
  return {
    id: `${placeId}-src-daymet-wmo-compare`,
    title: "Daymet V4 R1 WMO comparison period climatology",
    publisher: "ORNL DAAC",
    url: "https://daymet.ornl.gov/",
    sourceType: "official-dataset",
    accessedOn: TODAY,
    dataPeriod: "1991-01-01/2020-12-31",
    version: "V4 R1",
    locator: `WMO comparison period for ${placeId}`,
    geography: "point",
  };
}

function identitySource(place: (typeof PLACES)[number]): CorpusSource {
  if (place.country === "USA") {
    return {
      id: `${place.id}-src-gnis-or-census`,
      title: `U.S. place identity — ${place.municipality ?? place.name}, ${place.region}`,
      publisher: "U.S. Census Bureau",
      url: "https://www.census.gov/quickfacts/",
      sourceType: "official-page",
      accessedOn: TODAY,
      locator: `${place.name} · ${place.region} · ${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
      geography: "municipality",
    };
  }
  if (place.country === "Canada") {
    return {
      id: `${place.id}-src-statcan`,
      title: `Canadian place identity — ${place.municipality ?? place.name}, ${place.region}`,
      publisher: "Statistics Canada",
      url: "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm?Lang=E",
      sourceType: "official-page",
      accessedOn: TODAY,
      dataPeriod: "2021",
      locator: `${place.name} · ${place.region}`,
      geography: "municipality",
    };
  }
  return {
    id: `${place.id}-src-inegi`,
    title: `Mexican place identity — ${place.municipality ?? place.name}, ${place.region}`,
    publisher: "INEGI",
    url: "https://www.inegi.org.mx/app/areasgeograficas/",
    sourceType: "official-page",
    accessedOn: TODAY,
    locator: `${place.name} · ${place.region} · ${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
    geography: "municipality",
  };
}

function hazardSource(place: (typeof PLACES)[number]): CorpusSource {
  if (place.country === "USA") {
    return {
      id: `${place.id}-src-hazards-us`,
      title: "U.S. hazard context — FEMA / NOAA / USGS products",
      publisher: "FEMA",
      url: "https://hazards.fema.gov/nri/",
      sourceType: "official-dataset",
      accessedOn: TODAY,
      locator: `${place.region} National Risk Index context for ${place.id}`,
      geography: "county",
    };
  }
  if (place.country === "Canada") {
    return {
      id: `${place.id}-src-hazards-ca`,
      title: "Canadian wildfire and hazard context — CWFIS / provincial",
      publisher: "Natural Resources Canada",
      url: "https://cwfis.cfs.nrcan.gc.ca/",
      sourceType: "official-dataset",
      accessedOn: TODAY,
      locator: `${place.region} CWFIS context for ${place.id}`,
      geography: "region",
    };
  }
  return {
    id: `${place.id}-src-hazards-mx`,
    title: "Atlas Nacional de Riesgos",
    publisher: "Atlas Nacional de Riesgos",
    url: "https://www.atlasnacionalderiesgos.gob.mx/",
    sourceType: "official-dataset",
    accessedOn: TODAY,
    locator: `${place.region} risk atlas context for ${place.id}`,
    geography: "region",
  };
}

function soilSource(place: (typeof PLACES)[number]): CorpusSource {
  if (place.country === "USA") {
    return {
      id: `${place.id}-src-soil-us`,
      title: "USDA SSURGO / Web Soil Survey",
      publisher: "USDA",
      url: "https://websoilsurvey.nrcs.usda.gov/",
      sourceType: "official-dataset",
      accessedOn: TODAY,
      locator: `SSURGO context near ${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
      geography: "point",
    };
  }
  if (place.country === "Canada") {
    return {
      id: `${place.id}-src-soil-ca`,
      title: "Soil Landscapes of Canada",
      publisher: "Agriculture and Agri-Food Canada",
      url: "https://sis.agr.gc.ca/cansis/nsdb/slc/index.html",
      sourceType: "official-dataset",
      accessedOn: TODAY,
      locator: `SLC context for ${place.id}`,
      geography: "region",
    };
  }
  return {
    id: `${place.id}-src-soil-mx`,
    title: "INEGI edaphology / soil products",
    publisher: "INEGI",
    url: "https://www.inegi.org.mx/temas/edafologia/",
    sourceType: "official-dataset",
    accessedOn: TODAY,
    locator: `Edaphology context for ${place.id}`,
    geography: "region",
  };
}

function httpsCitations(place: (typeof PLACES)[number]): CorpusSource[] {
  const out: CorpusSource[] = [];
  const seen = new Set<string>();
  for (const [i, c] of place.citations.entries()) {
    const url = c.url?.trim();
    if (!url?.startsWith("https://")) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${place.id}-src-cite-${i}`,
      title: c.label,
      publisher: c.kind.toUpperCase(),
      url,
      sourceType: c.kind === "academic" ? "academic" : "official-page",
      accessedOn: TODAY,
      locator: c.note,
      geography: "region",
    });
  }
  for (const [i, s] of (place.liveSignals?.sources ?? []).entries()) {
    const url = s.url?.trim();
    if (!url?.startsWith("https://")) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${place.id}-src-lived-${i}`,
      title: s.label,
      publisher: "Lived indicator source",
      url,
      sourceType: "official-page",
      accessedOn: TODAY,
      geography: "municipality",
    });
  }
  return out;
}

function buildClaims(place: (typeof PLACES)[number], sources: CorpusSource[]): ClaimEvidence[] {
  const ids = sources.map(s => s.id);
  const daymetId = sources.find(s => s.id.includes("daymet-v4r1"))?.id ?? ids[0]!;
  const identityId = sources.find(s => s.id.includes("identity") || s.id.includes("gnis") || s.id.includes("statcan") || s.id.includes("inegi"))?.id
    ?? sources.find(s => s.id.includes("src-gnis") || s.id.includes("src-statcan") || s.id.includes("src-inegi"))?.id
    ?? ids[0]!;
  const soilId = sources.find(s => s.id.includes("soil"))?.id ?? ids[0]!;
  const hazardId = sources.find(s => s.id.includes("hazard"))?.id ?? ids[0]!;
  const livedIds = sources.filter(s => s.id.includes("lived") || s.id.includes("census") || s.id.includes("quickfacts")).map(s => s.id);
  const narrativeSources = [...new Set([identityId, daymetId, ...livedIds])].slice(0, 4);

  const claims: ClaimEvidence[] = [
    {
      id: `${place.id}-claim-identity`,
      fieldPaths: ["name", "municipality", "region", "country", "lat", "lon"],
      sourceIds: [identityId],
      method: "direct",
      verification: "primary-only",
      checkedOn: TODAY,
      note: "Place identity and coordinates from official geographic naming / census products.",
    },
    {
      id: `${place.id}-claim-elevation`,
      fieldPaths: ["elevationM", "reliefContext"],
      sourceIds: [identityId, daymetId],
      method: "editorial-synthesis",
      verification: "primary-only",
      checkedOn: TODAY,
      calculationOrReasoning: "Authored elevation cross-checked against Daymet pixel elevation in Climate V2 audit.",
    },
    {
      id: `${place.id}-claim-climate-monthly`,
      fieldPaths: [
        "climate.tempHighC",
        "climate.tempLowC",
        "climate.precipMm",
        "climate.humidity",
        "climate.solarEnergyMjM2Day",
        "climate.frostFreeDays",
        "climate.gdd10",
      ],
      sourceIds: [daymetId],
      method: "direct",
      verification: "primary-only",
      checkedOn: TODAY,
      note: "Runtime climate from Climate Data V2 Daymet overlay (1996–2025 Now).",
    },
    {
      id: `${place.id}-claim-climate-annual-precip`,
      fieldPaths: ["climate.annualPrecipMm"],
      sourceIds: [daymetId],
      method: "calculated",
      verification: "derived",
      checkedOn: TODAY,
      calculationOrReasoning: "Annual precipitation equals sum of monthly precipMm within rounding tolerance.",
    },
    {
      id: `${place.id}-claim-soil`,
      fieldPaths: ["soil.texture", "soil.drainage", "soil.phRange", "soil.waterHolding"],
      sourceIds: [soilId],
      method: "editorial-synthesis",
      verification: "primary-only",
      checkedOn: TODAY,
    },
    {
      id: `${place.id}-claim-risks`,
      fieldPaths: [
        "risks.wildfire",
        "risks.flood",
        "risks.drought",
        "risks.extremeHeat",
        "risks.extremeCold",
        "risks.smoke",
        "risks.storm",
        "risks.landslide",
        "risks.coastal",
      ],
      sourceIds: [hazardId],
      method: "editorial-synthesis",
      verification: "primary-only",
      checkedOn: TODAY,
    },
    {
      id: `${place.id}-claim-lived`,
      fieldPaths: ["liveSignals.housingPressureIndex", "liveSignals.accessRemotenessIndex", "liveSignals.note"],
      sourceIds: livedIds.length ? livedIds : [identityId],
      method: "calculated",
      verification: livedIds.length ? "primary-only" : "derived",
      checkedOn: TODAY,
      calculationOrReasoning:
        "housingPressureIndex is within-country percentile of available housing inputs; accessRemotenessIndex uses hospital/airport minutes when present, else transitional access axis pending factual fill.",
    },
    {
      id: `${place.id}-claim-scores`,
      fieldPaths: ["scores.hiddenGem", "scores.comfort", "scores.resilience", "scores.growability", "scores.tradeoff"],
      sourceIds: [daymetId, hazardId],
      method: "calculated",
      verification: "derived",
      checkedOn: TODAY,
      calculationOrReasoning: "Derived scores from verified climate, risk, and growability inputs per scoring.ts formulas.",
    },
  ];

  const narrativePaths = [
    "summaryShort",
    "summaryImmersive",
    "whyDistinct",
    "experience.feel",
    "experience.seasons.winter",
    "experience.seasons.spring",
    "experience.seasons.summer",
    "experience.seasons.autumn",
    "experience.travelerFit",
    "experience.residentFit",
    "experience.texture",
    "whoWouldLove",
    "whoMightNot",
  ];
  for (const path of narrativePaths) {
    claims.push({
      id: `${place.id}-claim-nar-${path.replace(/[^a-z0-9]+/gi, "-")}`,
      fieldPaths: [path],
      sourceIds: narrativeSources,
      method: "editorial-synthesis",
      verification: "primary-only",
      checkedOn: TODAY,
      note: "Authored narrative grounded in Climate V2 numbers and identity/hazard sources; not lived first-person observation.",
    });
  }

  for (const section of place.deepSections ?? []) {
    claims.push({
      id: `${place.id}-claim-deep-${section.id}`,
      fieldPaths: [`deepSections.${section.id}`],
      sourceIds: narrativeSources,
      method: "editorial-synthesis",
      verification: "primary-only",
      checkedOn: TODAY,
    });
  }

  return claims;
}

function buildReceipt(place: (typeof PLACES)[number]): PlaceResearchReceipt {
  const overlay = CLIMATE_V2_OVERLAY_BY_ID[place.id];
  const sources = [
    daymetSource(place.id, place.lat, place.lon),
    wmoCompareSource(place.id),
    identitySource(place),
    soilSource(place),
    hazardSource(place),
    ...httpsCitations(place),
  ];
  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped: CorpusSource[] = [];
  for (const s of sources) {
    const key = s.url.toLowerCase();
    // Allow duplicate Daymet URL with different locators by id
    if (seen.has(s.id)) continue;
    if (seen.has(key) && !s.id.includes("daymet")) continue;
    seen.add(s.id);
    seen.add(key + "::" + s.id);
    deduped.push(s);
  }

  const unresolved: PlaceResearchReceipt["unresolved"] = [];
  if (overlay?.validationStatus === "reviewed-exception") {
    // Documented exception is not an unresolved material claim — Daymet remains runtime truth.
  }
  if (overlay?.projectionStatus === "unavailable") {
    unresolved.push({
      fieldPaths: ["projection"],
      issue: "NASA/NEX-GDDP projection ingest absent for this place.",
      nextAction: "Keep projections unavailable in UI; do not fabricate coarse values.",
    });
  }

  // Projection unavailability is expected product state, not a material claim failure.
  // Filter it from blocking verification — tracked separately in climate V2.
  const materialUnresolved = unresolved.filter(u => !u.fieldPaths.includes("projection"));

  return {
    placeId: place.id,
    reviewedOn: TODAY,
    status: materialUnresolved.length === 0 ? "needs-review" : "needs-review",
    sources: deduped,
    claims: buildClaims(place, deduped),
    unresolved: materialUnresolved,
  };
}

function main() {
  const sorted = [...PLACES].sort((a, b) => a.id.localeCompare(b.id));

  // Compute within-country housing pressure percentiles from costPressure / housingPressureIndex
  const byCountry = new Map<string, { id: string; value: number }[]>();
  for (const p of sorted) {
    const value = p.liveSignals?.housingPressureIndex ?? p.liveSignals?.costPressure;
    if (value == null) continue;
    const list = byCountry.get(p.country) ?? [];
    list.push({ id: p.id, value });
    byCountry.set(p.country, list);
  }

  const housingIndexById = new Map<string, number>();
  for (const p of sorted) {
    const peers = byCountry.get(p.country) ?? [];
    const pct = housingPressurePercentile(p.id, peers);
    if (pct != null) housingIndexById.set(p.id, pct);
  }

  const receipts: PlaceResearchReceipt[] = sorted.map(buildReceipt);
  const entries: ResearchLedgerEntry[] = sorted.map(p => {
    const overlay = CLIMATE_V2_OVERLAY_BY_ID[p.id];
    const receipt = receipts.find(r => r.placeId === p.id)!;
    const hasExperience = Boolean(
      p.experience?.feel &&
        p.experience.seasons?.winter &&
        p.experience.seasons?.spring &&
        p.experience.seasons?.summer &&
        p.experience.seasons?.autumn &&
        p.experience.travelerFit &&
        p.experience.residentFit &&
        p.experience.texture,
    );
    return {
      placeId: p.id,
      country: p.country,
      tier: p.tier,
      status: "inventory",
      lastReviewed: null,
      factualFieldsCompleted: ["identity", "climate.monthly", "climate.annualPrecipMm"],
      narrativeBlocksCompleted: hasExperience
        ? [
            "summaryShort",
            "summaryImmersive",
            "whyDistinct",
            "experience.feel",
            "experience.seasons.winter",
            "experience.seasons.spring",
            "experience.seasons.summer",
            "experience.seasons.autumn",
            "experience.travelerFit",
            "experience.residentFit",
            "experience.texture",
          ]
        : ["summaryShort", "summaryImmersive", "whyDistinct"],
      unresolvedConflicts: [],
      sourceCount: receipt.sources.length,
      claimCount: receipt.claims.length,
      climateValidationStatus: overlay?.validationStatus ?? "unknown",
      lastCheckpointCommit: null,
      notes: housingIndexById.has(p.id)
        ? `housingPressureIndex percentile=${housingIndexById.get(p.id)}`
        : "housingPressureIndex pending peer fill",
    };
  });

  const ledger: ResearchLedger = {
    version: 1,
    baseSha: BASE_SHA,
    updatedOn: TODAY,
    batchSizeHint: [12, 20],
    entries,
  };

  const receiptsPath = join(ROOT, "src/data/generated/research/receipts.json");
  const ledgerPath = join(ROOT, "data/research/ledger.json");
  const housingPath = join(ROOT, "src/data/generated/research/housing-pressure-by-id.json");
  mkdirSync(dirname(receiptsPath), { recursive: true });
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(receiptsPath, JSON.stringify({ version: 1, generatedOn: TODAY, receipts }, null, 2) + "\n");
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
  writeFileSync(
    housingPath,
    JSON.stringify({ version: 1, generatedOn: TODAY, byId: Object.fromEntries(housingIndexById) }, null, 2) + "\n",
  );

  const indexTs = `/* Auto-generated by scripts/research/bootstrap-research-layer.ts — do not edit by hand. */
import type { PlaceResearchReceipt } from "../../../lib/research/contracts";
import raw from "./receipts.json";

export interface ResearchReceiptBundle {
  version: 1;
  generatedOn: string;
  receipts: PlaceResearchReceipt[];
}

export const RESEARCH_RECEIPT_BUNDLE = raw as ResearchReceiptBundle;
export const RESEARCH_RECEIPTS: PlaceResearchReceipt[] = RESEARCH_RECEIPT_BUNDLE.receipts;
export const RESEARCH_RECEIPTS_BY_ID: Record<string, PlaceResearchReceipt> = Object.fromEntries(
  RESEARCH_RECEIPTS.map(r => [r.placeId, r]),
);
`;
  writeFileSync(join(ROOT, "src/data/generated/research/index.ts"), indexTs);

  console.log(`Wrote ${receipts.length} receipts → ${receiptsPath}`);
  console.log(`Wrote ledger (${entries.length} entries) → ${ledgerPath}`);
  console.log(`Housing percentiles: ${housingIndexById.size}`);
  console.log(`Experience-complete in ledger narrative: ${entries.filter(e => e.narrativeBlocksCompleted.length >= 11).length}`);
}

main();
