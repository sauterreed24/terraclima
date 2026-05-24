import { describe, it, expect } from "vitest";
import { classifyBioclim, computeBioclim, daylengthHours } from "../bioclim";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

const M = (v: number[]): Monthly12 => v as unknown as Monthly12;

// Corpus / hand-traced anchors — values from the locked Plan-agent spec with
// Selianinov recomputed using the canonical days-in-month-weighted denominator
// (Sequim's notably dry summer rain-shadow must land in the dry/arid band,
// not "wet").
const SEQUIM = {
  lat: 48.08,
  high: [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
  low: [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
  precip: [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
};
const PHOENIX = {
  lat: 33.45,
  high: [20, 22, 25, 30, 35, 40, 41, 40, 38, 32, 24, 19],
  low: [7, 9, 12, 16, 21, 26, 29, 28, 25, 18, 11, 7],
  precip: [20, 20, 25, 8, 3, 1, 25, 28, 18, 17, 18, 22],
};
const SINGAPORE = {
  lat: 1.3,
  high: [30, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 30],
  low: [23, 23, 24, 24, 25, 25, 25, 25, 24, 24, 23, 23],
  precip: [240, 160, 170, 150, 170, 130, 150, 170, 160, 160, 250, 290],
};

const within = (actual: number, expected: number, fracTol: number): boolean =>
  Math.abs(actual - expected) <= Math.abs(expected) * fracTol;

describe("classifyBioclim — Sequim WA (Csb rain-shadow, MAT 10.2, MAP 475)", () => {
  const r = classifyBioclim(SEQUIM.high, SEQUIM.low, SEQUIM.precip, SEQUIM.lat)!;

  it("computes De Martonne ≈ 23.5 (Mediterranean)", () => {
    expect(r.deMartonne.value).not.toBeNull();
    expect(within(r.deMartonne.value as number, 23.5, 0.05)).toBe(true);
    expect((r.deMartonne as { class: string }).class).toBe("mediterranean");
  });

  it("computes Conrad ≈ 10.2 (oceanic)", () => {
    expect(within(r.conrad.value as number, 10.2, 0.05)).toBe(true);
    expect((r.conrad as { class: string }).class).toBe("oceanic");
  });

  it("computes Thornthwaite annual PET ≈ 633 mm/yr (matches NOAA evapotranspiration estimates for the WA coast 600–700)", () => {
    expect(within(r.thornthwaitePet.value, 633, 0.05)).toBe(true);
  });

  it("computes UNEP aridity ≈ 0.75 (humid)", () => {
    expect(within(r.unepAridity.value as number, 0.75, 0.05)).toBe(true);
    expect((r.unepAridity as { class: string }).class).toBe("humid");
  });

  it("computes Selianinov HTC ≈ 0.57 (arid — the rain-shadow dry summer)", () => {
    expect(within(r.selianinov.value as number, 0.57, 0.08)).toBe(true);
    expect((r.selianinov as { class: string }).class).toBe("arid");
  });
});

describe("classifyBioclim — Phoenix AZ (BWh hot desert, MAT 23.9, MAP 205)", () => {
  const r = classifyBioclim(PHOENIX.high, PHOENIX.low, PHOENIX.precip, PHOENIX.lat)!;

  it("computes De Martonne ≈ 6.04 (arid)", () => {
    expect(within(r.deMartonne.value as number, 6.04, 0.05)).toBe(true);
    expect((r.deMartonne as { class: string }).class).toBe("arid");
  });

  it("computes Conrad ≈ 40.4 (sub-continental)", () => {
    expect(within(r.conrad.value as number, 40.4, 0.05)).toBe(true);
    expect((r.conrad as { class: string }).class).toBe("sub-continental");
  });

  it("computes Thornthwaite annual PET in the 1500–2200 mm/yr range (high-heat overshoot is a known property)", () => {
    expect(r.thornthwaitePet.value).toBeGreaterThan(1500);
    expect(r.thornthwaitePet.value).toBeLessThan(2200);
  });

  it("computes UNEP aridity in the arid band (0.05–0.20)", () => {
    expect(r.unepAridity.value as number).toBeGreaterThanOrEqual(0.05);
    expect(r.unepAridity.value as number).toBeLessThan(0.20);
    expect((r.unepAridity as { class: string }).class).toBe("arid");
  });

  it("computes Selianinov HTC in the dry band (Phoenix winters keep ΣT·d high → HTC < 0.4)", () => {
    expect(within(r.selianinov.value as number, 0.23, 0.10)).toBe(true);
    expect((r.selianinov as { class: string }).class).toBe("dry");
  });
});

describe("classifyBioclim — Singapore (Af tropical maritime, MAT 27, MAP 2200)", () => {
  const r = classifyBioclim(SINGAPORE.high, SINGAPORE.low, SINGAPORE.precip, SINGAPORE.lat)!;

  it("computes De Martonne ≈ 59 (extremely humid)", () => {
    expect(within(r.deMartonne.value as number, 59.4, 0.05)).toBe(true);
    expect((r.deMartonne as { class: string }).class).toBe("extremely-humid");
  });

  it("computes Conrad K ≈ 3.4 (extreme oceanic — tropical low-amplitude)", () => {
    expect(within(r.conrad.value as number, 3.4, 0.20)).toBe(true);
    expect((r.conrad as { class: string }).class).toBe("extreme-oceanic");
  });

  it("computes Selianinov HTC ≈ 2.2 (wet — all months in the growing season + monsoonal rain)", () => {
    expect(within(r.selianinov.value as number, 2.18, 0.15)).toBe(true);
    expect((r.selianinov as { class: string }).class).toBe("wet");
  });

  it("computes UNEP aridity in the humid band (≥ 0.65)", () => {
    expect(r.unepAridity.value as number).toBeGreaterThanOrEqual(0.65);
    expect((r.unepAridity as { class: string }).class).toBe("humid");
  });
});

describe("classifyBioclim — band-boundary cross-checks (textbook exemplars)", () => {
  it("Cairo (MAT ≈ 22, MAP ≈ 25) lands in the hyperarid bands across the board", () => {
    const r = classifyBioclim(
      [19, 21, 24, 29, 33, 35, 35, 35, 33, 30, 25, 20],
      [9, 9, 11, 14, 18, 20, 22, 22, 20, 18, 14, 10],
      [5, 4, 4, 1, 0, 0, 0, 0, 0, 0, 3, 6],
      30.04,
    )!;
    expect((r.deMartonne as { class: string }).class).toBe("hyperarid");
    expect((r.unepAridity as { class: string }).class).toBe("hyperarid");
  });

  it("Reykjavík (MAT ≈ 5, MAP ≈ 800) lands in the humid / oceanic bands", () => {
    const r = classifyBioclim(
      [3, 3, 4, 6, 9, 12, 13, 13, 11, 7, 4, 3],
      [-2, -2, -1, 1, 4, 7, 9, 8, 6, 3, 0, -2],
      [76, 72, 82, 58, 44, 50, 52, 62, 67, 86, 73, 79],
      64.13,
    )!;
    // De Martonne 800/(5+10) ≈ 53 → very-humid (35–55) or extremely-humid (≥55).
    const dm = r.deMartonne.value as number;
    expect(dm).toBeGreaterThan(45);
    // Conrad ≈ 8 at lat 64 with small amplitude → oceanic / extreme-oceanic.
    expect(r.conrad.value as number).toBeLessThan(25);
  });

  it("Verkhoyansk (MAT ≈ -13) returns De Martonne null with reason `mat_below_neg10`", () => {
    const r = classifyBioclim(
      [-40, -34, -19, 1, 13, 22, 25, 21, 9, -10, -29, -37],
      [-49, -46, -36, -19, -3, 6, 9, 5, -2, -19, -38, -47],
      [5, 5, 3, 5, 18, 25, 33, 30, 22, 13, 11, 8],
      67.55,
    )!;
    expect(r.deMartonne.value).toBeNull();
    expect((r.deMartonne as { reason: string }).reason).toBe("mat_below_neg10");
    expect((r.conrad as { class: string }).class).toBe("extreme-continental");
    // Brief growing season exists (Jun/Jul/Aug) → Selianinov has a value.
    expect(r.selianinov.value).not.toBeNull();
  });
});

describe("classifyBioclim — documented edge cases", () => {
  it("returns null on degenerate input (wrong length, NaN, non-finite lat)", () => {
    expect(classifyBioclim([1, 2, 3], [1, 2, 3], [1, 2, 3], 45)).toBeNull();
    const nan12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, NaN];
    expect(classifyBioclim(nan12, nan12, nan12, 45)).toBeNull();
    const ok = Array(12).fill(10);
    expect(classifyBioclim(ok, ok, ok, Number.NaN)).toBeNull();
  });

  it("returns Selianinov null with reason `no_growing_season` when no month exceeds 10 °C", () => {
    // High-Arctic: warmest mean month sits at 5 °C, never crosses 10.
    const high = [-10, -10, -8, -2, 4, 9, 11, 9, 4, -2, -8, -10];
    const low = [-20, -20, -18, -10, -2, 2, 3, 2, -2, -8, -16, -20];
    const precip = [10, 10, 10, 15, 25, 30, 30, 30, 25, 15, 10, 10];
    const r = classifyBioclim(high, low, precip, 70)!;
    // Warmest mean = (11 + 3) / 2 = 7 → no month is strictly > 10.
    expect(r.selianinov.value).toBeNull();
    expect((r.selianinov as { reason: string }).reason).toBe("no_growing_season");
  });

  it("returns UNEP null with reason `no_pet` when every month is below freezing (I = 0)", () => {
    const high = Array(12).fill(-2);
    const low = Array(12).fill(-12);
    const precip = Array(12).fill(15);
    const r = classifyBioclim(high, low, precip, 75)!;
    expect(r.thornthwaitePet.value).toBe(0);
    expect(r.unepAridity.value).toBeNull();
    expect((r.unepAridity as { reason: string }).reason).toBe("no_pet");
  });
});

describe("daylengthHours — astronomical sanity", () => {
  it("equinoxes give ≈ 12 h at any latitude", () => {
    // Sep 22 (J ≈ 265) is in month 9 (Oct mid by our J_MID; close to equinox).
    // Mar 21 (J ≈ 80) is in month 2 (Mar mid). Use the canonical midpoints
    // adjacent to the equinoxes and confirm ≈ 12 h to within 0.6 h.
    for (const lat of [0, 15, 30, 45, 60]) {
      expect(Math.abs(daylengthHours(lat, 2) - 12)).toBeLessThan(0.8);
      expect(Math.abs(daylengthHours(lat, 8) - 12)).toBeLessThan(0.8);
    }
  });

  it("June solstice at 48° N ≈ 15.4 h (Sequim July anchor)", () => {
    expect(Math.abs(daylengthHours(48.08, 6) - 15.4)).toBeLessThan(0.5);
  });

  it("polar branches return 24 h (midnight sun) and 0 h (polar night)", () => {
    expect(daylengthHours(80, 6)).toBe(24);
    expect(daylengthHours(80, 0)).toBe(0);
  });

  it("equatorial daylength stays within 0.2 h of 12 year-round (|φ| < 5°)", () => {
    for (let m = 0; m < 12; m += 1) {
      expect(Math.abs(daylengthHours(1.3, m) - 12)).toBeLessThan(0.2);
    }
  });
});

describe("computeBioclim — Place caching", () => {
  it("returns the same cached object for repeated calls on the same Place", () => {
    const place = makePlace();
    const first = computeBioclim(place);
    const second = computeBioclim(place);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it("returns null when the underlying climate arrays are degenerate", () => {
    // makeClimate's defaults are well-formed; spike a NaN to force degeneracy.
    const place = makePlace({
      climate: makeClimate({
        tempHighC: M([8, 10, 14, 18, 22, 26, 28, 27, 24, 19, 13, Number.NaN]),
      }),
    });
    expect(computeBioclim(place)).toBeNull();
  });
});
