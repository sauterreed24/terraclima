import { describe, expect, it } from "vitest";
import { computePinLabelModes } from "../atlas-map-label-visibility";
import type { Place, Tier } from "../../types";

function place(id: string, tier: Tier, name = id): Place {
  return { id, tier, name } as Place;
}

describe("computePinLabelModes", () => {
  it("uses screen-space label boxes so scaled labels do not collide", () => {
    const modes = computePinLabelModes(
      [
        { place: place("a", "A", "Alpha Ridge"), x: 0, y: 0 },
        { place: place("b", "A", "Beta Valley"), x: 160, y: 0 },
      ],
      0.5,
      undefined,
      null,
    );

    expect(modes.get("a")).toBe("compact");
    expect(modes.get("b")).toBe("hidden");
  });

  it("allows labels when post-layout positions are honestly separated", () => {
    const modes = computePinLabelModes(
      [
        { place: place("a", "A", "Alpha Ridge"), x: 0, y: 0 },
        { place: place("b", "A", "Beta Valley"), x: 260, y: 0 },
      ],
      1.2,
      undefined,
      null,
    );

    expect(modes.get("a")).toBe("full");
    expect(modes.get("b")).toBe("full");
  });

  it("keeps selected labels full and suppresses nearby background labels", () => {
    const modes = computePinLabelModes(
      [
        { place: place("selected", "C", "Selected Town"), x: 0, y: 0 },
        { place: place("neighbor", "A", "Neighbor Basin"), x: 18, y: 0 },
      ],
      1.5,
      "selected",
      null,
    );

    expect(modes.get("selected")).toBe("full");
    expect(modes.get("neighbor")).toBe("hidden");
  });

  it("keeps wide-view maps selective before users zoom in", () => {
    const modes = computePinLabelModes(
      [
        { place: place("flagship", "A", "Flagship Coast"), x: 0, y: 0 },
        { place: place("spotlight", "B", "Spotlight Valley"), x: 400, y: 0 },
      ],
      0.7,
      undefined,
      null,
    );

    expect(modes.get("flagship")).toBe("compact");
    expect(modes.get("spotlight")).toBe("hidden");
  });
});
