// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  atlasClusterFocusId,
  endpointMarkerId,
  isAtlasClusterFocusId,
  isMarkerKeyboardTarget,
  nextMarkerId,
  type AtlasMarkerLayoutPoint,
} from "../atlas-map-keyboard";

const ROW_A: AtlasMarkerLayoutPoint[] = [
  { id: "a1", x: 10, y: 10 },
  { id: "a2", x: 70, y: 12 }, // same row bucket as a1 at default 56 px
  { id: "a3", x: 140, y: 14 },
];

const ROW_B: AtlasMarkerLayoutPoint[] = [
  { id: "b1", x: 5, y: 80 },
  { id: "b2", x: 95, y: 80 },
];

const ROW_C: AtlasMarkerLayoutPoint[] = [
  { id: "c1", x: 50, y: 160 },
];

const GRID = [...ROW_A, ...ROW_B, ...ROW_C];

describe("nextMarkerId — degenerate input", () => {
  it("returns null when the visible set is empty", () => {
    expect(nextMarkerId(null, "right", [])).toBeNull();
    expect(nextMarkerId("x", "down", [])).toBeNull();
  });

  it("returns the first visible marker when nothing is focused yet", () => {
    expect(nextMarkerId(null, "right", GRID)).toBe("a1");
    expect(nextMarkerId(null, "down", GRID)).toBe("a1");
  });

  it("returns the first visible marker when current id is not in the set", () => {
    expect(nextMarkerId("missing", "left", GRID)).toBe("a1");
  });
});

describe("nextMarkerId — Left/Right wrap in render order", () => {
  it("ArrowRight steps to the next marker in render order", () => {
    expect(nextMarkerId("a1", "right", GRID)).toBe("a2");
    expect(nextMarkerId("a2", "right", GRID)).toBe("a3");
  });

  it("ArrowRight wraps from the last marker back to the first", () => {
    expect(nextMarkerId("c1", "right", GRID)).toBe("a1");
  });

  it("ArrowLeft steps to the previous marker in render order", () => {
    expect(nextMarkerId("a3", "left", GRID)).toBe("a2");
    expect(nextMarkerId("a2", "left", GRID)).toBe("a1");
  });

  it("ArrowLeft wraps from the first marker around to the last", () => {
    expect(nextMarkerId("a1", "left", GRID)).toBe("c1");
  });
});

describe("nextMarkerId — Up/Down bucket by row, then nearest x", () => {
  it("ArrowDown from row A picks the row B marker closest in X", () => {
    // a1 (x=10) → b1 (x=5) is closer than b2 (x=95).
    expect(nextMarkerId("a1", "down", GRID)).toBe("b1");
    // a3 (x=140) → b2 (x=95) is closer than b1 (x=5).
    expect(nextMarkerId("a3", "down", GRID)).toBe("b2");
  });

  it("ArrowDown from row B picks the only marker in row C", () => {
    expect(nextMarkerId("b1", "down", GRID)).toBe("c1");
    expect(nextMarkerId("b2", "down", GRID)).toBe("c1");
  });

  it("ArrowDown from the bottom row stays put (no candidate row below)", () => {
    expect(nextMarkerId("c1", "down", GRID)).toBe("c1");
  });

  it("ArrowUp from row C goes back to the closer row B marker", () => {
    // c1 (x=50) → b1 (x=5) gap is 45; b2 (x=95) gap is 45. Deterministic
    // tiebreak by id lexicographic order picks b1.
    expect(nextMarkerId("c1", "up", GRID)).toBe("b1");
  });

  it("ArrowUp from the top row stays put", () => {
    expect(nextMarkerId("a1", "up", GRID)).toBe("a1");
    expect(nextMarkerId("a3", "up", GRID)).toBe("a3");
  });

  it("Up/Down respects a custom row bucket size", () => {
    // With a tiny bucket every marker is its own row, so down picks the
    // very next row's nearest-x marker.
    const tightBucket = 1;
    // Sorted by y: a1(10), a2(12), a3(14), b1(80), b2(80), c1(160)
    // From a1, the next row "down" is a2 (only one in that row).
    expect(nextMarkerId("a1", "down", GRID, tightBucket)).toBe("a2");
  });
});

describe("endpointMarkerId", () => {
  it("returns first / last visible marker", () => {
    expect(endpointMarkerId("home", GRID)).toBe("a1");
    expect(endpointMarkerId("end", GRID)).toBe("c1");
  });

  it("returns null on an empty set", () => {
    expect(endpointMarkerId("home", [])).toBeNull();
    expect(endpointMarkerId("end", [])).toBeNull();
  });
});

describe("isMarkerKeyboardTarget", () => {
  it("returns true when the target is inside a marker", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <svg>
        <g data-atlas-marker="true">
          <circle data-inner></circle>
        </g>
      </svg>
    `;
    document.body.appendChild(wrapper);
    const inner = wrapper.querySelector("circle")!;
    expect(isMarkerKeyboardTarget(inner)).toBe(true);
    document.body.removeChild(wrapper);
  });

  it("returns true when the target is inside a unified cluster focus target", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <svg>
        <g data-atlas-focus-target="true" data-atlas-focus-id="cluster:a|b">
          <circle data-inner></circle>
        </g>
      </svg>
    `;
    document.body.appendChild(wrapper);
    expect(isMarkerKeyboardTarget(wrapper.querySelector("circle"))).toBe(true);
    document.body.removeChild(wrapper);
  });

  it("returns false when the target is the bare SVG (not a marker)", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    expect(isMarkerKeyboardTarget(svg)).toBe(false);
    document.body.removeChild(svg);
  });

  it("returns false for null or non-element targets", () => {
    expect(isMarkerKeyboardTarget(null)).toBe(false);
    // Plain object is not an Element.
    expect(isMarkerKeyboardTarget({} as EventTarget)).toBe(false);
  });
});

describe("cluster focus ids", () => {
  it("prefixes cluster keys for the unified roving list", () => {
    expect(atlasClusterFocusId("a|b")).toBe("cluster:a|b");
    expect(isAtlasClusterFocusId("cluster:a|b")).toBe(true);
    expect(isAtlasClusterFocusId("seattle-wa")).toBe(false);
  });

  it("lets arrows walk mixed pin and cluster targets", () => {
    const mixed: AtlasMarkerLayoutPoint[] = [
      { id: "pin-a", x: 10, y: 10 },
      { id: atlasClusterFocusId("b|c"), x: 80, y: 12 },
      { id: "pin-d", x: 140, y: 14 },
    ];
    expect(nextMarkerId("pin-a", "right", mixed)).toBe("cluster:b|c");
    expect(nextMarkerId("cluster:b|c", "right", mixed)).toBe("pin-d");
    expect(endpointMarkerId("home", mixed)).toBe("pin-a");
    expect(endpointMarkerId("end", mixed)).toBe("pin-d");
  });
});
