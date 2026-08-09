/**
 * Adversarial data sanity check.
 * Flags implausible climate values, missing/inconsistent fields, duplicate IDs,
 * broken references, and growability/soil inconsistencies.
 */
import { PLACES } from "../src/data/places";
import { rankPlaces } from "../src/lib/scoring";
import { COLLECTIONS } from "../src/data/collections";
import { CLIMATE_TRIP_THEMES } from "../src/data/climate-trip-themes";
import { CONCEPTS } from "../src/data/glossary";
import { ARCHETYPES } from "../src/data/archetypes";
import { DRIVER_LABELS } from "../src/types";
import { assertAtlasCorpusHealthy } from "../src/lib/atlas-corpus-stats";
import { buildGeospatialAnalysis } from "../src/lib/geospatial-analysis";
import { mergeDeepSections } from "../src/lib/place-appendix-sections";
import { safeExternalHref } from "../src/lib/safe-url";
import { koppenAudit, type KoppenAuditLevel } from "../src/lib/koppen";
import { computeBioclim } from "../src/lib/bioclim";
import {
  buildNearbyContextRows,
  buildPracticalActivities,
  buildPracticalReadCards,
  buildSettlementAnchors,
} from "../src/lib/practical-read";
import {
  ALLOWED_CITATION_KINDS,
  ALLOWED_CONFIDENCE,
  findDuplicateCitations,
  validatePlaceEvidence,
} from "../src/lib/evidence-summary";

type Issue = { id: string; severity: "WARN" | "ERROR"; msg: string };
const issues: Issue[] = [];
const report = (id: string, severity: "WARN" | "ERROR", msg: string) =>
  issues.push({ id, severity, msg });

const koppenLevels: Record<KoppenAuditLevel, number> = { match: 0, subclass: 0, boundary: 0, divergent: 0, skip: 0 };
const bioclimSummary = {
  classified: 0,
  deMartonneNullColdMat: 0,
  selianinovNullArctic: 0,
  unepNullFrozen: 0,
};

const validArchetypes = new Set(ARCHETYPES.map(a => a.id));
const validDrivers = new Set(Object.keys(DRIVER_LABELS));

/**
 * E2 — archetype ↔ driver alignment expectations. When a place uses one of
 * these archetypes, the listed driver should appear in `place.drivers` (warn,
 * not error — editorial discretion still wins, but a missing core driver is a
 * frequent omission worth flagging). Keys list a *family* of acceptable
 * drivers because the same archetype can manifest via different mechanisms
 * (e.g. "lake-moderated" can be lake-, sea-, or river-driven).
 */
const ARCHETYPE_DRIVER_EXPECTATIONS: Record<string, readonly string[]> = {
  "rain-shadow-sanctuary": ["rain-shadow"],
  "fog-belt-coast": ["marine-layer", "upwelling"],
  "coastal-upwelling": ["upwelling"],
  "chinook-corridor": ["chinook-foehn"],
  "santa-ana-corridor": ["santa-ana"],
  "gap-wind-corridor": ["gap-winds"],
  "lake-effect-snowbelt": ["lake-effect", "orographic-lift"],
  "lake-moderated": ["lake-effect", "river-moderation", "marine-layer", "sea-breeze", "continentality"],
  "monsoon-edge": ["monsoon-lift", "tropical-convection"],
  "frost-hollow": ["cold-air-drainage", "inversion", "katabatic-flow"],
  "cold-air-pool": ["cold-air-drainage", "inversion", "katabatic-flow"],
  "basin-inversion": ["inversion", "cold-air-drainage"],
  "limestone-karst": ["karst-infiltration"],
  "river-valley-moderation": ["river-moderation"],
  "thermal-belt": ["aspect-slope", "elevation-lapse-rate"],
  "alpine-tundra": ["elevation-lapse-rate", "polar-jet-exposure"],
  "sky-island-refuge": ["elevation-lapse-rate", "orographic-lift"],
  "eternal-spring-highland": ["elevation-lapse-rate", "tropical-convection"],
  "hurricane-coast": ["hurricane-track", "tropical-convection"],
};

