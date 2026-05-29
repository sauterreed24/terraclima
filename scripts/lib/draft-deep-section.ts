/**
 * Draft curated `Place.deepSections` from structured corpus fields.
 * Screening-grade mechanism essays — auditable, not LLM ghost-writing.
 */
import type { Place, PlaceDeepSection } from "../../src/types";
import { DRIVER_LABELS } from "../../src/types";
import { ARCHETYPE_BY_ID } from "../../src/data/archetypes";
import { getAnnualPrecipMm } from "../../src/lib/climate-metrics";

function shortName(place: Place): string {
  return place.name.split("(")[0]!.trim();
}

function slugId(place: Place, suffix: string): string {
  const base = place.id.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${suffix}`.slice(0, 48);
}

function topRisk(place: Place): { label: string; level: string } | null {
  const order = [
    ["wildfire", "Wildfire"],
    ["coastal", "Coastal exposure"],
    ["flood", "Flood"],
    ["storm", "Severe storms"],
    ["drought", "Drought"],
    ["smoke", "Smoke / air quality"],
    ["extremeHeat", "Extreme heat"],
    ["extremeCold", "Extreme cold"],
    ["landslide", "Landslide"],
  ] as const;
  for (const [key, label] of order) {
    const r = place.risks[key];
    if (r && (r.level === "very-high" || r.level === "high" || r.level === "elevated")) {
      return { label, level: r.level };
    }
  }
  return null;
}

function reliefLead(place: Place): string {
  const rc = place.reliefContext.replace(/\.$/, "").trim();
  return rc.charAt(0).toUpperCase() + rc.slice(1);
}

function mechanismSection(place: Place): PlaceDeepSection {
  const name = shortName(place);
  const arch = ARCHETYPE_BY_ID[place.archetypes[0]]?.label ?? place.biome;
  const drivers = place.drivers.slice(0, 3).map(d => DRIVER_LABELS[d] ?? d);
  const driverText =
    drivers.length >= 2 ? `${drivers[0]} and ${drivers[1]}`
    : drivers[0] ?? "local terrain";
  const annual = Math.round(getAnnualPrecipMm(place));
  const elevClause =
    place.elevationM >= 800
      ? ` At roughly ${place.elevationM} m, elevation bands matter as much as latitude.`
      : "";
  return {
    id: slugId(place, "mechanism"),
    title: `${arch} mechanics`,
    paragraphs: [
      `${name} sits where ${reliefLead(place).charAt(0).toLowerCase()}${reliefLead(place).slice(1)}.${elevClause} ${place.koppen} normals and roughly ${annual} mm/yr frame the regional baseline, but ${driverText} re-weight what any single forecast means block by block.`,
      `${place.whyDistinct.replace(/\.$/, "")}. Compare fetch exposure, slope aspect, and drainage geometry before treating city-scale scores as parcel-grade comfort.`,
    ],
  };
}

function fieldReadSection(place: Place): PlaceDeepSection {
  const risk = topRisk(place);
  const grows = place.growability.growsWell.slice(0, 3).join(", ") || "—";
  const garden =
    place.growability.homeGarden
    ?? "Garden success tracks micro-shelter, water timing, and frost exposure.";
  const riskLine = risk
    ? `${risk.label} registers ${risk.level} here — verify parcel exposure, insurance, and evacuation access before committing.`
    : "No single hazard dominates the matrix, but flood, wind, and access still vary sharply by parcel.";
  const whoNot = place.whoMightNot.replace(/\.$/, "");
  return {
    id: slugId(place, "field-read"),
    title: "On-the-ground read",
    paragraphs: [
      `${place.summaryShort.replace(/\.$/, "")}. Soils read as ${place.soil.texture.toLowerCase()} with ${place.soil.drainage} drainage (pH ${place.soil.phRange[0]}–${place.soil.phRange[1]}). ${garden}`,
      `${riskLine} Growability favors ${grows}. ${whoNot} should confirm services and seasonal access on the ground — not from atlas normals alone.`,
    ],
  };
}

export function draftDeepSections(place: Place): PlaceDeepSection[] {
  return [mechanismSection(place), fieldReadSection(place)];
}

export function formatDeepSectionsBlock(sections: PlaceDeepSection[], indent = "    "): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const i = indent;
  const i2 = i + "  ";
  const i3 = i2 + "  ";
  const sectionLines = sections.flatMap(s => [
    `${i2}{`,
    `${i3}id: "${esc(s.id)}",`,
    `${i3}title: "${esc(s.title)}",`,
    `${i3}paragraphs: [`,
    ...s.paragraphs.map(p => `${i3}  "${esc(p)}",`),
    `${i3}],`,
    `${i2}},`,
  ]);
  return [`${i}deepSections: [`, ...sectionLines, `${i}],`].join("\n");
}
