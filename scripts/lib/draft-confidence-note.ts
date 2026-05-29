/**
 * Draft place-specific `confidenceNotes` for Tier C entries.
 * Replaces generic screening boilerplate with localized caveats.
 */
import type { Place } from "../../src/types";

const GENERIC =
  "Tier C entry — editorial screening grounded in published normals (NOAA / ECCC / SMN as applicable), PRISM / WorldClim grids, and atlas-archetype reasoning. Treat any specific deltas as interpretive context, not station-grade measurements.";

function shortName(place: Place): string {
  return place.name.split("(")[0]!.trim();
}

function topRiskNote(place: Place): string | null {
  const order = [
    ["coastal", "coastal and surge exposure"],
    ["wildfire", "wildfire and smoke exposure"],
    ["flood", "flood exposure"],
    ["storm", "severe-storm exposure"],
    ["drought", "drought and water supply"],
    ["extremeHeat", "extreme heat"],
    ["extremeCold", "winter cold"],
  ] as const;
  for (const [key, label] of order) {
    const r = place.risks[key];
    if (r && (r.level === "very-high" || r.level === "high" || r.level === "elevated")) {
      return `${label} varies sharply by parcel`;
    }
  }
  return null;
}

export function isGenericConfidenceNote(note: string | undefined): boolean {
  if (!note?.trim()) return true;
  return note.trim() === GENERIC || note.includes("editorial screening grounded in published normals");
}

export function draftConfidenceNote(place: Place): string {
  const name = shortName(place);
  const risk = topRiskNote(place);
  const elev = place.elevationM;

  if (place.archetypes.includes("urban-heat-contrast")) {
    return `City-scale normals for ${name} are useful; neighborhood heat island, flood pockets, and elevation within the metro can diverge from airport readings — verify block-level exposure.`;
  }
  if (place.archetypes.some(a => ["hyper-maritime", "fog-belt-coast", "cool-summer-maritime"].includes(a))) {
    return `Coastal-maritime normals capture regional fog and rain; fetch exposure and elevation within a few kilometers can shift sunshine and wind exposure materially.`;
  }
  if (place.archetypes.includes("lake-effect-snowbelt")) {
    return `Regional lake-effect context is well supported; lakeshore versus inland parcels can differ by feet of snow per event — confirm fetch and bluff exposure.`;
  }
  if (place.archetypes.includes("alpine-tundra") || place.koppen.startsWith("ET") || place.koppen.includes("Dfd")) {
    return `High-latitude or alpine context is conservative at the listed elevation (${elev} m); aspect, cold pools, and wind exposure dominate parcel-level comfort.`;
  }
  if (risk) {
    return `${name} screening uses published normals and atlas archetypes; ${risk} — treat headline scores as regional context, not parcel-grade measurements.`;
  }
  if (elev >= 1500) {
    return `Highland normals (${elev} m) understate frost, wind, and aspect differences between ridge, slope, and valley floor — scout elevation bands on the ground.`;
  }
  return `${name} entry uses NOAA / ECCC / SMN normals and PRISM / WorldClim grids for screening; local terrain can re-weight the same forecast — confirm on the ground before committing.`;
}

export { GENERIC as GENERIC_TIER_C_CONFIDENCE_NOTE };
