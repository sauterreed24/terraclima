import { COMPARE_LIMIT } from "./app-url";

export interface ShortlistReadiness {
  label: string;
  detail: string;
}

export function buildShortlistReadiness(count: number, compareLimit = COMPARE_LIMIT): ShortlistReadiness | null {
  if (count <= 0) return null;
  if (count === 1) {
    return {
      label: "Scout packet warming up",
      detail: "Pin one more place to unlock Compare; the Scout plan export already saves this dossier.",
    };
  }
  if (count > compareLimit) {
    return {
      label: "Scout packet ready",
      detail: `Compare the first ${compareLimit}; the Scout plan export keeps all ${count} pinned places in order.`,
    };
  }
  return {
    label: "Scout packet ready",
    detail: `Compare ${count} finalists or export a Scout plan with visit windows and watch-first caveats.`,
  };
}