// Duplicate id check
{
  const seen = new Map<string, number>();
  for (const p of PLACES) seen.set(p.id, (seen.get(p.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) report(id, "ERROR", `duplicate place id, seen ${n} times`);
}

for (const p of PLACES) {
  // --- Coordinates sanity (North America) ---
  if (p.lat < 14 || p.lat > 72) report(p.id, "ERROR", `latitude ${p.lat} outside plausible North American range`);
  if (p.lon < -170 || p.lon > -52) report(p.id, "ERROR", `longitude ${p.lon} outside plausible North American range`);

  // --- Monthly data lengths ---
  const climate = p.climate;
  for (const k of ["tempHighC", "tempLowC", "precipMm"] as const) {
    if (climate[k].length !== 12) report(p.id, "ERROR", `${k} has ${climate[k].length} entries, expected 12`);
  }
  // Optional monthly arrays are read by 12-month loops elsewhere; a short/long
  // one would silently yield undefined→NaN downstream (the per-month range
  // checks below skip undefined), so validate length here too.
  for (const k of ["snowCm", "humidity", "sunshinePct", "solarEnergyMjM2Day"] as const) {
    const arr = climate[k];
    if (arr && arr.length !== 12) report(p.id, "ERROR", `${k} has ${arr.length} entries, expected 12`);
  }

  // --- Temperature sanity: high >= low each month ---
  for (let m = 0; m < 12; m++) {
    const hi = climate.tempHighC[m];
    const lo = climate.tempLowC[m];
    if (hi < lo) report(p.id, "ERROR", `month ${m + 1}: high (${hi}) < low (${lo})`);
    if (hi - lo > 30) report(p.id, "WARN", `month ${m + 1}: diurnal ${Math.round(hi - lo)}°C is suspicious`);
    if (hi - lo < 2 && p.biome !== "Low-Arctic tundra") report(p.id, "WARN", `month ${m + 1}: diurnal ${hi - lo}°C is unusually small`);
    if (hi > 55 || lo < -55) report(p.id, "WARN", `month ${m + 1}: extreme value high=${hi} low=${lo}`);
  }

  // --- Precipitation sanity ---
  const pSum = climate.precipMm.reduce((a, b) => a + b, 0);
  if (climate.annualPrecipMm != null) {
    const delta = Math.abs(pSum - climate.annualPrecipMm);
    if (delta > Math.max(30, climate.annualPrecipMm * 0.08)) {
      report(p.id, "WARN", `annualPrecipMm ${climate.annualPrecipMm} vs sum ${pSum} (delta ${delta})`);
    }
  }
  for (let m = 0; m < 12; m++) {
    if (climate.precipMm[m] < 0) report(p.id, "ERROR", `negative precip month ${m + 1}`);
    if (climate.precipMm[m] > 900) report(p.id, "WARN", `month ${m + 1}: precip ${climate.precipMm[m]}mm is very high`);
  }

  // --- Humidity if present ---
  if (climate.humidity) {
    for (let m = 0; m < 12; m++) {
      if (climate.humidity[m] < 10 || climate.humidity[m] > 100) {
        report(p.id, "WARN", `humidity month ${m + 1} = ${climate.humidity[m]}%`);
      }
    }
  }

  // --- Legacy sunshine % if present ---
  if (climate.sunshinePct) {
    for (let m = 0; m < 12; m++) {
      if (climate.sunshinePct[m] < 10 || climate.sunshinePct[m] > 100) {
        report(p.id, "WARN", `sunshine month ${m + 1} = ${climate.sunshinePct[m]}%`);
      }
    }
  }

  // --- Solar resource (MJ/m²/day) if present ---
  if (climate.solarEnergyMjM2Day) {
    for (let m = 0; m < 12; m++) {
      const v = climate.solarEnergyMjM2Day[m];
      if (!Number.isFinite(v) || v < 0 || v > 45) {
        report(p.id, "WARN", `solarEnergy month ${m + 1} = ${v} MJ/m²/day`);
      }
    }
  }

  // --- Snow if present ---
  if (climate.snowCm) {
    for (let m = 0; m < 12; m++) {
      if (climate.snowCm[m] < 0) report(p.id, "ERROR", `negative snow month ${m + 1}`);
      // 300cm/month outside polar latitudes is a data-entry typo signal.
      if (climate.snowCm[m] > 300 && p.lat < 60) {
        report(p.id, "WARN", `snow month ${m + 1}: ${climate.snowCm[m]}cm at lat ${p.lat}`);
      }
    }
    // Snowfall normals at a place whose coldest *monthly mean* low ≥ 3 °C AND
    // coldest monthly mean high ≥ 6 °C are physically implausible — at those
    // monthly averages, nightly excursions rarely reach freezing and an
    // accumulating snow normal is almost certainly a data entry error.
    if (climate.snowCm.some(s => s > 0)) {
      const minLow = Math.min(...climate.tempLowC);
      const minHigh = Math.min(...climate.tempHighC);
      if (minLow >= 3 && minHigh >= 6) {
        report(p.id, "WARN", `snowfall present but no month's normals approach freezing (coldest monthly low ${minLow}°C, coldest monthly high ${minHigh}°C)`);
      }
    }
  }

  // --- Köppen label vs the class computed from the monthly normals ---
  // The authored `koppen` string should be derivable from this place's own
  // temperature + precipitation. A *family* disagreement only errors when the
  // place is NOT near the dividing isotherm/aridity line ("divergent" —
  // a real mislabel); near-threshold disagreements are expected Köppen
  // knife-edges and are only counted (see the summary line below).
  const ka = koppenAudit(p);
  koppenLevels[ka.level] += 1;
  if (ka.level === "divergent") {
    report(p.id, "ERROR", `Köppen label "${p.koppen}" diverges from computed ${ka.computed?.code} with no nearby class boundary — likely mislabel`);
  }

  // --- Bioclimatic indices vs the monthly normals ---
  // Five citable, deterministic indices (De Martonne, Conrad, Thornthwaite PET,
  // Selianinov, UNEP). Each may legitimately be `null` for documented reasons
  // (MAT below −10 for De Martonne, no growing-season month for Selianinov,
  // every month below freezing for UNEP). Errors only on *unexpected* non-
  // finite values or out-of-range numeric outputs; tropical-flag warnings keep
  // the audit honest about Thornthwaite's known high-heat behaviour.
  const bio = computeBioclim(p);
  if (bio) {
    bioclimSummary.classified += 1;
    // De Martonne
    if (bio.deMartonne.value === null) {
      if (bio.breakdown.matC > -10) {
        report(p.id, "ERROR", `De Martonne unexpectedly null with MAT ${bio.breakdown.matC} > -10`);
      } else {
        bioclimSummary.deMartonneNullColdMat += 1;
      }
    } else if (!Number.isFinite(bio.deMartonne.value)) {
      report(p.id, "ERROR", `De Martonne non-finite (${bio.deMartonne.value})`);
    } else if (bio.deMartonne.value < 0 || bio.deMartonne.value > 500) {
      // De Martonne diverges as MAT approaches -10 from above, so cold-humid
      // places (alpine, sub-Arctic) can legitimately reach the hundreds. The
      // [0, 500] band is wide enough for those edge cases but still catches
      // genuine data anomalies (e.g. wrong precip units land in the thousands).
      report(p.id, "WARN", `De Martonne ${bio.deMartonne.value} outside [0, 500]`);
    }
    // Conrad continentality
    if (bio.conrad.value === null || !Number.isFinite(bio.conrad.value)) {
      report(p.id, "ERROR", `Conrad continentality non-finite`);
    } else if (bio.conrad.value < -20 || bio.conrad.value > 130) {
      report(p.id, "WARN", `Conrad continentality ${bio.conrad.value} outside [-20, 130]`);
    }
    // Thornthwaite PET
    const pet = bio.thornthwaitePet.value;
    if (!Number.isFinite(pet) || pet < 0) {
      report(p.id, "ERROR", `Thornthwaite PET ${pet} is non-finite or negative`);
    } else if (pet > 2500) {
      report(p.id, "WARN", `Thornthwaite PET ${pet.toFixed(0)} mm/yr > 2500 (high-heat overshoot)`);
    } else if (pet < 100 && bio.breakdown.matC > 10) {
      report(p.id, "WARN", `Thornthwaite PET ${pet.toFixed(0)} mm/yr suspiciously low for MAT ${bio.breakdown.matC}°C`);
    }
    // Selianinov HTC
    if (bio.selianinov.value === null) {
      if (bio.breakdown.growingSeasonMonths > 0) {
        report(p.id, "ERROR", `Selianinov unexpectedly null with ${bio.breakdown.growingSeasonMonths} growing-season months`);
      } else {
        bioclimSummary.selianinovNullArctic += 1;
      }
    } else if (!Number.isFinite(bio.selianinov.value)) {
      report(p.id, "ERROR", `Selianinov non-finite`);
    } else if (bio.selianinov.value > 50) {
      report(p.id, "WARN", `Selianinov HTC ${bio.selianinov.value} > 50 (tropical-monsoon territory)`);
    }
    // UNEP aridity
    if (bio.unepAridity.value === null) {
      if (pet > 0) {
        report(p.id, "ERROR", `UNEP aridity unexpectedly null with PET ${pet} > 0`);
      } else {
        bioclimSummary.unepNullFrozen += 1;
      }
    } else if (!Number.isFinite(bio.unepAridity.value)) {
      report(p.id, "ERROR", `UNEP aridity non-finite`);
    } else if (bio.unepAridity.value < 0 || bio.unepAridity.value > 8) {
      report(p.id, "WARN", `UNEP aridity ${bio.unepAridity.value} outside [0, 8]`);
    }
  }

  // --- E5: monthly temperature monotonicity sanity ---
  // Flag absurd month-to-month jumps (>18°C delta) — typical seasonal swings
  // anywhere in NA stay under that. Catches typos like a stray "230" in tempHighC.
  for (let m = 0; m < 12; m++) {
    const next = (m + 1) % 12;
    const dh = Math.abs(climate.tempHighC[next] - climate.tempHighC[m]);
    const dl = Math.abs(climate.tempLowC[next] - climate.tempLowC[m]);
    if (dh > 18) report(p.id, "WARN", `tempHighC month ${m + 1}→${next + 1} delta ${dh.toFixed(0)}°C is implausible`);
    if (dl > 18) report(p.id, "WARN", `tempLowC month ${m + 1}→${next + 1} delta ${dl.toFixed(0)}°C is implausible`);
  }

  // --- E4: optional-field plausibility ---
  if (climate.gdd10 != null && climate.gdd10 < 0) {
    report(p.id, "ERROR", `gdd10 ${climate.gdd10} is negative`);
  }
  if (climate.frostFreeDays != null && (climate.frostFreeDays < 0 || climate.frostFreeDays > 366)) {
    report(p.id, "ERROR", `frostFreeDays ${climate.frostFreeDays} out of [0, 366]`);
  }
  if (climate.chillHours != null && (climate.chillHours < 0 || climate.chillHours > 4500)) {
    report(p.id, "WARN", `chillHours ${climate.chillHours} is unusual`);
  }

  // --- Elevation sanity ---
  if (p.elevationM < -90) report(p.id, "ERROR", `elevation ${p.elevationM}m below Death Valley`);
  if (p.elevationM > 5000) report(p.id, "WARN", `elevation ${p.elevationM}m is very high for a settlement`);

  // --- Archetype / driver validity ---
  for (const a of p.archetypes) if (!validArchetypes.has(a)) report(p.id, "ERROR", `unknown archetype "${a}"`);
  for (const d of p.drivers) if (!validDrivers.has(d)) report(p.id, "ERROR", `unknown driver "${d}"`);

  // --- E2: archetype ↔ driver alignment ---
  const driverSet = new Set<string>(p.drivers);
  for (const a of p.archetypes) {
    const expected = ARCHETYPE_DRIVER_EXPECTATIONS[a];
    if (!expected) continue;
    const hasAny = expected.some(d => driverSet.has(d));
    if (!hasAny) {
      report(p.id, "WARN", `archetype "${a}" usually carries one of [${expected.join(", ")}] in drivers`);
    }
  }

  // --- E3: deepSection id uniqueness within a place ---
  if (p.deepSections) {
    const seenIds = new Map<string, number>();
    for (const s of p.deepSections) {
      seenIds.set(s.id, (seenIds.get(s.id) ?? 0) + 1);
      if (!s.title.trim()) report(p.id, "ERROR", `deepSection "${s.id}" has empty title`);
      if (s.paragraphs.length < 1) report(p.id, "ERROR", `deepSection "${s.id}" has no paragraphs`);
      for (const [i, para] of s.paragraphs.entries()) {
        if (para.trim().length < 80) report(p.id, "ERROR", `deepSection "${s.id}" paragraph ${i + 1} too short`);
      }
    }
    for (const [sid, n] of seenIds) {
      if (n > 1) report(p.id, "ERROR", `deepSection id "${sid}" appears ${n}× within this place`);
    }
  }
  if (p.tier === "A" && (p.deepSections?.length ?? 0) < 3) {
    report(p.id, "ERROR", `tier A place has fewer than 3 deepSections`);
  }
  if (p.tier === "B" && (p.deepSections?.length ?? 0) < 2) {
    report(p.id, "ERROR", `tier B place has fewer than 2 deepSections`);
  }

  // --- Required prose fields ---
  for (const field of ["summaryShort", "summaryImmersive", "whyDistinct", "reliefContext"] as const) {
    if (!p[field] || (p[field] as string).trim().length < 30) {
      report(p.id, "ERROR", `${field} missing or too short`);
    }
  }

  // --- Growability score vs frost-free days sanity ---
  if (p.growability.score > 85 && (climate.frostFreeDays ?? 365) < 150) {
    report(p.id, "WARN", `growability score ${p.growability.score} with only ${climate.frostFreeDays} frost-free days`);
  }

  // --- Scores in valid range ---
  for (const [key, val] of Object.entries(p.scores)) {
    if (val < 0 || val > 100) report(p.id, "ERROR", `score ${key}=${val} out of [0,100]`);
  }

  // --- Geospatial analysis invariants ---
  const geo = buildGeospatialAnalysis(p);
  if (geo.geospatialSignalScore < 0 || geo.geospatialSignalScore > 100) {
    report(p.id, "ERROR", `geospatialSignalScore ${geo.geospatialSignalScore} out of [0,100]`);
  }
  if (geo.eoObservabilityScore < 0 || geo.eoObservabilityScore > 100) {
    report(p.id, "ERROR", `eoObservabilityScore ${geo.eoObservabilityScore} out of [0,100]`);
  }
  if (geo.structuralTextureScore < 0 || geo.structuralTextureScore > 100) {
    report(p.id, "ERROR", `structuralTextureScore ${geo.structuralTextureScore} out of [0,100]`);
  }
  for (const source of geo.sourceFits) {
    if (source.score < 0 || source.score > 100) report(p.id, "ERROR", `${source.sourceId} source fit ${source.score} out of [0,100]`);
  }
  if (geo.spectralSignals.length < 2) report(p.id, "WARN", `only ${geo.spectralSignals.length} spectral signals`);
  if (!Number.isFinite(geo.reliefEnergyMPerKm) || !Number.isFinite(geo.hydroSeasonalityRatio)) {
    report(p.id, "ERROR", `non-finite geospatial metrics`);
  }

  // --- Citation count ---
  if (!p.citations || p.citations.length === 0) {
    report(p.id, "ERROR", `no citations`);
  } else if (p.citations.length === 1 && p.tier !== "C") {
    report(p.id, "WARN", `only one citation for tier ${p.tier} place`);
  }
  for (const c of p.citations) {
    if (c.url != null && safeExternalHref(c.url) == null) {
      report(p.id, "ERROR", `citation "${c.label}" has unsafe or malformed URL "${c.url}"`);
    }
    if (!c.label?.trim()) {
      report(p.id, "ERROR", `citation kind ${c.kind} has an empty label`);
    }
    if (!(ALLOWED_CITATION_KINDS as readonly string[]).includes(c.kind)) {
      report(p.id, "ERROR", `citation kind "${c.kind}" is not allowlisted`);
    }
  }
  if (!(ALLOWED_CONFIDENCE as readonly string[]).includes(p.confidence)) {
    report(p.id, "ERROR", `confidence "${p.confidence}" is not allowlisted`);
  }
  for (const label of findDuplicateCitations(p.citations)) {
    report(p.id, "ERROR", `duplicate citation "${label}"`);
  }
  for (const err of validatePlaceEvidence(p)) {
    if (/projection override/.test(err)) {
      report(p.id, "ERROR", err);
    }
  }
  if (p.tier === "A" || p.tier === "B") {
    if (!p.confidenceNotes?.trim()) {
      report(p.id, "ERROR", `tier ${p.tier} place missing confidenceNotes`);
    }
    const urlCitationCount = p.citations.filter(c => safeExternalHref(c.url) != null).length;
    if (urlCitationCount < 2) {
      report(p.id, "ERROR", `tier ${p.tier} place has ${urlCitationCount} URL citations, expected at least 2`);
    }
  }

  // --- A/B effective corpus polish coverage ---
  // Counts the rendered typed corpus, including deterministic context derived
  // from existing place fields. This keeps the UI rich without inventing
  // unsupported market data or fake named attractions.
  if (p.tier === "A" || p.tier === "B") {
    const minDeep = p.tier === "A" ? 4 : 3;
    const minActivities = p.tier === "A" ? 4 : 3;
    const minSettlementAnchors = p.tier === "A" ? 2 : 1;
    const minNearbyRows = p.tier === "A" ? 2 : 1;
    const cards = buildPracticalReadCards(p);
    const badCards = cards.filter(card => !card.title.trim() || !card.body.trim() || card.bullets.length < 3 || card.bullets.some(b => !b.trim()));
    if (cards.length !== 4 || badCards.length > 0) {
      report(p.id, "ERROR", `practical read should render 4 complete cards, got ${cards.length} (${badCards.length} incomplete)`);
    }
    const deep = mergeDeepSections(p);
    if (deep.length < minDeep) {
      report(p.id, "ERROR", `effective deep section count ${deep.length}, expected at least ${minDeep}`);
    }
    const activities = buildPracticalActivities(p);
    if (activities.length < minActivities) {
      report(p.id, "ERROR", `effective activity count ${activities.length}, expected at least ${minActivities}`);
    }
    const settlementAnchors = buildSettlementAnchors(p);
    if (settlementAnchors.length < minSettlementAnchors) {
      report(p.id, "ERROR", `effective settlement/scouting anchor count ${settlementAnchors.length}, expected at least ${minSettlementAnchors}`);
    }
    const nearbyRows = buildNearbyContextRows(p);
    if (nearbyRows.length < minNearbyRows) {
      report(p.id, "ERROR", `effective nearby context count ${nearbyRows.length}, expected at least ${minNearbyRows}`);
    }
  }

  // --- Hardiness zone sanity vs Jan low ---
  const zone = climate.hardinessZone ?? p.growability.hardinessZone ?? "";
  const janLow = Math.min(...climate.tempLowC);
  if (/^0[ab]|1a/.test(zone) && janLow > -30) report(p.id, "WARN", `hardiness ${zone} but Jan low ${janLow}°C`);
  if (/1[0-3][ab]|1[0-3] /.test(zone) && janLow < 0) report(p.id, "WARN", `hardiness ${zone} but Jan low ${janLow}°C`);

  // --- soil pH sanity ---
  const [ph1, ph2] = p.soil.phRange;
  if (ph1 < 3 || ph2 > 9.5 || ph1 > ph2) report(p.id, "WARN", `pH range [${ph1}, ${ph2}]`);

  // --- nearbyContrasts ids ---
  for (const lc of p.localContrast ?? []) {
    if (!Number.isFinite(lc.radiusKm) || lc.radiusKm <= 0) {
      report(p.id, "ERROR", `localContrast radiusKm ${lc.radiusKm} is not positive/finite`);
    } else if (lc.radiusKm < 1 || lc.radiusKm > 250) {
      report(p.id, "WARN", `localContrast radiusKm ${lc.radiusKm}km is unusual`);
    }
  }
  for (const nc of p.nearbyContrasts ?? []) {
    if (nc.placeId && !PLACES.some(x => x.id === nc.placeId)) {
      report(p.id, "ERROR", `nearbyContrast references unknown placeId "${nc.placeId}"`);
    }
  }
}

// --- Collections referential integrity ---
const placeIdSet = new Set(PLACES.map(p => p.id));
for (const c of COLLECTIONS) {
  for (const pid of c.placeIds) {
    if (!placeIdSet.has(pid)) report(`collection:${c.id}`, "ERROR", `unknown placeId "${pid}"`);
  }
  if (c.placeIds.length < 3) report(`collection:${c.id}`, "WARN", `only ${c.placeIds.length} places`);
}

// --- Climate trip theme referential integrity ---
{
  const seen = new Set<string>();
  for (const t of CLIMATE_TRIP_THEMES) {
    if (seen.has(t.id)) report(`climate-trip:${t.id}`, "ERROR", `duplicate climate trip theme id`);
    seen.add(t.id);
    for (const pid of t.placeIds) {
      if (!placeIdSet.has(pid)) report(`climate-trip:${t.id}`, "ERROR", `unknown placeId "${pid}"`);
    }
    for (const a of t.archetypeFilters ?? []) {
      if (!validArchetypes.has(a)) report(`climate-trip:${t.id}`, "ERROR", `unknown archetype filter "${a}"`);
    }
    if (t.placeIds.length < 3) report(`climate-trip:${t.id}`, "WARN", `only ${t.placeIds.length} places`);
  }
}

for (const c of CONCEPTS) {
  for (const id of c.exampleIds ?? []) {
    if (!placeIdSet.has(id)) report(`concept:${c.id}`, "ERROR", `unknown example placeId "${id}"`);
  }
}

// --- Tier-aware editorial gaps (WARN) ---
const HUMIDITY_ARCHETYPES = new Set(["fog-belt-coast", "cool-summer-maritime"]);
for (const p of PLACES) {
  if (p.archetypes.some(a => HUMIDITY_ARCHETYPES.has(a)) && p.climate.humidity == null) {
    report(p.id, "WARN", "humidity missing for fog-belt / cool-summer-maritime archetype");
  }
}

for (const profile of ["best-for-remote-work", "best-retirement"] as const) {
  const top = rankPlaces(profile, PLACES).slice(0, 20);
  for (const row of top) {
    if (!row.place.liveSignals) {
      report(row.place.id, "WARN", `top-20 ${profile} rank lacks liveSignals`);
    }
  }
}

// --- Climate-projection override integrity (authored Place.projection) ---
// The default projection is a coarse SOURCED regional table in code; only
// authored per-place overrides live in the corpus, so validate those here.
// Plausibility bounds keep a typo from morphing a place into an absurd 2050.
function checkProjectionDelta(id: string, scen: string, d: { deltaJJAHighC: number; deltaJANLowC: number; deltaPrecipPct: number }): void {
  const checks: Array<[string, number, number, number]> = [
    ["deltaJJAHighC", d.deltaJJAHighC, -2, 12],
    ["deltaJANLowC", d.deltaJANLowC, -2, 12],
    ["deltaPrecipPct", d.deltaPrecipPct, -60, 80],
  ];
  for (const [k, v, lo, hi] of checks) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      report(id, "ERROR", `projection ${scen}.${k} is not a finite number`);
      continue;
    }
    if (v < lo || v > hi) {
      report(id, "ERROR", `projection ${scen}.${k}=${v} outside plausible ${lo}..${hi}`);
    }
  }
}
for (const p of PLACES) {
  const proj = p.projection;
  if (!proj) continue;
  if (proj.ssp245) checkProjectionDelta(p.id, "ssp245", proj.ssp245);
  if (proj.ssp585) checkProjectionDelta(p.id, "ssp585", proj.ssp585);
  if (proj.ssp245 && proj.ssp585 && proj.ssp585.deltaJJAHighC + 1e-9 < proj.ssp245.deltaJJAHighC) {
    report(p.id, "WARN", "projection ssp585 summer warming below ssp245 (check pathway ordering)");
  }
}

