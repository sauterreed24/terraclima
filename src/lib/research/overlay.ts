/**
 * Merge research receipts into runtime Place records and project deprecated
 * Citation[] compatibility views from the provenance layer.
 */

import type { Citation, Place } from "../../types";
import type { PlaceResearchReceipt, CorpusSource } from "./contracts";

const KIND_BY_PUBLISHER: Record<string, Citation["kind"]> = {
  "NOAA NCEI": "noaa",
  NOAA: "noaa",
  Daymet: "daymet",
  "ORNL DAAC": "daymet",
  USGS: "usgs",
  USDA: "usda",
  FEMA: "fema",
  EPA: "epa",
  "Environment and Climate Change Canada": "eccc",
  ECCC: "eccc",
  "Climate Atlas of Canada": "climate-atlas-canada",
  SMN: "smn",
  CONAGUA: "smn",
  INEGI: "inegi",
  INECC: "inecc",
  "Atlas Nacional de Riesgos": "atlas-riesgos",
  WorldClim: "worldclim",
  "NASA NEX-GDDP": "nasa-nex",
  PRISM: "prism",
};

function citationKindFor(source: CorpusSource): Citation["kind"] {
  if (KIND_BY_PUBLISHER[source.publisher]) return KIND_BY_PUBLISHER[source.publisher];
  const pub = source.publisher.toLowerCase();
  if (pub.includes("noaa") || pub.includes("ncei")) return "noaa";
  if (pub.includes("daymet") || pub.includes("ornl")) return "daymet";
  if (pub.includes("usgs")) return "usgs";
  if (pub.includes("usda") || pub.includes("ssurgo")) return "usda";
  if (pub.includes("fema")) return "fema";
  if (pub.includes("eccc") || pub.includes("environment and climate")) return "eccc";
  if (pub.includes("smn") || pub.includes("conagua")) return "smn";
  if (pub.includes("inegi")) return "inegi";
  if (pub.includes("inecc")) return "inecc";
  if (pub.includes("prism")) return "prism";
  if (pub.includes("worldclim")) return "worldclim";
  if (pub.includes("nasa") || pub.includes("nex")) return "nasa-nex";
  if (source.sourceType === "peer-reviewed" || source.sourceType === "academic") return "academic";
  if (source.sourceType === "open-data" || source.sourceType === "official-dataset") return "oss-data";
  return "other";
}

/**
 * Deprecated compatibility projection: Citation[] generated from CorpusSource[].
 * Existing consumers keep working during the research-layer migration.
 */
export function citationsFromResearchSources(sources: readonly CorpusSource[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const source of sources) {
    const url = source.url.trim();
    if (!url.startsWith("https://")) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rawNote = [source.locator, source.dataPeriod, source.version].filter(Boolean).join(" · ");
    // Corpus audit bans ASCII hyphen-minus before digits; use Unicode minus.
    const note = rawNote
      ? rawNote.replace(/(^|[^A-Za-z0-9])-(\d)/g, "$1−$2")
      : undefined;
    out.push({
      label: source.title,
      kind: citationKindFor(source),
      note,
      url,
    });
  }
  return out;
}

export function applyResearchOverlay(
  place: Place,
  receipt: PlaceResearchReceipt | undefined,
): Place {
  if (!receipt) return place;
  // Prefer research-projected citations when the receipt has HTTPS sources;
  // otherwise keep authored citations so migration never blanks evidence.
  const projected = citationsFromResearchSources(receipt.sources);
  if (projected.length === 0) return place;
  const existingUrls = new Set(projected.map(c => (c.url ?? "").toLowerCase()));
  const authoredExtras = place.citations.filter(c => {
    const url = (c.url ?? "").toLowerCase();
    return !url || !existingUrls.has(url);
  });
  return {
    ...place,
    citations: [...projected, ...authoredExtras],
  };
}

export function researchReceiptById(
  receipts: readonly PlaceResearchReceipt[],
): Record<string, PlaceResearchReceipt> {
  return Object.fromEntries(receipts.map(r => [r.placeId, r]));
}
