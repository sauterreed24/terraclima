/**
 * Human-readable Climate V2 audit: coverage, duplicates, elev/temp/precip
 * outliers vs authored corpus, template humidity/solar retirement checks.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ClimatePlaceRecordV2 } from "../../src/lib/climate-v2/contracts";
import { AUTHORED_PLACES } from "./shadow-authored";

const ROOT = new URL("../..", import.meta.url).pathname;
const BUNDLE = join(ROOT, "src/data/generated/climate-v2/records.json");
const AUDIT_MD = join(ROOT, "data/climate-v2/audit/AUDIT.md");
const AUDIT_JSON = join(ROOT, "data/climate-v2/audit/shadow-diff.json");

function mean3(a: number, b: number, c: number): number {
  return (a + b + c) / 3;
}

function arrayKey(values: number[] | undefined): string | null {
  if (!values || values.length !== 12) return null;
  return values.map(v => v.toFixed(2)).join(",");
}

async function main(): Promise<void> {
  if (!existsSync(BUNDLE)) {
    console.error("Missing generated climate-v2 records. Run climate:data:generate first.");
    process.exit(1);
  }
  const records = JSON.parse(readFileSync(BUNDLE, "utf8")) as ClimatePlaceRecordV2[];
  const byId = new Map(records.map(r => [r.placeId, r]));

  const missing: string[] = [];
  const tempOutliers: Array<Record<string, unknown>> = [];
  const precipOutliers: Array<Record<string, unknown>> = [];
  const elevOutliers: Array<Record<string, unknown>> = [];
  const unexplained: string[] = [];

  for (const p of AUTHORED_PLACES) {
    const rec = byId.get(p.id);
    if (!rec) {
      missing.push(p.id);
      continue;
    }
    const recent = rec.periods["rolling-1996-2025"];
    const authoredHigh = mean3(p.climate.tempHighC[5], p.climate.tempHighC[6], p.climate.tempHighC[7]);
    const daymetHigh = mean3(recent.tempHighC[5], recent.tempHighC[6], recent.tempHighC[7]);
    const authoredLow = mean3(p.climate.tempLowC[11], p.climate.tempLowC[0], p.climate.tempLowC[1]);
    const daymetLow = mean3(recent.tempLowC[11], recent.tempLowC[0], recent.tempLowC[1]);
    const authoredPrecip = p.climate.annualPrecipMm ?? p.climate.precipMm.reduce((a, b) => a + b, 0);

    const dHigh = Math.abs(daymetHigh - authoredHigh);
    const dLow = Math.abs(daymetLow - authoredLow);
    if (dHigh > 2 || dLow > 2) {
      tempOutliers.push({
        id: p.id,
        name: p.name,
        country: p.country,
        dHigh: +dHigh.toFixed(2),
        dLow: +dLow.toFixed(2),
        authoredHigh: +authoredHigh.toFixed(2),
        daymetHigh: +daymetHigh.toFixed(2),
        authoredLow: +authoredLow.toFixed(2),
        daymetLow: +daymetLow.toFixed(2),
        validation: rec.validation.status,
      });
    }
    if (authoredPrecip > 0) {
      const bias = ((recent.annualPrecipMm - authoredPrecip) / authoredPrecip) * 100;
      if (Math.abs(bias) > 30) {
        precipOutliers.push({
          id: p.id,
          name: p.name,
          biasPct: +bias.toFixed(1),
          authored: authoredPrecip,
          daymet: recent.annualPrecipMm,
          validation: rec.validation.status,
        });
      }
    }
    if (Math.abs(rec.elevationDeltaM) > 250) {
      elevOutliers.push({
        id: p.id,
        authored: rec.anchor.elevationM,
        grid: rec.gridElevationM,
        delta: rec.elevationDeltaM,
        overrideReason: rec.anchor.overrideReason ?? null,
        validation: rec.validation.status,
      });
      if (!rec.anchor.overrideReason && rec.validation.status !== "reviewed-exception") {
        unexplained.push(`${p.id}: elevation delta ${rec.elevationDeltaM}m unexplained`);
      }
    }
  }

  // Template humidity/solar duplicate detection on generated values (should be ~0 exact pairs from polish)
  const humKeys = new Map<string, string[]>();
  const solarKeys = new Map<string, string[]>();
  for (const rec of records) {
    const h = arrayKey(rec.periods["rolling-1996-2025"].humidity);
    const s = arrayKey(rec.periods["rolling-1996-2025"].solarEnergyMjM2Day);
    if (h) {
      const list = humKeys.get(h) ?? [];
      list.push(rec.placeId);
      humKeys.set(h, list);
    }
    if (s) {
      const list = solarKeys.get(s) ?? [];
      list.push(rec.placeId);
      solarKeys.set(s, list);
    }
  }
  const humDupGroups = [...humKeys.values()].filter(g => g.length > 1);
  const solarDupGroups = [...solarKeys.values()].filter(g => g.length > 1);

  // Exact-array dups are rare with continuous Daymet values; still report
  const shadow = {
    generatedAt: new Date().toISOString(),
    placeCount: AUTHORED_PLACES.length,
    generatedCount: records.length,
    missing,
    tempOutliersOver2C: tempOutliers,
    precipOutliersOver30Pct: precipOutliers,
    elevOutliersOver250m: elevOutliers,
    exactHumidityArrayDupGroups: humDupGroups.length,
    exactSolarArrayDupGroups: solarDupGroups.length,
    unexplained,
    validationCounts: {
      validated: records.filter(r => r.validation.status === "validated").length,
      gridOnly: records.filter(r => r.validation.status === "grid-only").length,
      reviewedException: records.filter(r => r.validation.status === "reviewed-exception").length,
    },
  };

  mkdirSync(join(ROOT, "data/climate-v2/audit"), { recursive: true });
  writeFileSync(AUDIT_JSON, JSON.stringify(shadow, null, 2) + "\n");

  const md = `# Climate Data V2 Audit Report

Generated: ${shadow.generatedAt}

## Coverage
- Authored places: ${AUTHORED_PLACES.length}
- Generated V2 records: ${records.length}
- Missing: ${missing.length ? missing.join(", ") : "none"}

## Validation status
- validated: ${shadow.validationCounts.validated}
- grid-only: ${shadow.validationCounts.gridOnly}
- reviewed-exception: ${shadow.validationCounts.reviewedException}

## Shadow diff (authored vs Daymet 1996–2025)
- Temperature outliers (|Δ| > 2°C annual high or low): **${tempOutliers.length}**
- Precipitation outliers (|bias| > 30%): **${precipOutliers.length}**
- Elevation outliers (|Δ| > 250 m): **${elevOutliers.length}**

Large differences are a **review queue**, not automatic proof either value is wrong.

## Template retirement
- Exact duplicate humidity array groups: ${humDupGroups.length}
- Exact duplicate solar array groups: ${solarDupGroups.length}

## Unexplained items
${unexplained.length ? unexplained.map(u => `- ${u}`).join("\n") : "- none (elevation mismatches have documented climate-anchor overrides; temp/precip deltas are the reviewed queue below)"}

## Review queue policy
Authored-vs-Daymet outliers are **not** auto-corrected. Runtime uses Daymet 1996–2025. See \`stations/reviewed-exceptions.json\` for named causes (terrain, coastal-exposure, zone-vs-town, elevation-mismatch, authored-blend-divergence, station-mapping-pending).

## Priority review IDs
${[...new Set([
    ...elevOutliers.map(o => String(o.id)),
    "honolulu-hi",
    "mount-charleston-nv",
    "lone-pine-ca",
    "real-catorce-mx",
    "ensenada-mx",
    "iqaluit-nu",
    "prince-rupert-bc",
    ...tempOutliers.slice(0, 15).map(o => String(o.id)),
    ...precipOutliers.slice(0, 10).map(o => String(o.id)),
  ])].map(id => `- ${id}`).join("\n")}

See \`shadow-diff.json\` for full outlier tables and \`RANK-DIFF.md\` for lens movement >25 places.
`;

  writeFileSync(AUDIT_MD, md);
  console.log(md);
  console.log(`Wrote ${AUDIT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
