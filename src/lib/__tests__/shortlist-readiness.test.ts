import { describe, expect, it } from "vitest";
import { buildShortlistReadiness } from "../shortlist-readiness";

describe("buildShortlistReadiness", () => {
  it("returns no cue when the shortlist is empty", () => {
    expect(buildShortlistReadiness(0)).toBeNull();
  });

  it("nudges a one-place shortlist toward Compare readiness", () => {
    expect(buildShortlistReadiness(1)).toEqual({
      label: "Scout setup ready",
      detail: "Open Compare setup to plan the missing contrast; export already saves this dossier.",
    });
  });

  it("describes Compare and export readiness for finalists within the Compare limit", () => {
    expect(buildShortlistReadiness(3)).toEqual({
      label: "Scout packet ready",
      detail: "Compare 3 finalists or export a Scout plan with visit windows and watch-first caveats.",
    });
  });

  it("keeps over-limit shortlists honest about Compare truncation and full export order", () => {
    expect(buildShortlistReadiness(5, 4)).toEqual({
      label: "Scout packet ready",
      detail: "Compare the first 4; the Scout plan export keeps all 5 pinned places in order.",
    });
  });
});
