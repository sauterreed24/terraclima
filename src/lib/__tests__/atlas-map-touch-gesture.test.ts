import { describe, expect, it } from "vitest";
import {
  ATLAS_DEFAULT_TOUCH_MODE,
  atlasTouchActionForMode,
  needsAtlasScrollEscape,
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

  it("keeps pure fine-pointer desktops interactive regardless of touchMode", () => {
    expect(resolveAtlasMapInteractive({ coarsePointer: false, touchMode: "page" })).toBe(true);
    expect(resolveAtlasMapInteractive({ coarsePointer: false, touchMode: "map" })).toBe(true);
  });

  it("exposes a scroll escape for hybrid fine-pointer + touch devices", () => {
    expect(needsAtlasScrollEscape({ coarsePointer: false, anyCoarsePointer: true })).toBe(true);
    expect(needsAtlasScrollEscape({ coarsePointer: false, touchCapable: true })).toBe(true);
    expect(needsAtlasScrollEscape({ coarsePointer: false })).toBe(false);

    expect(resolveAtlasMapInteractive({
      coarsePointer: false,
      anyCoarsePointer: true,
      touchMode: "page",
    })).toBe(false);
    expect(resolveAtlasMapInteractive({
      coarsePointer: false,
      touchCapable: true,
      touchMode: "map",
    })).toBe(true);
  });
});
