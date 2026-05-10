import { describe, expect, it } from "vitest";
import { computeBestMonths, formatMonthMask, getBestMonths, resonantWindowFor } from "../best-months";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

describe("formatMonthMask", () => {
  it("returns null when no month is true", () => {
    expect(formatMonthMask(Array(12).fill(false))).toBeNull();
  });
  it("returns 'Year-round' when every month is true", () => {
    expect(formatMonthMask(Array(12).fill(true))).toBe("Year-round");
  });
  it("formats a single contiguous block", () => {
    const mask = [false, false, false, true, true, true, false, false, false, false, false, false];
    expect(formatMonthMask(mask)).toBe("Apr–Jun");
  });
  it("formats two disjoint blocks separated by comma", () => {
    const mask = [true, true, false, false, false, false, false, false, false, false, true, false];
    expect(formatMonthMask(mask)).toBe("Jan–Feb, Nov");
  });
  it("wraps Dec→Jan when both ends are true", () => {
    const mask = [true, true, false, false, false, false, false, false, false, false, true, true];
    expect(formatMonthMask(mask)).toBe("Nov–Feb");
  });
  it("uses single-month label when start === end", () => {
    const mask = Array(12).fill(false);
    mask[6] = true;
    expect(formatMonthMask(mask)).toBe("Jul");
  });
});

describe("computeBestMonths", () => {
  it("emits a heat caution window for places with 32°C+ summers", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [10, 12, 16, 22, 28, 33, 35, 34, 30, 24, 16, 10] as Monthly12,
      }),
    });
    const heat = computeBestMonths(p).find(w => w.id === "heat");
    expect(heat).toBeDefined();
    expect(heat?.kind).toBe("caution");
    expect(heat?.range).toMatch(/Jun|Jul|Aug/);
  });
  it("emits a deep-cold caution for places with -10°C+ winters", () => {
    const p = makePlace({
      climate: makeClimate({
        tempLowC: [-15, -12, -5, 2, 8, 12, 14, 13, 8, 1, -6, -14] as Monthly12,
      }),
    });
    const cold = computeBestMonths(p).find(w => w.id === "cold");
    expect(cold).toBeDefined();
    expect(cold?.kind).toBe("caution");
  });
  it("orders positive (good) windows before cautions", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [10, 12, 16, 22, 28, 33, 35, 34, 30, 24, 16, 10] as Monthly12,
      }),
    });
    const windows = computeBestMonths(p);
    const firstCaution = windows.findIndex(w => w.kind === "caution");
    const lastGood = windows.map(w => w.kind).lastIndexOf("good");
    if (firstCaution >= 0 && lastGood >= 0) expect(lastGood).toBeLessThan(firstCaution);
  });
  it("uses unit-aware caution copy", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [10, 12, 16, 22, 28, 33, 35, 34, 30, 24, 16, 10] as Monthly12,
      }),
    });
    const heatF = computeBestMonths(p, "F").find(w => w.id === "heat");
    const heatC = computeBestMonths(p, "C").find(w => w.id === "heat");
    expect(heatF?.note).toContain("90°F");
    expect(heatC?.note).toContain("32°C");
  });
  it("cached best-month reads match the pure builder by unit", () => {
    const p = makePlace({
      climate: makeClimate({
        tempHighC: [10, 12, 16, 22, 28, 33, 35, 34, 30, 24, 16, 10] as Monthly12,
      }),
    });
    const cachedF = getBestMonths(p, "F");
    expect(cachedF).toEqual(computeBestMonths(p, "F"));
    expect(getBestMonths(p, "F")).toBe(cachedF);

    const cachedC = getBestMonths(p, "C");
    expect(cachedC).toEqual(computeBestMonths(p, "C"));
    expect(cachedC).not.toBe(cachedF);
    expect(getBestMonths(p, "C")).toBe(cachedC);
  });
});

describe("resonantWindowFor", () => {
  it("returns 'garden' for best-growability ranking", () => {
    expect(resonantWindowFor("best-growability")).toBe("garden");
  });
  it("returns null for rankings without a single resonant window", () => {
    expect(resonantWindowFor("hidden-gems")).toBeNull();
  });
});
