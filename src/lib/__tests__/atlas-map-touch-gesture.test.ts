import { describe, expect, it } from "vitest";
import {
  ATLAS_DEFAULT_TOUCH_MODE,
  atlasTouchActionForMode,
  resolveAtlasMapInteractive,
} from "../atlas-map-touch-gesture";

describe("atlas touch mode", () => {
  it("defaults coarse pointers to direct map interaction", () => {
    expect(ATLAS_DEFAULT_TOUCH_MODE).toBe("map");
    expect(resolveAtlasMapInteractive({ coarsePointer: true, touchMode: ATLAS_DEFAULT_TOUCH_MODE })).toBe(true);
    expect(atlasTouchActionForMode(true)).toBe("none");
  });

  it("lets phone users explicitly give scrolling back to the browser", () => {
    expect(resolveAtlasMapInteractive({ coarsePointer: true, touchMode: "page" })).toBe(false);
    expect(atlasTouchActionForMode(false)).toBe("pan-y pinch-zoom");
  });

  it("keeps desktop maps interactive regardless of the coarse touch toggle state", () => {
    expect(resolveAtlasMapInteractive({ coarsePointer: false, touchMode: "page" })).toBe(true);
    expect(resolveAtlasMapInteractive({ coarsePointer: false, touchMode: "map" })).toBe(true);
  });
});
