import type { Place, ScenarioId } from "../types";
import { placeForCompareSlot } from "./climate-projection";
import type { RankingResult } from "./scoring";

export type ComparisonLensId = "balanced" | "travel" | "move" | "remote" | "garden" | "risk";

export interface ComparisonLensOption {
  id: ComparisonLensId;
  label: string;
  detail: string;
}

export type CompareCandidateSource = "Active" | "Shortlist" | "Recent" | "Ranked";

export interface CompareCandidate {
  place: Place;
  source: CompareCandidateSource;
  note?: string;
}

export const DEFAULT_COMPARISON_LENS: ComparisonLensId = "balanced";

export const COMPARISON_LENS_OPTIONS: readonly ComparisonLensOption[] = [
  { id: "balanced", label: "Balanced", detail: "Fit, comfort, lived ease, garden, and risk in one read." },
  { id: "travel", label: "Travel", detail: "Comfort windows, low hassle, and memorable climate contrast." },
  { id: "move", label: "Move", detail: "Livability, daily friction, resilience, and underwriting risk." },
  { id: "remote", label: "Remote", detail: "Low daily friction, fit, comfort, and service access." },
  { id: "garden", label: "Garden", detail: "Growability, season runway, water stress, and climate resilience." },
  { id: "risk", label: "Risk", detail: "Lower hazard load, resilience, and fewer lived-friction surprises." },
];

const COMPARISON_LENS_IDS = new Set<ComparisonLensId>(
  COMPARISON_LENS_OPTIONS.map(option => option.id),
);

export function isComparisonLensId(value: string | null | undefined): value is ComparisonLensId {
  return value != null && COMPARISON_LENS_IDS.has(value as ComparisonLensId);
}

export function comparisonLensLabel(id: ComparisonLensId): string {
  return COMPARISON_LENS_OPTIONS.find(option => option.id === id)?.label ?? "Balanced";
}

/** Compare workbench tray: shortlist, recents, and ranked leaders for swap-in. */
export function buildCompareCandidates({
  bookmarkIds,
  recentIds,
  ranked,
  placesById,
  scenario,
  scenarioRankingLabel,
  resolveCorpusPlace,
}: {
  bookmarkIds: Iterable<string>;
  recentIds: readonly string[];
  ranked: readonly RankingResult[];
  placesById: Readonly<Record<string, Place>>;
  scenario: ScenarioId;
  scenarioRankingLabel: string;
  resolveCorpusPlace: (id: string) => Place | undefined;
}): CompareCandidate[] {
  const seen = new Set<string>();
  const candidates: CompareCandidate[] = [];
  const push = (place: Place | undefined, source: CompareCandidateSource, note: string) => {
    if (!place || seen.has(place.id)) return;
    seen.add(place.id);
    candidates.push({ place, source, note });
  };

  const resolve = (id: string) =>
    placeForCompareSlot(id, placesById, scenario, resolveCorpusPlace(id));

  for (const id of bookmarkIds) {
    push(resolve(id), "Shortlist", "Pinned to your shortlist");
  }
  for (const id of recentIds) {
    push(resolve(id), "Recent", "Recently opened dossier");
  }
  for (const row of ranked.slice(0, 12)) {
    push(row.place, "Ranked", `${scenarioRankingLabel} leader`);
  }

  return candidates;
}

