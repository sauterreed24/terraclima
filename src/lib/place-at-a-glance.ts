// ============================================================
// Dense at-a-glance strip: 100% derived from existing Place fields.
// ============================================================

import type { Place } from "../types";
import { DRIVER_LABELS } from "../types";
import { ARCHETYPE_BY_ID } from "../data/archetypes";
import { PLACE_ANNUAL_PRECIP, PLACE_COUNTS } from "../data/places";
import { getPlaceCorpusRanks } from "./atlas-corpus-stats";
import { buildGeospatialAnalysis } from "./geospatial-analysis";
import { EARTH_OBSERVATION_SOURCES } from "./atlas-metadata";
import { scorePlaceFeel } from "./place-feel";
import { koppenAudit } from "./koppen";
import { gddForUnit, type TempUnit } from "./units";

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
  A: { line: "Flagship", hint: "The fullest profile: history, risks, sources and outlook", tone: "ochre" },
  B: { line: "Spotlight", hint: "A standard profile", tone: "ice" },
  C: { line: "Index", hint: "A shorter entry", tone: "sage" },
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
  out.push({ label: "Profile depth", value: tr.line, hint: tr.hint, tone: tr.tone });

  out.push({
    label: "Place feel",
    value: `${feel.score}/100`,
    hint: `${feel.headline}: ${feel.strengths[0]} ${feel.frictions[0]}`,
    tone: feel.score >= 74 ? "sage" : feel.score >= 58 ? "ice" : "ember",
  });

  const primaryA = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const baseClimateHint = primaryA ? primaryA.label : place.biome.split(" / ")[0];
  // Cross-check the authored Köppen label against the class computed straight
  // from this place's monthly normals, and surface the agreement so the label
  // is an inspectable, data-backed signal rather than a static string.
  const ka = koppenAudit(place);
  let climateHint = baseClimateHint;
  if (ka.computed) {
    climateHint = ka.level === "match"
      ? `${baseClimateHint} · Köppen ${ka.computed.code} confirmed from the monthly averages`
      : ka.level === "boundary"
        ? `${baseClimateHint} · the monthly averages sit on the ${ka.computed.code} boundary`
        : ka.level === "subclass"
          ? `${baseClimateHint} · the monthly averages give ${ka.computed.code}`
          : ka.level === "divergent"
            ? `${baseClimateHint} · the label differs from what the monthly averages give (${ka.computed.code})`
            : baseClimateHint;
  }
  out.push({
    label: "Köppen class",
    value: place.koppen,
    hint: climateHint,
    tone: ka.level === "match" ? "sage" : "ice",
  });

  out.push({
    label: "Climate drivers",
    value: `${place.drivers.length} driver${place.drivers.length === 1 ? "" : "s"}`,
    hint: place.drivers.slice(0, 2).map(d => DRIVER_LABELS[d]).join(" / "),
    tone: "ochre",
  });

  out.push({
    label: "Data confidence",
    value: titleCase(place.confidence),
    hint: "How far to trust this profile before checking its sources",
    tone: "glacier",
  });

  const annual = PLACE_ANNUAL_PRECIP[place.id] ?? place.climate.annualPrecipMm ?? place.climate.precipMm.reduce((a, b) => a + b, 0);
  const w = Math.max(0, Math.min(100, Math.round(cr.wetterThanAtlasShare * 100)));
  out.push({
    label: "Yearly precipitation",
    value: fmt(annual),
    hint: `Wetter than ${w}% of the ${PLACE_COUNTS.total} atlas places`,
    tone: "glacier",
  });

  const f = place.climate.frostFreeDays;
  const g = place.climate.gdd10;
  if (f != null || g != null) {
    const parts: string[] = [];
    if (f != null) parts.push(`Frost-free ~${f} d`);
    if (g != null) {
      const gddTag = displayTemp === "F" ? "GDD base 50F" : "GDD base 10C";
      parts.push(`${gddTag} ~${Math.round(gddForUnit(g, displayTemp)).toLocaleString("en-US")}`);
    }
    out.push({ label: "Growing season (est.)", value: parts.join(" / "), hint: "Estimated from the same monthly averages as the charts", tone: "sage" });
  }

  const dSum = place.climate.diurnalSummerC ?? place.climate.tempHighC[6] - place.climate.tempLowC[6];
  if (dSum > 0) {
    const ld = Math.max(0, Math.min(100, Math.round(cr.largerDiurnalThanAtlasShare * 100)));
    out.push({
      label: "Summer day-to-night swing",
      value: fmtDiurnal(dSum),
      hint: `A larger summer swing than ${ld}% of atlas places`,
      tone: "aurora",
    });
  }

  // The grid is four across, so eight tiles keep the last row whole. The
  // reader-facing tiles come first; the screening tiles (which have their own
  // Geospatial section below) only fill whatever room is left.
  const technical: AtGlanceTile[] = [];
  technical.push({
    label: "Satellite coverage",
    value: "Sentinel-2 + Landsat",
    hint: `${EARTH_OBSERVATION_SOURCES.map(s => `${s.label} (${s.nominalResolutionM} m)`).join(" / ")} / satellite visibility ${geo.eoObservabilityScore}/100 / fine-scale terrain ${geo.structuralTextureScore}/100`,
    tone: "ice",
  });

  technical.push({
    label: "Terrain signal",
    value: `${geo.geospatialSignalScore}/100`,
    hint: `${geo.analysisConfidence} confidence / ${geo.sourceFits.map(s => `${s.sourceId} ${s.score}`).join(" / ")}`,
    tone: "aurora",
  });

  return [...out, ...technical].slice(0, 8);
}
