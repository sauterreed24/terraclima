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

function mechanismSection(place: Place): PlaceDeepSection {
  const name = shortName(place);
  const arch = ARCHETYPE_BY_ID[place.archetypes[0]]?.label ?? place.biome;
  const drivers = place.drivers.slice(0, 4).map(d => DRIVER_LABELS[d] ?? d);
  const driverList = drivers.length >= 2 ? `${drivers[0]} and ${drivers[1]}` : drivers[0] ?? "local terrain";
  const extra = drivers.length > 2 ? ` — with ${drivers.slice(2).join(" and ")} also in play.` : ".";
  const annual = Math.round(getAnnualPrecipMm(place));
  return {
    id: slugId(place, "mechanism"),
    title: `${arch} at work`,
    paragraphs: [
      `${name} sits where ${place.reliefContext.replace(/\.$/, "").toLowerCase()}. The atlas tags this as ${arch.toLowerCase()} (${place.koppen}, roughly ${annual} mm/yr in these normals), and the dominant spatial engines are ${driverList}${extra}`,
      `${place.whyDistinct.replace(/\.$/, "")}. That mechanism is why two map dots in ${place.region} can feel unlike each other even when headline temperatures look similar — elevation bands, fetch exposure, and drainage geometry all re-weight the same synoptic pattern.`,
    ],
  };
}

function fieldReadSection(place: Place): PlaceDeepSection {
  const name = shortName(place);
  const risk = topRisk(place);
  const grows = place.growability.growsWell.slice(0, 4).join(", ") || "—";
  const tricky = place.growability.tricky.slice(0, 3).join(", ") || "—";
  const riskLine = risk
    ? `${risk.label} registers ${risk.level} in this entry — treat parcel-level exposure as a diligence item, not a headline score.`
    : "No single hazard dominates the risk matrix here; the practical read is still parcel-specific for flood, wind, and access.";
  return {
    id: slugId(place, "field-read"),
    title: "Scouting and on-the-ground read",
    paragraphs: [
      `${name} screening: ${place.summaryShort.replace(/\.$/, "")}. Soil reads as ${place.soil.texture.toLowerCase()} with ${place.soil.drainage} drainage and pH ${place.soil.phRange[0]}–${place.soil.phRange[1]} — ${place.growability.homeGarden ?? "garden success tracks micro-shelter and water timing."}`,
      `${riskLine} Growability favors ${grows}; ${tricky} tend to struggle without intervention. ${place.whoMightNot.replace(/\.$/, "")} — confirm services, insurance, and evacuation routes before treating atlas normals as a lease on daily life.`,
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
