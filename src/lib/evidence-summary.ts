/**
 * Evidence classification for Terraclima place profiles.
 *
 * Distinguishes measured/authored climate normals from deterministic
 * derivation, editorial context, regional projections, and screening scores.
 * Does not invent scientific certainty; coverage and confidence stay separate.
 */
import type { Citation, Confidence, Place } from "../types";
import { CLIMATE_NORMALS_PERIOD } from "./atlas-metadata";
import { safeExternalHref } from "./safe-url";

/** Exhaustive evidence classes used by the dossier UI. */
export const EVIDENCE_CLASSES = [
  "observed-normal",
  "authored-context",
  "deterministic-derived",
  "regional-projection",
  "screening-score",
  "field-observation",
] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export const EVIDENCE_CLASS_META: Record<
  EvidenceClass,
  { shortLabel: string; plainLabel: string; description: string }
> = {
  "observed-normal": {
    shortLabel: "Measured normals",
    plainLabel: "Observed climate normals",
    description:
      `Station products and authored ${CLIMATE_NORMALS_PERIOD} climate normals cited for this place.`,
  },
  "authored-context": {
    shortLabel: "Editorial context",
    plainLabel: "Source-backed editorial interpretation",
    description:
      "Written explanation of the place and its climate, based on the cited sources and the data. Not a measurement.",
  },
  "deterministic-derived": {
    shortLabel: "Derived",
    plainLabel: "Deterministic calculation",
    description:
      "Values calculated from the climate data (indices, climate twins, differences from home). Not measured separately.",
  },
  "regional-projection": {
    shortLabel: "Regional projection",
    plainLabel: "Illustrative regional projection",
    description:
      "Broad regional projections for mid-century, used in the Atlas and Compare. Not a local forecast.",
  },
  "screening-score": {
    shortLabel: "Editorial score",
    plainLabel: "Editorial score for comparison",
    description:
      "Ranking, fit, livability, tourism and terrain scores, used to compare places. They are not measurements, appraisals or insurance advice.",
  },
  "field-observation": {
    shortLabel: "Field note",
    plainLabel: "Field observation",
    description:
      "Local or observational context labeled as field observation in the citation list.",
  },
};

/** Citation kinds treated as climate-normal / station products. */
export const OBSERVED_NORMAL_SOURCE_KINDS = new Set<Citation["kind"]>([
  "noaa",
  "prism",
  "eccc",
  "climate-atlas-canada",
  "smn",
  "daymet",
  "era5",
  "worldclim",
]);

/** Citation kinds that primarily support projection layers. */
export const PROJECTION_SOURCE_KINDS = new Set<Citation["kind"]>([
  "cmip6",
  "nasa-nex",
]);

export const ALLOWED_CONFIDENCE: readonly Confidence[] = ["high", "moderate", "low"] as const;

export const ALLOWED_CITATION_KINDS: readonly Citation["kind"][] = [
  "noaa",
  "prism",
  "usda",
  "usgs",
  "fema",
  "epa",
  "eccc",
  "climate-atlas-canada",
  "smn",
  "inegi",
  "inecc",
  "atlas-riesgos",
  "worldclim",
  "daymet",
  "era5",
  "soilgrids",
  "nasa-nex",
  "cmip6",
  "sentinel-2",
  "landsat",
  "oss-data",
  "academic",
  "field-observation",
  "other",
] as const;

export interface EvidenceSourceGroup {
  kind: Citation["kind"];
  label: string;
  citations: readonly Citation[];
  urlCount: number;
}

export interface MissingEvidenceField {
  id: string;
  label: string;
  note: string;
}

export interface PlaceEvidenceSummary {
  placeId: string;
  normalsPeriod: typeof CLIMATE_NORMALS_PERIOD;
  confidence: Confidence;
  confidenceNotes?: string;
  /** Completeness of optional structured fields — not scientific certainty. */
  completenessLabel: "strong" | "solid" | "thin";
  completenessNote: string;
  citationCount: number;
  urlCitationCount: number;
  classesPresent: EvidenceClass[];
  classNotes: Partial<Record<EvidenceClass, string>>;
  sourceGroups: EvidenceSourceGroup[];
  missingFields: MissingEvidenceField[];
  howToRead: string;
}

export function isEvidenceClass(value: string): value is EvidenceClass {
  return (EVIDENCE_CLASSES as readonly string[]).includes(value);
}

