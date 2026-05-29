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
  const n = note.trim();
  return (
    n === GENERIC
    || n.includes("editorial screening grounded in published normals")
    || n.includes("screening uses published normals and atlas archetypes")
    || /^City-scale normals for .+ are useful; neighborhood heat island/.test(n)
  );
}

export function draftConfidenceNote(place: Place): string {
  const name = shortName(place);
  const risk = topRiskNote(place);
  const elev = place.elevationM;
  const arch = place.archetypes[0];

  if (arch === "chinook-corridor") {
    return `Chinook events can mask how cold ${name} gets between warm-ups; foothill wildfire, smoke, and water-right stress vary by slope exposure — verify parcel risk, not just city normals.`;
  }
  if (arch === "lake-effect-snowbelt") {
    return `Lake-effect totals for ${name} vary block by block with Superior fetch and elevation; declining lake ice and storm exposure on the escarpment are long-run variables beyond city-scale normals.`;
  }
  if (arch === "gap-wind-corridor") {
    return `${name} averages a steep gorge transect — west-rim, east-bench, and wind-exposed river parcels can differ on rain, fire, and frost more than regional scores suggest.`;
  }
  if (arch === "cold-air-pool" || arch === "frost-hollow") {
    return `Basin-floor normals for ${name} understate ridge-versus-floor frost spread; wildfire smoke and parcel elevation band dominate summer comfort as much as winter cold.`;
  }
  if (arch === "canyon-sheltered") {
    return `Canyon geometry around ${name} re-weights heat, wind, and monsoon exposure — rim blocks, creek drainage, and sheltered benches can diverge materially from town averages.`;
  }
  if (arch === "monsoon-edge" && elev >= 1500) {
    return `Highland monsoon timing and dry-season heat at ${elev} m vary year to year; water supply and wildfire smoke belong in any ${name} relocation checklist alongside temperature.`;
  }
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
  if (place.archetypes.includes("hurricane-coast") || place.risks.coastal.level === "very-high" || place.risks.coastal.level === "high") {
    return `${name} coastal and surge exposure varies block by block — elevation certificates, flood panels, and storm history matter more than regional comfort scores.`;
  }
  if (risk) {
    return `${name} atlas entry is regional context; ${risk} — confirm parcel elevation, drainage, and insurance before committing.`;
  }
  if (elev >= 1500) {
    return `Highland normals (${elev} m) for ${name} understate frost, wind, and aspect differences between ridge, slope, and valley floor — scout elevation bands on the ground.`;
  }
  return `${name} uses published normals and gridded climate for screening; local terrain can re-weight the same forecast — confirm exposure on the ground before committing.`;
}

export { GENERIC as GENERIC_TIER_C_CONFIDENCE_NOTE };
