/**
 * Groups a place's research-receipt claims by claim scope (identity,
 * climate normals, soil, risk, lived indicators, scores, narrative, field
 * dossier, …) so the Evidence & Methods chapter can show "what backs this
 * claim" without dumping a flat citation list.
 */
import type { ClaimEvidence, CorpusSource, PlaceResearchReceipt } from "./contracts";

export interface ClaimScopeGroup {
  scope: string;
  claims: ClaimEvidence[];
}

const SCOPE_RULES: { test: (path: string) => boolean; label: string }[] = [
  {
    test: p => p === "name" || p === "municipality" || p === "region" || p === "country" || p === "lat" || p === "lon",
    label: "Identity & location",
  },
  { test: p => p === "elevationM" || p === "reliefContext", label: "Terrain" },
  { test: p => p.startsWith("climate."), label: "Climate normals" },
  { test: p => p.startsWith("soil."), label: "Soil" },
  { test: p => p.startsWith("growability."), label: "Growability" },
  { test: p => p.startsWith("risks."), label: "Climate risk" },
  { test: p => p.startsWith("liveSignals."), label: "Lived indicators" },
  { test: p => p.startsWith("scores."), label: "Scores" },
  { test: p => p.startsWith("deepSections."), label: "Field dossier" },
  {
    test: p =>
      p.startsWith("experience.") ||
      p === "summaryShort" ||
      p === "summaryImmersive" ||
      p === "whyDistinct" ||
      p === "whoWouldLove" ||
      p === "whoMightNot",
    label: "Narrative & fit",
  },
];

/** Reading order for claim-scope groups in the Evidence chapter. */
const SCOPE_ORDER = [
  "Identity & location",
  "Terrain",
  "Climate normals",
  "Soil",
  "Growability",
  "Climate risk",
  "Lived indicators",
  "Scores",
  "Narrative & fit",
  "Field dossier",
  "Other",
];

function scopeForFieldPath(path: string): string {
  for (const rule of SCOPE_RULES) {
    if (rule.test(path)) return rule.label;
  }
  return "Other";
}

function scopeForClaim(claim: ClaimEvidence): string {
  return scopeForFieldPath(claim.fieldPaths[0] ?? "");
}

/** Groups a receipt's claims by scope, in a stable reading order. */
export function groupClaimsByScope(receipt: PlaceResearchReceipt): ClaimScopeGroup[] {
  const byScope = new Map<string, ClaimEvidence[]>();
  for (const claim of receipt.claims) {
    const scope = scopeForClaim(claim);
    const list = byScope.get(scope) ?? [];
    list.push(claim);
    byScope.set(scope, list);
  }
  return SCOPE_ORDER.filter(scope => byScope.has(scope)).map(scope => ({ scope, claims: byScope.get(scope)! }));
}

/** Resolves a claim's cited source records (skips any dangling source id). */
export function sourcesForClaim(receipt: PlaceResearchReceipt, claim: ClaimEvidence): CorpusSource[] {
  const byId = new Map(receipt.sources.map(s => [s.id, s] as const));
  return claim.sourceIds.map(id => byId.get(id)).filter((s): s is CorpusSource => Boolean(s));
}
