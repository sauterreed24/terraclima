import { describe, expect, it } from "vitest";
import { classifyAtlasTouchGesture } from "../atlas-map-touch-gesture";

describe("classifyAtlasTouchGesture", () => {
  it("keeps tiny movements pending", () => {
    expect(classifyAtlasTouchGesture({ dx: 4, dy: 3, explicitMapMode: false })).toBe("pending");
  });

  it("pans the map for horizontal drags", () => {
    expect(classifyAtlasTouchGesture({ dx: 18, dy: 3, explicitMapMode: false })).toBe("map-pan");
  });

  it("pans the map for diagonal drags", () => {
    expect(classifyAtlasTouchGesture({ dx: 18, dy: 16, explicitMapMode: false })).toBe("map-pan");
  });

  it("lets mostly vertical drags scroll the page", () => {
    expect(classifyAtlasTouchGesture({ dx: 8, dy: 22, explicitMapMode: false })).toBe("page-scroll");
  });

  it("always pans in explicit map mode", () => {
    expect(classifyAtlasTouchGesture({ dx: 0, dy: 24, explicitMapMode: true })).toBe("map-pan");
  });
});