export function evidenceClassMeta(cls: EvidenceClass) {
  return EVIDENCE_CLASS_META[cls];
}

/** Map a citation kind onto the evidence class readers should expect. */
export function classifyCitationKind(kind: Citation["kind"]): EvidenceClass {
  if (kind === "field-observation") return "field-observation";
  if (PROJECTION_SOURCE_KINDS.has(kind)) return "regional-projection";
  if (OBSERVED_NORMAL_SOURCE_KINDS.has(kind)) return "observed-normal";
  return "authored-context";
}

export function classifyDossierSection(
  section:
    | "climate-normals"
    | "mechanism"
    | "risk"
    | "bioclim"
    | "livability"
    | "live-fit"
    | "geospatial"
    | "tourism"
    | "outlook"
    | "scores"
    | "projection-banner"
    | "vs-home"
    | "analogs",
): EvidenceClass {
  switch (section) {
    case "climate-normals":
      return "observed-normal";
    case "mechanism":
    case "risk":
      return "authored-context";
    case "bioclim":
    case "vs-home":
    case "analogs":
      return "deterministic-derived";
    case "projection-banner":
    case "outlook":
      return "regional-projection";
    case "livability":
    case "live-fit":
    case "geospatial":
    case "tourism":
    case "scores":
      return "screening-score";
  }
}

function citationLabelOk(citation: Citation): boolean {
  return Boolean(citation.label?.trim());
}

export function countUsableCitationUrls(citations: readonly Citation[]): number {
  return citations.filter(c => safeExternalHref(c.url) != null).length;
}

