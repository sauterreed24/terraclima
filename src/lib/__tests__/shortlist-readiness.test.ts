import { describe, expect, it } from "vitest";
import { buildShortlistReadiness } from "../shortlist-readiness";

describe("buildShortlistReadiness", () => {
  it("returns no cue when the shortlist is empty", () => {
    expect(buildShortlistReadiness(0)).toBeNull();
  });

  it("nudges a one-place shortlist toward Compare readiness", () => {
    expect(buildShortlistReadiness(1)).toEqual({
      label: "1 place saved",
      detail: "Save a second place to compare. Export already works for this one.",
    });
  });

  it("describes Compare and export readiness for finalists within the Compare limit", () => {
    expect(buildShortlistReadiness(3)).toEqual({
      label: "Ready to compare",
      detail: "Compare these 3 places, or export a visit plan with best months and cautions.",
    });
  });

  it("keeps over-limit shortlists honest about Compare truncation and full export order", () => {
    expect(buildShortlistReadiness(5, 4)).toEqual({
      label: "Ready to compare",
      detail: "Compare the first 4. The visit plan export includes all 5 saved places.",
    });
  });
});
