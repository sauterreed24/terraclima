// ============================================================
// Terraclima — Corpus research / provenance contracts
// ============================================================
// Separate from Place objects so source metadata is not repeated
// inside already-large authored records. Runtime merges receipts
// the same way Climate Data V2 overlays climate normals.
// ============================================================

export type SourceType =
  | "official-dataset"
  | "official-page"
  | "peer-reviewed"
  | "academic"
  | "open-data"
  | "derived-receipt";

export type VerificationStatus =
  | "triangulated"
  | "primary-only"
  | "derived"
  | "unresolved";

export type ClaimMethod = "direct" | "calculated" | "editorial-synthesis";

export type SourceGeography =
  | "point"
  | "station"
  | "municipality"
  | "county"
  | "region"
  | "national";

export interface CorpusSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: SourceType;
  accessedOn: string;
  publishedOrUpdatedOn?: string;
  dataPeriod?: string;
  version?: string;
  /** Station, table, layer, page, API query, or feature ID. */
  locator?: string;
  geography: SourceGeography;
  licenseOrTerms?: string;
}

export interface ClaimEvidence {
  id: string;
  /** Exact Place field paths or stable narrative block IDs. */
  fieldPaths: string[];
  sourceIds: string[];
  method: ClaimMethod;
  verification: VerificationStatus;
  checkedOn: string;
  calculationOrReasoning?: string;
  note?: string;
}

export interface PlaceResearchUnresolved {
  fieldPaths: string[];
  issue: string;
  nextAction: string;
}

export interface PlaceResearchReceipt {
  placeId: string;
  reviewedOn: string;
  status: "verified" | "needs-review";
  sources: CorpusSource[];
  claims: ClaimEvidence[];
  unresolved: PlaceResearchUnresolved[];
}

/** Ledger row status for checkpoint / resume protocol. */
export type ResearchLedgerStatus =
  | "inventory"
  | "researching"
  | "drafted"
  | "verified"
  | "blocked";

export interface ResearchLedgerEntry {
  placeId: string;
  country: "USA" | "Canada" | "Mexico";
  tier: "A" | "B" | "C";
  status: ResearchLedgerStatus;
  lastReviewed: string | null;
  factualFieldsCompleted: string[];
  narrativeBlocksCompleted: string[];
  unresolvedConflicts: string[];
  sourceCount: number;
  claimCount: number;
  climateValidationStatus: "validated" | "grid-only" | "reviewed-exception" | "unknown";
  lastCheckpointCommit: string | null;
  notes?: string;
}

export interface ResearchLedger {
  version: 1;
  baseSha: string;
  updatedOn: string;
  batchSizeHint: [number, number];
  entries: ResearchLedgerEntry[];
}

/** Narrative block IDs that every verified place must evidence. */
export const REQUIRED_NARRATIVE_BLOCKS = [
  "summaryShort",
  "summaryImmersive",
  "whyDistinct",
  "experience.feel",
  "experience.seasons.winter",
  "experience.seasons.spring",
  "experience.seasons.summer",
  "experience.seasons.autumn",
  "experience.travelerFit",
  "experience.residentFit",
  "experience.texture",
  "whoWouldLove",
  "whoMightNot",
] as const;

/** Core factual field groups that must have claim coverage. */
export const REQUIRED_FACTUAL_FIELD_GROUPS = [
  "identity",
  "coordinates",
  "elevationM",
  "climate.monthly",
  "climate.annualPrecipMm",
  "soil",
  "risks",
  "livedIndicators",
  "scores",
] as const;

export const BANNED_VOICE_PHRASES = [
  "the atlas reads as",
  "the summary captures",
  "the climate signature",
  "climate romance",
  "hidden gem",
  "something for everyone",
  "paradise on earth",
  "best-kept secret",
  "picture-perfect",
  "must-see destination",
] as const;