export function findDuplicateCitations(citations: readonly Citation[]): string[] {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const c of citations) {
    const key = `${c.kind}::${c.label.trim().toLowerCase()}::${(c.url ?? "").trim().toLowerCase()}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 2) dupes.push(c.label.trim() || c.kind);
  }
  return dupes;
}

export function listMissingStructuredFields(place: Place): MissingEvidenceField[] {
  const missing: MissingEvidenceField[] = [];
  const climate = place.climate;

  if (!climate.humidity) {
    missing.push({
      id: "humidity",
      label: "Monthly humidity",
      note: "No measured humidity for this place. Comfort figures use a cautious estimate from similar climates.",
    });
  }
  if (!climate.solarEnergyMjM2Day && !climate.sunshinePct) {
    missing.push({
      id: "solar",
      label: "Solar resource",
      note: "No monthly solar energy data (kWh/m² per day).",
    });
  }
  if (!climate.snowCm) {
    missing.push({
      id: "snow",
      label: "Monthly snowfall",
      note: "No snowfall data, which is usual where it rarely snows.",
    });
  }
  if (!place.liveSignals) {
    missing.push({
      id: "live-signals",
      label: "Housing and access data",
      note: "No housing-cost or travel-time data. Livability uses a cautious default for both.",
    });
  }
  if (!place.projection) {
    missing.push({
      id: "projection-override",
      label: "Place-specific projection override",
      note: "The 2050 layers use the broad regional projection for this place, not a local study.",
    });
  }
  return missing;
}

function completenessFromGaps(place: Place, missing: readonly MissingEvidenceField[]): PlaceEvidenceSummary["completenessLabel"] {
  const optionalAbsences = missing.filter(m => m.id !== "projection-override").length;
  if (place.tier === "A" && optionalAbsences === 0) return "strong";
  if (optionalAbsences <= 1) return "solid";
  if (optionalAbsences <= 2) return "solid";
  return "thin";
}

function groupCitations(citations: readonly Citation[]): EvidenceSourceGroup[] {
  const byKind = new Map<Citation["kind"], Citation[]>();
  for (const c of citations) {
    const list = byKind.get(c.kind) ?? [];
    list.push(c);
    byKind.set(c.kind, list);
  }
  return [...byKind.entries()]
    .map(([kind, list]) => ({
      kind,
      label: kind.replace(/-/g, " "),
      citations: list,
      urlCount: countUsableCitationUrls(list),
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
}

/**
 * Build a compact, truthful evidence summary for one place profile.
 * Deterministic; no fabricated station IDs, access dates, or precision claims.
 */
export function buildPlaceEvidenceSummary(place: Place): PlaceEvidenceSummary {
  const citations = place.citations ?? [];
  const urlCitationCount = countUsableCitationUrls(citations);
  const missingFields = listMissingStructuredFields(place);
  const sourceGroups = groupCitations(citations);
  const classesPresent = new Set<EvidenceClass>([
    "observed-normal",
    "authored-context",
    "deterministic-derived",
    "screening-score",
    "regional-projection",
  ]);
  if (citations.some(c => c.kind === "field-observation")) {
    classesPresent.add("field-observation");
  }

  const classNotes: Partial<Record<EvidenceClass, string>> = {
    "observed-normal": `${urlCitationCount} URL-backed citation${urlCitationCount === 1 ? "" : "s"}; climate charts use Daymet-derived ${CLIMATE_NORMALS_PERIOD} averages (a recent 30-year period, not the official WMO normal).`,
    "authored-context": "The explanation of why the climate differs, the on-the-ground notes and the fit text are editorial writing based on the data.",
    "deterministic-derived": "Bioclimatic indices, climate twins and differences from home are calculated from the climate data.",
    "regional-projection": place.projection
      ? "This place has its own cited projection. The 2050 layers are still illustrations, not forecasts."
      : "The 2050 layers use a broad regional estimate (IPCC AR6, by latitude band). They are illustrations, not a forecast for a specific site.",
    "screening-score": "Livability, live-here fit, terrain and tourism scores are editorial ratings for comparing places.",
  };
  if (classesPresent.has("field-observation")) {
    classNotes["field-observation"] = "At least one citation is labeled field observation.";
  }

  const completenessLabel = completenessFromGaps(place, missingFields);
  const completenessNote =
    completenessLabel === "strong"
      ? "Nearly all optional data is present for this place."
      : completenessLabel === "solid"
        ? "The core climate data is present. A few optional figures are missing."
        : "Several optional figures are missing, so treat the comfort scores with extra caution.";

  return {
    placeId: place.id,
    normalsPeriod: CLIMATE_NORMALS_PERIOD,
    confidence: place.confidence,
    confidenceNotes: place.confidenceNotes?.trim() || undefined,
    completenessLabel,
    completenessNote,
    citationCount: citations.length,
    urlCitationCount,
    classesPresent: EVIDENCE_CLASSES.filter(c => classesPresent.has(c)),
    classNotes,
    sourceGroups,
    missingFields,
    howToRead:
      "Start with the measured climate and the explanation of what causes it. Scores are editorial ratings, indices are calculations, and the 2050 layers are broad regional illustrations.",
  };
}

/** Validate citation/evidence invariants that can be checked truthfully. */
export function validatePlaceEvidence(place: Place): string[] {
  const errors: string[] = [];
  const citations = place.citations ?? [];

  if (!ALLOWED_CONFIDENCE.includes(place.confidence)) {
    errors.push(`confidence "${place.confidence}" is not allowlisted`);
  }

  const seenKeys = new Set<string>();
  for (const c of citations) {
    if (!citationLabelOk(c)) {
      errors.push(`citation kind ${c.kind} has an empty label`);
    }
    if (!(ALLOWED_CITATION_KINDS as readonly string[]).includes(c.kind)) {
      errors.push(`citation kind "${c.kind}" is not allowlisted`);
    }
    if (c.url != null && safeExternalHref(c.url) == null) {
      errors.push(`citation "${c.label}" has unsafe or malformed URL`);
    }
    const key = `${c.kind}::${c.label.trim().toLowerCase()}::${(c.url ?? "").trim().toLowerCase()}`;
    if (seenKeys.has(key)) {
      errors.push(`duplicate citation "${c.label}" (${c.kind})`);
    }
    seenKeys.add(key);
  }

  if (place.projection) {
    const projectionSupport = citations.filter(
      c => PROJECTION_SOURCE_KINDS.has(c.kind) || c.kind === "academic" || c.kind === "other",
    );
    const urlSupport = projectionSupport.filter(c => safeExternalHref(c.url) != null);
    if (urlSupport.length < 1) {
      errors.push("authored projection override requires at least one URL-backed projection, academic, or other citation");
    }
  }

  return errors;
}

/** Guard that UI evidence classes stay exhaustive relative to the const list. */
export function assertEvidenceClassesExhaustive(values: readonly string[]): void {
  const expected = new Set<string>(EVIDENCE_CLASSES);
  const got = new Set(values);
  for (const v of expected) {
    if (!got.has(v)) throw new Error(`Missing evidence class in UI registry: ${v}`);
  }
  for (const v of got) {
    if (!expected.has(v)) throw new Error(`Unknown evidence class in UI registry: ${v}`);
  }
}
