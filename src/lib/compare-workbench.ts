import type { Place } from "../types";

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

