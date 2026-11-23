import { describe, expect, it } from "vitest";
import { estimateMapLabelWidth, placeMapLabels } from "../atlas-map-label-placement";

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

  it("estimates tracked lettering width", () => {
    expect(estimateMapLabelWidth("CANADA", 10, 0.3, 0.7)).toBeCloseTo(60);
  });
});