// --- Atlas-wide corpus invariants (percentile arrays) ---
try {
  assertAtlasCorpusHealthy();
} catch (e) {
  report("atlas-corpus", "ERROR", e instanceof Error ? e.message : String(e));
}

// --- Report ---
const errs = issues.filter(i => i.severity === "ERROR");
const warns = issues.filter(i => i.severity === "WARN");

for (const i of issues) {
  console.log(`${i.severity.padEnd(5)} ${i.id.padEnd(28)} ${i.msg}`);
}
console.log(`\nTotal places: ${PLACES.length}`);
console.log(
  `Köppen class check: ${koppenLevels.match} match, ${koppenLevels.subclass} sub-class, ` +
  `${koppenLevels.boundary} boundary, ${koppenLevels.divergent} divergent, ${koppenLevels.skip} skip`,
);
console.log(
  `Bioclimatic indices: ${bioclimSummary.classified} classified` +
  (bioclimSummary.deMartonneNullColdMat ? ` · ${bioclimSummary.deMartonneNullColdMat} De Martonne null (MAT ≤ −10)` : "") +
  (bioclimSummary.selianinovNullArctic ? ` · ${bioclimSummary.selianinovNullArctic} Selianinov null (no growing season)` : "") +
  (bioclimSummary.unepNullFrozen ? ` · ${bioclimSummary.unepNullFrozen} UNEP null (all months frozen)` : ""),
);
console.log(`Errors: ${errs.length}  Warnings: ${warns.length}`);
if (errs.length > 0) process.exit(1);
