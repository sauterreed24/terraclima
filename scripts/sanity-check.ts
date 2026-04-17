/**
 * Adversarial data sanity check.
 * Flags implausible climate values, missing/inconsistent fields, duplicate IDs,
 * broken references, and growability/soil inconsistencies.
 */
import { PLACES } from "../src/data/places";
import { COLLECTIONS } from "../src/data/collections";
import { CONCEPTS } from "../src/data/glossary";
import { ARCHETYPES } from "../src/data/archetypes";
import { DRIVER_LABELS } from "../src/types";

type Issue = { id: string; severity: "WARN" | "ERROR"; msg: string };
const issues: Issue[] = [];
const report = (id: string, severity: "WARN" | "ERROR", msg: string) =>
  issues.push({ id, severity, msg });

const validArchetypes = new Set(ARCHETYPES.map(a => a.id));
const validDrivers = new Set(Object.keys(DRIVER_LABELS));

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

  // --- Sunshine if present ---
  if (climate.sunshinePct) {
    for (let m = 0; m < 12; m++) {
      if (climate.sunshinePct[m] < 10 || climate.sunshinePct[m] > 100) {
        report(p.id, "WARN", `sunshine month ${m + 1} = ${climate.sunshinePct[m]}%`);
      }
    }
  }

  // --- Snow if present ---
  if (climate.snowCm) {
    for (let m = 0; m < 12; m++) {
      if (climate.snowCm[m] < 0) report(p.id, "ERROR", `negative snow month ${m + 1}`);
    }
  }

  // --- Elevation sanity ---
  if (p.elevationM < -90) report(p.id, "ERROR", `elevation ${p.elevationM}m below Death Valley`);
  if (p.elevationM > 5000) report(p.id, "WARN", `elevation ${p.elevationM}m is very high for a settlement`);

  // --- Archetype / driver validity ---
  for (const a of p.archetypes) if (!validArchetypes.has(a)) report(p.id, "ERROR", `unknown archetype "${a}"`);
  for (const d of p.drivers) if (!validDrivers.has(d)) report(p.id, "ERROR", `unknown driver "${d}"`);

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

  // --- Citation count ---
  if (!p.citations || p.citations.length === 0) {
    report(p.id, "ERROR", `no citations`);
  } else if (p.citations.length === 1 && p.tier !== "C") {
    report(p.id, "WARN", `only one citation for tier ${p.tier} place`);
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

for (const c of CONCEPTS) {
  for (const id of c.exampleIds ?? []) {
    if (!placeIdSet.has(id)) report(`concept:${c.id}`, "ERROR", `unknown example placeId "${id}"`);
  }
}

// --- Report ---
const errs = issues.filter(i => i.severity === "ERROR");
const warns = issues.filter(i => i.severity === "WARN");

for (const i of issues) {
  console.log(`${i.severity.padEnd(5)} ${i.id.padEnd(28)} ${i.msg}`);
}
console.log(`\nTotal places: ${PLACES.length}`);
console.log(`Errors: ${errs.length}  Warnings: ${warns.length}`);
if (errs.length > 0) process.exit(1);
