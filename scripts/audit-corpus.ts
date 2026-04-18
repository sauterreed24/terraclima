/**
 * Comprehensive Terraclima prose & data audit.
 *
 * Scans every authored narrative string in the corpus and reports:
 *   1. °C leftovers after imperial localization (fatal)
 *   2. Metric-distance leftovers after imperial pass (reported, not fatal)
 *   3. Typography issues:
 *        - repeated adjacent words            (fatal)
 *        - double spaces / trailing spaces    (fatal)
 *        - ASCII "-" used as a real minus     (fatal)
 *        - "--" / " -- " used as em-dash      (fatal)
 *        - straight quotes inside prose       (warning)
 *   4. Cross-checks between prose and structured data:
 *        - Any "N m" elevation claim near the place name should match
 *          `elevationM` within a generous tolerance.
 *        - Any "highs near/around X°C" phrase should be within 6°C of the
 *          max monthly `tempHighC`.
 *        - Any "lows near/around X°C" phrase should be within 6°C of the
 *          min monthly `tempLowC`.
 *
 * Run with `npx tsx scripts/audit-corpus.ts` (or via `npm run audit`).
 * Exit code 1 on any fatal finding so CI / pre-commit can gate on it.
 */
import { localizeProse } from "../src/lib/units";
import { PLACES } from "../src/data/places";
import { CONCEPTS } from "../src/data/glossary";
import { COLLECTIONS } from "../src/data/collections";
import type { Place } from "../src/types";

// ---------- Config ----------

const TOLERANCE_TEMP_C = 6;       // generous; prose talks peaks, data talks means
const TOLERANCE_ELEV_PCT = 0.15;  // 15% drift allowed for elevation claims
const TOLERANCE_ELEV_ABS = 80;    // OR 80 m absolute drift

// ---------- Report bookkeeping ----------

interface Finding {
  severity: "fatal" | "warn";
  where: string;
  message: string;
  sample?: string;
}
const findings: Finding[] = [];

function record(severity: Finding["severity"], where: string, message: string, sample?: string) {
  findings.push({ severity, where, message, sample });
}

// ---------- Enumerate all authored prose fields per place ----------

function placeFields(p: Place): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const push = (name: string, s: string | undefined | null) => {
    if (s && s.trim()) out.push([name, s]);
  };
  push("summaryShort", p.summaryShort);
  push("summaryImmersive", p.summaryImmersive);
  push("whyDistinct", p.whyDistinct);
  push("reliefContext", p.reliefContext);
  push("soil.notes", p.soil?.notes);
  push("growability.orchard", p.growability?.orchard);
  push("growability.homeGarden", p.growability?.homeGarden);
  push("climateChange.outlook2050", p.climateChange?.outlook2050);
  push("climateChange.outlook2100", p.climateChange?.outlook2100);
  push("climateChange.resilienceNote", p.climateChange?.resilienceNote);
  push("whoWouldLove", p.whoWouldLove);
  push("whoMightNot", p.whoMightNot);
  for (const lc of p.localContrast ?? []) push(`localContrast.note`, lc.note);
  for (const nc of p.nearbyContrasts ?? []) push(`nearbyContrast[${nc.label}].note`, nc.note);
  const risks = p.risks as unknown as Record<string, { note?: string }>;
  for (const k of Object.keys(risks ?? {})) push(`risks.${k}.note`, risks[k]?.note);
  return out;
}

// ---------- Check 1: unit-conversion residues ----------

const METRIC_SCAN = /\b\d+(?:[,.]\d+)*\s*(mm|cm|km\/h|kph|km|m)\b/g;
let metricLeftoverCount = 0;

function checkUnitResidues(where: string, text: string) {
  const imperial = localizeProse(text, "F", "imperial");
  if (/°C/.test(imperial)) {
    record("fatal", where, "°C leftover after imperial localization", imperial.slice(0, 160));
  }
  const rem = imperial.match(METRIC_SCAN);
  if (rem) metricLeftoverCount += rem.length;
  // Report the first couple per field so we don't spam
  if (process.env.SHOW_METRIC && rem) {
    for (const r of rem.slice(0, 3)) {
      const i = imperial.indexOf(r);
      const ctx = imperial.substring(Math.max(0, i - 50), Math.min(imperial.length, i + r.length + 50));
      record("warn", where, `metric residue: ${r}`, `…${ctx}…`);
    }
  }
}

// ---------- Check 2: typography ----------

// Tokens that legitimately repeat (e.g. "had had" isn't in our corpus, but
// some idioms like "one-on-one" can look like repeats if tokenized badly).
const REPEAT_WORD_WHITELIST = new Set(["that", "had", "is"]);

