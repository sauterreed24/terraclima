import { COMPARE_LIMIT } from "./app-url";

export interface ShortlistReadiness {
  label: string;
  detail: string;
}

export function buildShortlistReadiness(count: number, compareLimit = COMPARE_LIMIT): ShortlistReadiness | null {
  if (count <= 0) return null;
  if (count === 1) {
    return {
      label: "1 place pinned",
      detail: "Pin a second place to compare. Export already works for this one.",
    };
  }
  if (count > compareLimit) {
    return {
      label: "Ready to compare",
      detail: `Compare the first ${compareLimit}. The visit plan export includes all ${count} pinned places.`,
    };
  }
  return {
    label: "Ready to compare",
    detail: `Compare these ${count} places, or export a visit plan with best months and cautions.`,
  };
}
