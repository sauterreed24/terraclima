// ============================================================
// Dense at-a-glance strip: 100% derived from existing Place fields.
// ============================================================

import type { Place } from "../types";
import { DRIVER_LABELS } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { PLACE_ANNUAL_PRECIP, PLACE_COUNTS } from "../data/places";
import { mergeDeepSections } from "./place-appendix-sections";
import { getPlaceCorpusRanks } from "./atlas-corpus-stats";
import { buildGeospatialAnalysis } from "./geospatial-analysis";
import { EARTH_OBSERVATION_SOURCES } from "./atlas-metadata";
import { scorePlaceFeel } from "./place-feel";
import type { TempUnit } from "./units";

export type AtGlanceTone = "glacier" | "sage" | "ochre" | "ice" | "ember" | "aurora";

export interface AtGlanceTile {
  label: string;
  value: string;
  hint?: string;
  tone: AtGlanceTone;
}

function titleCase(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

const TIER: Record<Place["tier"], { line: string; hint: string; tone: AtGlanceTone }> = {
  A: { line: "Flagship write-up", hint: "Deep profile with story, risks, sources, and outlook", tone: "ochre" },
  B: { line: "Spotlight card", hint: "Enough structure to compare the place cleanly", tone: "ice" },
  C: { line: "Index entry", hint: "Lean, searchable, and map-first", tone: "sage" },
};

export function buildAtAGlanceTiles(
  place: Place,
  fmt: (mm: number) => string,
  fmtDiurnal: (deltaC: number) => string,
  displayTemp: TempUnit = "F",
): AtGlanceTile[] {
  const out: AtGlanceTile[] = [];
  const cr = getPlaceCorpusRanks(place);
  const geo = buildGeospatialAnalysis(place);
  const feel = scorePlaceFeel(place);
  const tr = TIER[place.tier];
  out.push({ label: "Depth", value: tr.line, hint: tr.hint, tone: tr.tone });

  out.push({
    label: "Place feel",
    value: `${feel.score}/100`,
    hint: `${feel.headline}: ${feel.strengths[0]} ${feel.frictions[0]}`,
    tone: feel.score >= 74 ? "sage" : feel.score >= 58 ? "ice" : "ember",
  });

  const primaryA = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  out.push({
    label: "Climate class",
    value: place.koppen,
    hint: primaryA ? primaryA.label : place.biome.split(" / ")[0],
    tone: "ice",
  });

  out.push({
    label: "Terrain engines",
    value: `${place.drivers.length} driver${place.drivers.length === 1 ? "" : "s"}`,
    hint: place.drivers.slice(0, 2).map(d => DRIVER_LABELS[d]).join(" / "),
    tone: "ochre",
  });

  out.push({
    label: "Data confidence",
    value: titleCase(place.confidence),
    hint: "How much weight to give the profile before checking primary sources",
    tone: "glacier",
  });

  out.push({
    label: "Remote sensing",
    value: "EO + relief texture",
    hint: `${EARTH_OBSERVATION_SOURCES.map(s => `${s.label} (${s.nominalResolutionM} m)`).join(" / ")} / screening ${geo.eoObservabilityScore}/100 / relief proxy ${geo.structuralTextureScore}/100`,
    tone: "ice",
  });

  out.push({
    label: "Geospatial signal",
    value: `${geo.geospatialSignalScore}/100`,
    hint: `${geo.analysisConfidence} confidence / ${geo.sourceFits.map(s => `${s.sourceId} ${s.score}`).join(" / ")}`,
    tone: "aurora",
  });

  const annual = PLACE_ANNUAL_PRECIP[place.id] ?? place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const w = Math.max(0, Math.min(100, Math.round(cr.wetterThanAtlasShare * 100)));
  out.push({
    label: "Water year (mean)",
    value: fmt(annual),
    hint: `Among all ${PLACE_COUNTS.total} curated stops: wetter than ${w}% by annual mean`,
    tone: "glacier",
  });

  const f = place.climate.frostFreeDays;
  const g = place.climate.gdd10;
  if (f != null || g != null) {
    const parts: string[] = [];
    if (f != null) parts.push(`Frost-free ~${f} d`);
    if (g != null) {
      const gddTag = displayTemp === "F" ? "GDD base 50F" : "GDD base 10C";
      parts.push(`${gddTag} ~${Math.round(g)}`);
    }
    out.push({ label: "Growing season (est.)", value: parts.join(" / "), hint: "Rough agronomic read from the same table as the charts", tone: "sage" });
  }

  const nLocal = (place.localContrast?.length ?? 0) + (place.nearbyContrasts?.length ?? 0);
  if (nLocal > 0) {
    out.push({
      label: "Local contrast hooks",
      value: `${nLocal} comparison${nLocal === 1 ? "" : "s"}`,
      hint: "Valleys, basins, or named neighbors to compare below",
      tone: "ember",
    });
  }

  const deepN = mergeDeepSections(place).length;
  if (deepN > 0) {
    out.push({
      label: "Field dossier",
      value: `${deepN} chapter${deepN === 1 ? "" : "s"}`,
      hint: "Chaptered long-form reading, still tied to structured climate fields",
      tone: "sage",
    });
  }

  const dSum = place.climate.diurnalSummerC ?? place.climate.tempHighC[6] - place.climate.tempLowC[6];
  if (dSum > 0) {
    const ld = Math.max(0, Math.min(100, Math.round(cr.largerDiurnalThanAtlasShare * 100)));
    out.push({
      label: "High-season diurnal",
      value: fmtDiurnal(dSum),
      hint: `Larger summer swing than ${ld}% of atlas stops in the same high-season window`,
      tone: "aurora",
    });
  }

  return out.slice(0, 8);
}
