import { describe, expect, it } from "vitest";
import { PLACE_GRID_ROW_ESTIMATE_PX } from "../VirtualPlaceGrid";

describe("VirtualPlaceGrid row estimates", () => {
  it("tracks the current rich PlaceCard height closely enough to avoid scroll collapse", () => {
    expect(PLACE_GRID_ROW_ESTIMATE_PX.desktop).toBeGreaterThanOrEqual(1000);
    expect(PLACE_GRID_ROW_ESTIMATE_PX.mobile).toBeGreaterThanOrEqual(1100);
    expect(PLACE_GRID_ROW_ESTIMATE_PX.mobile).toBeGreaterThan(PLACE_GRID_ROW_ESTIMATE_PX.desktop);
  });
});
