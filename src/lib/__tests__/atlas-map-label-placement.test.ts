import { describe, expect, it } from "vitest";
import { estimateMapLabelWidth, mapLabelCoverFraction, placeMapLabels } from "../atlas-map-label-placement";

const candidates = [[0, 0], [0, -24], [0, 24]] as const;

describe("atlas map label placement", () => {
  it("keeps the anchor seat when nothing is in the way", () => {
    const out = placeMapLabels([{ id: "a", x: 100, y: 100, halfW: 40, halfH: 8, candidates }], [], 1);
    expect(out.get("a")).toEqual({ dx: 0, dy: 0, clear: true });
  });

  it("slides to the first clear candidate when a badge covers the anchor", () => {
    const out = placeMapLabels(
      [{ id: "a", x: 100, y: 100, halfW: 40, halfH: 8, candidates }],
      [{ x: 100, y: 108, r: 14 }],
      1,
    );
    expect(out.get("a")).toEqual({ dx: 0, dy: -24, clear: true });
  });

  it("scales obstacle positions with zoom but keeps badge radii in pixels", () => {
    const request = { id: "a", x: 100, y: 100, halfW: 40, halfH: 8, candidates: [[0, 0]] as const };
    const obstacle = { x: 130, y: 100, r: 14 };
    expect(placeMapLabels([request], [obstacle], 1).get("a")?.clear).toBe(false);
    expect(placeMapLabels([request], [obstacle], 3).get("a")?.clear).toBe(true);
  });

  it("hides a label with no clear seat and keeps later labels off earlier ones", () => {
    const out = placeMapLabels(
      [
        { id: "first", x: 100, y: 100, halfW: 40, halfH: 8, candidates: [[0, 0]] },
        { id: "second", x: 110, y: 104, halfW: 40, halfH: 8, candidates: [[0, 0]] },
        { id: "unfit", x: 400, y: 400, halfW: Number.POSITIVE_INFINITY, halfH: 8, candidates },
      ],
      [],
      1,
    );
    expect(out.get("first")?.clear).toBe(true);
    expect(out.get("second")?.clear).toBe(false);
    expect(out.get("unfit")?.clear).toBe(false);
  });

  it("falls back to the compact setting before giving up a clear seat", () => {
    const out = placeMapLabels(
      [{ id: "a", x: 100, y: 100, halfW: 60, compactHalfW: 40, halfH: 8, candidates: [[0, 0]] }],
      [{ x: 160, y: 100, r: 10 }],
      1,
    );
    expect(out.get("a")).toEqual({ dx: 0, dy: 0, clear: true, compact: true });
  });

  it("keeps a slightly covered seat within the cover budget, and reports the share", () => {
    const request = { id: "a", x: 100, y: 100, halfW: 50, halfH: 8, candidates: [[0, 0]] as const, maxCover: 0.3 };
    // Badge over the label's right end: 20 of 100 px covered.
    const out = placeMapLabels([request], [{ x: 150, y: 100, r: 20 }], 1);
    const seat = out.get("a")!;
    expect(seat.clear).toBe(false);
    expect(seat.cover).toBeCloseTo(0.2, 5);
    // Without a budget the same label is simply hidden.
    const strict = placeMapLabels([{ ...request, maxCover: undefined }], [{ x: 150, y: 100, r: 20 }], 1);
    expect(strict.get("a")).toEqual({ dx: 0, dy: 0, clear: false });
  });

  it("hides a label that would be mostly covered", () => {
    const out = placeMapLabels(
      [{ id: "a", x: 100, y: 100, halfW: 50, halfH: 8, candidates, maxCover: 0.3 }],
      [{ x: 80, y: 100, r: 40 }, { x: 130, y: 100, r: 40 }],
      1,
    );
    expect(out.get("a")).toEqual({ dx: 0, dy: 0, clear: false });
  });

  it("prefers the least-covered candidate and counts only the opaque part of a badge", () => {
    const out = placeMapLabels(
      [{ id: "a", x: 100, y: 100, halfW: 50, halfH: 8, candidates: [[0, 0], [0, 30]], maxCover: 0.3 }],
      [
        { x: 140, y: 94, r: 24 },
        // Halo reaches the second seat, but its solid disc does not.
        { x: 100, y: 150, r: 24, solidR: 8 },
      ],
      1,
    );
    expect(out.get("a")).toEqual({ dx: 0, dy: 30, clear: false, cover: 0 });
  });

  it("measures cover as the union of overlapping badge spans", () => {
    expect(mapLabelCoverFraction(100, 100, 50, 8, [])).toBe(0);
    expect(mapLabelCoverFraction(100, 100, 50, 8, [{ x: 100, y: 100, r: 10 }, { x: 105, y: 100, r: 10 }])).toBeCloseTo(0.25, 5);
    // Badge above the lettering band does not count.
    expect(mapLabelCoverFraction(100, 100, 50, 8, [{ x: 100, y: 60, r: 10 }])).toBe(0);
  });

  it("tries fallback settings only after the regular ones, clear seats first", () => {
    const wall = [{ x: 100, y: 100, r: 30 }];
    const request = {
      id: "a", x: 100, y: 100, halfW: 60, compactHalfW: 50, halfH: 8, maxCover: 0.3, candidates: [[0, 0]] as const,
      fallbacks: [
        { variant: "tight", halfW: 30 },
        { variant: "stacked", halfW: 14, halfH: 14, candidates: [[0, 0], [70, 0]] as const },
      ],
    };
    // Roomy map: the regular setting wins and no fallback is reported.
    expect(placeMapLabels([request], [], 1).get("a")).toEqual({ dx: 0, dy: 0, clear: true });
    // Badge on the anchor: only the stacked setting has a clear seat, on its own candidate list.
    expect(placeMapLabels([request], wall, 1).get("a")).toEqual({ dx: 70, dy: 0, clear: true, variant: "stacked" });
  });

  it("never seats a fallback partly under a badge", () => {
    const badge = [{ x: 100, y: 100, r: 30, solidR: 6 }];
    const request = {
      id: "a", x: 100, y: 100, halfW: Number.POSITIVE_INFINITY, halfH: 8, maxCover: 0.3, candidates: [[0, 0]] as const,
      fallbacks: [{ variant: "tight", halfW: 30 }],
    };
    expect(placeMapLabels([request], badge, 1).get("a")).toEqual({ dx: 0, dy: 0, clear: false });
    expect(placeMapLabels([request], [], 1).get("a")).toEqual({ dx: 0, dy: 0, clear: true, variant: "tight" });
  });

  it("estimates tracked lettering width", () => {
    expect(estimateMapLabelWidth("CANADA", 10, 0.3, 0.7)).toBeCloseTo(60);
  });
});
