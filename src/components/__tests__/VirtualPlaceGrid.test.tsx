import { describe, expect, it } from "vitest";
import { PLACE_GRID_ROW_ESTIMATE_PX } from "../VirtualPlaceGrid";

describe("VirtualPlaceGrid row estimates", () => {
  it("tracks discovery PlaceCard height closely enough to avoid scroll collapse", () => {
    expect(PLACE_GRID_ROW_ESTIMATE_PX.desktop).toBeGreaterThanOrEqual(700);
    expect(PLACE_GRID_ROW_ESTIMATE_PX.mobile).toBeGreaterThanOrEqual(800);
    expect(PLACE_GRID_ROW_ESTIMATE_PX.mobile).toBeGreaterThan(PLACE_GRID_ROW_ESTIMATE_PX.desktop);
  });

  it("keeps taller estimates for fit-oriented screening cards", () => {
    expect(PLACE_GRID_ROW_ESTIMATE_PX.screeningDesktop).toBeGreaterThan(PLACE_GRID_ROW_ESTIMATE_PX.desktop);
    expect(PLACE_GRID_ROW_ESTIMATE_PX.screeningMobile).toBeGreaterThan(PLACE_GRID_ROW_ESTIMATE_PX.mobile);
  });
});
