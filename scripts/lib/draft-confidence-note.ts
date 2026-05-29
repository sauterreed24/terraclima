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

function scoutingSentenceFromDeepSections(place: Place): string | null {
  const sections = place.deepSections;
  if (!sections?.length) return null;

  for (const section of sections) {
    for (const para of section.paragraphs) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        const t = s.trim();
        if (t.length < 55 || t.length > 240) continue;
        if (!/(confirm|scout|verify|before committing|on the ground|parcel|block by block|neighborhood|normals alone|relocation checklist|due diligence|should spend|belong in any)/i.test(t)) {
          continue;
        }
        return t;
      }
    }
  }
  return null;
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
      return label;
    }
  }
  return null;
}

function riskSpecificNote(place: Place): string | null {
  const name = shortName(place);
  const r = place.risks;
  const riskOrder = { "very-low": 1, low: 2, moderate: 3, elevated: 4, high: 5, "very-high": 6 } as const;
  const lvl = (k: keyof typeof r) => riskOrder[r[k].level as keyof typeof riskOrder] ?? 0;

  if (lvl("coastal") >= 5 || lvl("storm") >= 5) {
    return `${name} coastal and surge exposure varies block by block — elevation certificates, flood panels, and storm history matter more than regional comfort scores.`;
  }
  if (lvl("wildfire") >= 4 && lvl("smoke") >= 3) {
    return `${name} station normals mask smoke-season inversions and wildland-interface exposure — confirm air-quality history and defensible space before buying on the urban fringe.`;
  }
  if (lvl("flood") >= 4) {
    return `${name} flood exposure varies sharply by parcel — confirm elevation, drainage geometry, arroyo proximity, and insurance before committing.`;
  }
  if (lvl("drought") >= 4) {
    return `${name} drought and water supply vary by parcel and metering — confirm well rights, irrigation access, and reservoir context before committing.`;
  }
  if (lvl("extremeCold") >= 4) {
    return `${name} winter cold varies by elevation band and exposure — basin floors, lake fetch, and wind can diverge materially from city-scale normals.`;
  }
  if (lvl("storm") >= 4) {
    return `${name} severe-storm exposure varies by fetch and elevation — confirm shelter access, roof history, and hail or wind exposure on the ground.`;
  }
  if (lvl("extremeHeat") >= 4) {
    return `${name} summer heat-index severity varies by block — verify cooling costs, tree cover, and irrigation dependence separately from winter pleasant-season appeal.`;
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
    || n.includes("atlas entry is regional context")
    || /^City-scale normals for .+ are useful; neighborhood heat island/.test(n)
  );
}

export function draftConfidenceNote(place: Place): string {
  const fromDeep = scoutingSentenceFromDeepSections(place);
  if (fromDeep) return fromDeep;

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
  if (place.archetypes.includes("cloud-forest") || place.koppen === "Cfb") {
    return `Cloud-forest normals capture the city envelope, but slope, drainage, and saturated-soil landslide exposure vary sharply between ridge crest, campus flats, and escarpment-adjacent blocks — scout in wet season.`;
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

  const riskNote = riskSpecificNote(place);
  if (riskNote) return riskNote;

  if (risk) {
    return `${name} screening uses published station normals; ${risk} varies sharply by parcel — confirm elevation, drainage, and insurance before committing.`;
  }
  if (elev >= 1500) {
    return `Highland normals (${elev} m) for ${name} understate frost, wind, and aspect differences between ridge, slope, and valley floor — scout elevation bands on the ground.`;
  }
  return `${name} uses published normals and gridded climate for screening; local terrain can re-weight the same forecast — confirm exposure on the ground before committing.`;
}

export { GENERIC as GENERIC_TIER_C_CONFIDENCE_NOTE };