function checkTypography(where: string, text: string) {
  // Repeated adjacent words (case-insensitive, word chars only, min length 2).
  const repeatRE = /\b([a-zA-Z]{2,})\s+\1\b/g;
  for (const m of text.matchAll(repeatRE)) {
    const w = m[1].toLowerCase();
    if (REPEAT_WORD_WHITELIST.has(w)) continue;
    record("fatal", where, `repeated word "${w} ${w}"`, excerpt(text, m.index ?? 0, 80));
  }
  // Double spaces
  for (const m of text.matchAll(/  +/g)) {
    record("fatal", where, `${m[0].length} consecutive spaces`, excerpt(text, m.index ?? 0, 60));
  }
  // Trailing space on the whole field (common copy-paste artifact)
  if (text !== text.trimEnd()) {
    record("fatal", where, "trailing whitespace at end of field");
  }
  // ASCII hyphen-minus used as mathematical minus, e.g. "-5°C" in prose.
  // We want the Unicode minus (U+2212) for proper typography and for the
  // localizer's downstream formatting consistency.
  for (const m of text.matchAll(/(?<=[\s(\[,])-\d/g)) {
    record("fatal", where, `ASCII hyphen used as minus`, excerpt(text, m.index ?? 0, 40));
  }
  // "--" or " -- " used as em-dash instead of U+2014.
  if (/ -- |--[^->]/.test(text)) {
    const i = Math.max(text.indexOf(" -- "), text.search(/--[^->]/));
    record("fatal", where, `"--" used where em-dash (—) belongs`, excerpt(text, i, 60));
  }
  // Three dots instead of ellipsis. Warn only (many legitimate uses).
  if (/\.{3}/.test(text)) {
    record("warn", where, `"..." used instead of ellipsis character`);
  }
  // Straight double-quote inside prose — warn, not fatal.
  if (/"/.test(text)) {
    record("warn", where, `straight double-quote — prefer curly quotes`);
  }
}

function excerpt(s: string, at: number, radius: number): string {
  const start = Math.max(0, at - radius);
  const end = Math.min(s.length, at + radius);
  return `…${s.substring(start, end)}…`;
}

// ---------- Check 3: data / prose consistency ----------

const WINTER_CUE = /\b(?:january|february|december|winter|wintertime|jan|feb|dec|cold\s+pool|coldest)\b/i;
const SUMMER_CUE = /\b(?:july|august|june|summer|summertime|jul|aug|jun|hottest|peak\s+sun)\b/i;

function checkConsistency(p: Place, where: string, text: string) {
  const elev = p.elevationM;
  if (elev > 0) {
    const elevRE = /(\b(?:at|elevation(?:\s+of)?|sits\s+at|rises\s+to|perched\s+at|up\s+to)\s+)(\d{3,}(?:,\d{3})?)\s*m\b/gi;
    for (const m of text.matchAll(elevRE)) {
      const before = text.substring(Math.max(0, (m.index ?? 0) - 70), m.index ?? 0);
      // Skip if an "other place" cue appears anywhere in the 70-char before
      // window: "vs Albuquerque at 1500 m", "Valle de Guadalupe inland 30 km
      // at 350 m", "from creosote at 1200 m to aspen above 2700 m".
      if (/\b(?:vs|versus|compared\s+to|than|higher\s+than|lower\s+than)\b/i.test(before)) continue;
      if (/\bfrom\b[^.]{0,60}$/i.test(before)) continue;
      // Another proper-noun before "at N m" typically means "some other city
      // at N m". Skip if a capitalized multi-word phrase (not at start of
      // sentence) appears in the 60 chars just before the claim.
      const priorClause = before.replace(/[.!?]\s+/g, " | ").split("|").pop() || before;
      if (/\b[A-Z][a-zA-Z]+(?:\s+(?:de\s+)?[A-Z][a-zA-Z]+){0,3}\s+(?:inland|above|at|below|south\s+of|north\s+of|east\s+of|west\s+of)\b/.test(priorClause)) continue;
      const claimed = parseFloat(m[2].replace(/,/g, ""));
      if (!isFinite(claimed)) continue;
      const drift = Math.abs(claimed - elev);
      const pct = drift / elev;
      if (drift > TOLERANCE_ELEV_ABS && pct > TOLERANCE_ELEV_PCT) {
        record("warn", where,
          `elevation claim ${claimed} m differs from place.elevationM ${elev} m (Δ ${drift.toFixed(0)} m / ${(pct * 100).toFixed(0)}%)`,
          excerpt(text, m.index ?? 0, 80));
      }
    }
  }
  // Temperature high/low cross-check is season-aware.
  const maxHigh = Math.max(...p.climate.tempHighC);
  const minHigh = Math.min(...p.climate.tempHighC);
  const maxLow = Math.max(...p.climate.tempLowC);
  const minLow = Math.min(...p.climate.tempLowC);

  // Matches "highs near −11°C", "summer highs of 30°C", "January highs near 5°C".
  const highsRE = /\b((?:january|february|december|july|august|june|summer|winter|afternoon)?\s*(?:mean\s+)?highs?)\s+(?:near|around|of|up\s+to|hitting|reach(?:ing)?)\s+([\u2212\-]?\d+(?:\.\d+)?)\s*°\s*C\b/gi;
  for (const m of text.matchAll(highsRE)) {
    const claimed = parseFloat(m[2].replace(/[\u2212]/g, "-"));
    if (!isFinite(claimed)) continue;
    const modifier = m[1].toLowerCase();
    const isWinter = WINTER_CUE.test(modifier);
    const isSummer = SUMMER_CUE.test(modifier);
    const target = isWinter ? minHigh : isSummer ? maxHigh : (Math.abs(claimed - minHigh) < Math.abs(claimed - maxHigh) ? minHigh : maxHigh);
    if (Math.abs(claimed - target) > TOLERANCE_TEMP_C) {
      record("warn", where,
        `highs claim ${claimed}°C vs data ${isWinter ? "min high" : isSummer ? "max high" : "nearer-high"} ${target.toFixed(0)}°C (Δ ${(claimed - target).toFixed(1)})`,
        excerpt(text, m.index ?? 0, 80));
    }
  }

  const lowsRE = /\b((?:january|february|december|july|august|june|summer|winter|nighttime|overnight)?\s*(?:mean\s+)?lows?)\s+(?:near|around|of|down\s+to|dropping\s+to|bottom\s+out\s+at|below)\s+([\u2212\-]?\d+(?:\.\d+)?)\s*°\s*C\b/gi;
  for (const m of text.matchAll(lowsRE)) {
    const claimed = parseFloat(m[2].replace(/[\u2212]/g, "-"));
    if (!isFinite(claimed)) continue;
    const modifier = m[1].toLowerCase();
    const isWinter = WINTER_CUE.test(modifier);
    const isSummer = SUMMER_CUE.test(modifier);
    // "Morning lows of −30°C" often describes extreme-event lows, not the
    // monthly mean. Accept a wider tolerance when the prose uses "morning",
    // "routinely", "events", or "below" (meaning "at or lower than").
    const isExtreme = /\b(?:morning|event|extreme|routinely|record)\b/i.test(text.substring(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0) + m[0]) || /^below$/.test((m[0].match(/\b(near|around|of|down\s+to|dropping\s+to|bottom\s+out\s+at|below)\b/i)?.[1] ?? "").toLowerCase().replace(/\s+/g, " "));
    const tolerance = isExtreme ? TOLERANCE_TEMP_C + 10 : TOLERANCE_TEMP_C;
    const target = isWinter ? minLow : isSummer ? maxLow : (Math.abs(claimed - minLow) < Math.abs(claimed - maxLow) ? minLow : maxLow);
    if (Math.abs(claimed - target) > tolerance) {
      record("warn", where,
        `lows claim ${claimed}°C vs data ${isWinter ? "min low" : isSummer ? "max low" : "nearer-low"} ${target.toFixed(0)}°C (Δ ${(claimed - target).toFixed(1)})`,
        excerpt(text, m.index ?? 0, 80));
    }
  }
}

// ---------- Run ----------

for (const p of PLACES) {
  for (const [field, text] of placeFields(p)) {
    const where = `${p.id}:${field}`;
    checkUnitResidues(where, text);
    checkTypography(where, text);
    checkConsistency(p, where, text);
  }
}
for (const c of CONCEPTS) {
  for (const [field, val] of [["short", c.short], ["long", c.long], ["mechanism", c.mechanism]] as const) {
    if (!val) continue;
    const where = `concept:${c.id}:${field}`;
    checkUnitResidues(where, val);
    checkTypography(where, val);
  }
}
for (const c of COLLECTIONS) {
  const where = `collection:${c.id}:description`;
  if (c.description) {
    checkUnitResidues(where, c.description);
    checkTypography(where, c.description);
  }
}

// ---------- Report ----------

const fatals = findings.filter(f => f.severity === "fatal");
const warns = findings.filter(f => f.severity === "warn");

const showAll = process.env.AUDIT_VERBOSE;
function printGroup(label: string, items: Finding[]) {
  if (!items.length) return;
  console.log(`\n${label} (${items.length})\n${"-".repeat(label.length + 5)}`);
  const limit = showAll ? items.length : Math.min(items.length, 60);
  for (const f of items.slice(0, limit)) {
    console.log(`  ${f.where}`);
    console.log(`    ${f.message}`);
    if (f.sample) console.log(`    ${f.sample}`);
  }
  if (items.length > limit) console.log(`  …and ${items.length - limit} more (set AUDIT_VERBOSE=1 to see all)`);
}

printGroup("FATAL", fatals);
printGroup("WARN", warns);

console.log(`\nSummary: ${fatals.length} fatal, ${warns.length} warn, ${metricLeftoverCount} metric residues across ${PLACES.length} places.`);
if (fatals.length > 0) process.exit(1);
