import { describe, it, expect } from "vitest";
import { classifyKoppen, computeKoppen, koppenAudit, parseAuthoredKoppen } from "../koppen";
import { makePlace, makeClimate } from "./test-fixtures";
import type { Monthly12 } from "../../types";

const M = (v: number[]): Monthly12 => v as unknown as Monthly12;
const code = (high: number[], low: number[], precip: number[]) =>
  classifyKoppen(high, low, precip)?.code ?? null;

describe("classifyKoppen — textbook exemplars", () => {
  it("Singapore → Af (tropical rainforest, no dry month)", () => {
    expect(code(
      [30, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 30],
      [23, 23, 24, 24, 25, 25, 25, 25, 24, 24, 23, 23],
      [240, 160, 170, 150, 170, 130, 150, 170, 160, 160, 250, 290],
    )).toBe("Af");
  });

  it("Cairo → BWh (hot desert)", () => {
    expect(code(
      [19, 21, 24, 29, 33, 35, 35, 35, 33, 30, 25, 20],
      [9, 9, 11, 14, 18, 20, 22, 22, 20, 18, 14, 10],
      [5, 4, 4, 1, 0, 0, 0, 0, 0, 0, 3, 6],
    )).toBe("BWh");
  });

  it("Phoenix → BWh (hot desert, summer monsoon bump)", () => {
    expect(code(
      [20, 22, 25, 30, 35, 40, 41, 40, 38, 32, 24, 19],
      [7, 9, 12, 16, 21, 26, 29, 28, 25, 18, 11, 7],
      [20, 20, 25, 8, 3, 1, 25, 28, 18, 17, 18, 22],
    )).toBe("BWh");
  });

  it("cold semi-arid steppe → BSk", () => {
    expect(code(
      [7, 8, 12, 17, 22, 28, 32, 31, 26, 19, 11, 7],
      [-8, -7, -3, 1, 7, 12, 15, 14, 9, 2, -4, -8],
      [18, 16, 20, 22, 28, 26, 24, 24, 22, 20, 18, 16],
    )).toBe("BSk");
  });

  it("Athens → Csa (hot-summer Mediterranean)", () => {
    expect(code(
      [13, 14, 16, 20, 25, 30, 33, 33, 29, 23, 18, 14],
      [6, 6, 8, 11, 15, 20, 23, 23, 19, 15, 11, 8],
      [56, 47, 41, 30, 23, 11, 6, 7, 16, 52, 68, 73],
    )).toBe("Csa");
  });

  it("London → Cfb (temperate oceanic)", () => {
    expect(code(
      [8, 9, 12, 15, 18, 21, 23, 23, 20, 15, 11, 8],
      [3, 3, 4, 6, 9, 12, 14, 14, 11, 8, 5, 3],
      [55, 40, 42, 44, 49, 45, 45, 50, 49, 69, 59, 55],
    )).toBe("Cfb");
  });

  it("Reykjavík → Cfc (subpolar oceanic)", () => {
    expect(code(
      [3, 3, 4, 6, 9, 12, 13, 13, 11, 7, 4, 3],
      [-2, -2, -1, 1, 4, 7, 9, 8, 6, 3, 0, -2],
      [76, 72, 82, 58, 44, 50, 52, 62, 67, 86, 73, 79],
    )).toBe("Cfc");
  });

  it("New Orleans → Cfa (humid subtropical)", () => {
    expect(code(
      [17, 19, 23, 27, 31, 33, 33, 33, 31, 27, 22, 18],
      [7, 9, 12, 16, 20, 23, 24, 24, 22, 16, 11, 8],
      [120, 100, 120, 110, 110, 150, 170, 150, 130, 90, 100, 120],
    )).toBe("Cfa");
  });

  it("Moscow → Dfb (humid continental, warm summer)", () => {
    expect(code(
      [-4, -4, 2, 11, 19, 22, 24, 21, 15, 8, 0, -3],
      [-10, -10, -5, 3, 8, 12, 14, 12, 7, 2, -3, -8],
      [52, 41, 39, 37, 51, 75, 94, 77, 65, 59, 58, 56],
    )).toBe("Dfb");
  });

  it("Yakutsk → Dfd (extreme continental, coldest month ≤ −38)", () => {
    expect(code(
      [-39, -30, -13, 2, 12, 21, 25, 21, 11, -5, -25, -37],
      [-45, -43, -32, -15, -2, 7, 12, 8, 0, -15, -35, -43],
      [8, 7, 10, 18, 33, 44, 57, 46, 34, 24, 16, 11],
    )).toBe("Dfd");
  });

  it("Utqiagvik → ET (tundra)", () => {
    expect(code(
      [-19, -21, -19, -11, -2, 4, 7, 6, 2, -5, -12, -17],
      [-27, -28, -26, -18, -7, 0, 3, 2, -1, -9, -18, -24],
      [5, 5, 5, 5, 4, 9, 22, 26, 17, 13, 7, 5],
    )).toBe("ET");
  });

  it("Eismitte → EF (ice cap, warmest month < 0)", () => {
    expect(code(
      [-30, -42, -40, -32, -21, -17, -12, -18, -22, -30, -32, -27],
      [-41, -53, -51, -43, -32, -28, -23, -29, -33, -41, -43, -38],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    )).toBe("EF");
  });
});

describe("classifyKoppen — corpus regression traces", () => {
  it("Sequim WA → Csb (warm-summer Mediterranean rain shadow)", () => {
    expect(code(
      [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
      [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
      [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
    )).toBe("Csb");
  });

  it("Osoyoos BC → BSk (cold-steppe basin; sensitive to the Apr–Sep season convention)", () => {
    expect(code(
      [-0.2, 3.1, 10.9, 17.2, 22.6, 26.9, 31.1, 30.6, 24.4, 15.3, 5.9, 0.3],
      [-6.4, -4.6, -0.3, 3.6, 7.9, 11.6, 14.2, 13.8, 9.4, 3.6, -1.6, -5.7],
      [24, 14, 14, 18, 32, 40, 28, 26, 20, 18, 28, 28],
    )).toBe("BSk");
  });

  it("Oaxaca City MX → Cwa under strict KG (authored Cwb is the a/b knife-edge)", () => {
    expect(code(
      [25.1, 27.3, 29.6, 30.4, 30.2, 27.4, 25.6, 25.9, 25.6, 25.5, 25.2, 24.7],
      [7.8, 8.9, 11.3, 13.4, 14.7, 14.9, 14.4, 14.3, 14.3, 12.4, 9.8, 8.1],
      [6, 5, 6, 19, 64, 156, 111, 118, 126, 48, 10, 4],
    )).toBe("Cwa");
  });
});

describe("classifyKoppen — boundaries & precedence", () => {
  it("C/D split is at the 0 °C coldest-month isotherm", () => {
    // Coldest-month mean exactly 0 → C; just below → D. Hold everything else fixed.
    const high = [4, 5, 9, 14, 19, 23, 25, 24, 20, 14, 8, 5];
    const lowC = [-4, -3, 0, 4, 8, 12, 14, 13, 9, 4, -1, -4]; // Jan mean = (4-4)/2 = 0
    const lowD = [-5, -4, 0, 4, 8, 12, 14, 13, 9, 4, -1, -5]; // Jan mean = (4-5)/2 = -0.5
    const precip = [60, 50, 55, 60, 70, 65, 60, 60, 60, 65, 60, 60];
    expect(classifyKoppen(high, lowC, precip)?.family).toBe("C");
    expect(classifyKoppen(high, lowD, precip)?.family).toBe("D");
  });

  it("aridity (B) takes priority even when the thermal regime would be C/D", () => {
    // Same temps as the steppe case but drier → BWk; wetter → leaves B.
    const high = [7, 8, 12, 17, 22, 28, 32, 31, 26, 19, 11, 7];
    const low = [-8, -7, -3, 1, 7, 12, 15, 14, 9, 2, -4, -8];
    expect(classifyKoppen(high, low, [4, 4, 5, 5, 6, 6, 5, 5, 5, 5, 4, 4])?.family).toBe("B");
    expect(classifyKoppen(high, low, [60, 55, 60, 65, 70, 65, 60, 60, 60, 65, 60, 55])?.family).not.toBe("B");
  });

  it("returns null for degenerate input (never throws)", () => {
    expect(classifyKoppen([1, 2, 3], [1, 2, 3], [1, 2, 3])).toBeNull();
    const withNaN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, NaN];
    expect(classifyKoppen(withNaN, withNaN, withNaN)).toBeNull();
  });

  it("exposes an inspectable breakdown", () => {
    const r = classifyKoppen(
      [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
      [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
      [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
    )!;
    expect(r.family).toBe("C");
    expect(r.breakdown.dryThresholdK).toBe(0); // winter-wet rain shadow
    expect(r.breakdown.thotC).toBeCloseTo(16.6, 5);
  });
});

describe("parseAuthoredKoppen", () => {
  it("extracts a simple code", () => {
    expect(parseAuthoredKoppen("Csb")).toEqual(["Csb"]);
  });
  it("splits multi-zone labels and strips prose + parentheticals", () => {
    expect(parseAuthoredKoppen("BSk (valley) / Csb analog (summit)")).toEqual(["BSk", "Csb"]);
    expect(parseAuthoredKoppen("Dfb / BSk")).toEqual(["Dfb", "BSk"]);
    expect(parseAuthoredKoppen("Cwb / Cfb")).toEqual(["Cwb", "Cfb"]);
  });
  it("splits hyphen-joined sibling codes (e.g. \"Csb-Cfb\" → [Csb, Cfb])", () => {
    expect(parseAuthoredKoppen("BSk (valley) / Csb-Cfb analog (summit)")).toEqual(["BSk", "Csb", "Cfb"]);
    expect(parseAuthoredKoppen("Csb-Cfb")).toEqual(["Csb", "Cfb"]);
  });
  it("keeps E codes and dedupes", () => {
    expect(parseAuthoredKoppen("ET (alpine) / ET")).toEqual(["ET"]);
  });
  it("returns nothing for prose with no valid code", () => {
    expect(parseAuthoredKoppen("temperate highland")).toEqual([]);
  });
  it("rejects bare family letters (\"A\", \"E\") as not a full Köppen code", () => {
    expect(parseAuthoredKoppen("A")).toEqual([]);
    expect(parseAuthoredKoppen("E")).toEqual([]);
  });
  it("rejects impossible C/D sub-letter combinations (`d` is D-only)", () => {
    expect(parseAuthoredKoppen("Csd")).toEqual([]);
    expect(parseAuthoredKoppen("Cwd")).toEqual([]);
    expect(parseAuthoredKoppen("Cfd")).toEqual([]);
    // Sanity: the same shape is valid on D.
    expect(parseAuthoredKoppen("Dfd")).toEqual(["Dfd"]);
  });
});

describe("koppenAudit", () => {
  const climate = (high: number[], low: number[], precip: number[]) =>
    makeClimate({ tempHighC: M(high), tempLowC: M(low), precipMm: M(precip), snowCm: undefined, humidity: undefined });

  it("reports a clean full-class match", () => {
    const place = makePlace({
      koppen: "Csb",
      climate: climate(
        [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
        [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
        [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.code).toBe("Csb");
    expect(r.level).toBe("match");
    expect(r.classMatch).toBe(true);
  });

  it("flags a sub-class divergence when the family still matches (Oaxaca Cwa vs Cwb)", () => {
    const place = makePlace({
      koppen: "Cwb",
      climate: climate(
        [25.1, 27.3, 29.6, 30.4, 30.2, 27.4, 25.6, 25.9, 25.6, 25.5, 25.2, 24.7],
        [7.8, 8.9, 11.3, 13.4, 14.7, 14.9, 14.4, 14.3, 14.3, 12.4, 9.8, 8.1],
        [6, 5, 6, 19, 64, 156, 111, 118, 126, 48, 10, 4],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.code).toBe("Cwa");
    expect(r.familyMatch).toBe(true);
    expect(r.classMatch).toBe(false);
    expect(r.level).toBe("subclass");
  });

  it("treats a family disagreement on the aridity knife-edge as boundary, not divergent", () => {
    // Steppe label whose normals tip a few mm over the aridity line → Dfa.
    const place = makePlace({
      koppen: "BSk",
      climate: climate(
        [7, 8, 12, 17, 22, 28, 32, 31, 26, 19, 11, 7],
        [-8, -7, -3, 1, 7, 12, 15, 14, 9, 2, -4, -8],
        [24, 22, 28, 32, 40, 36, 32, 32, 30, 28, 26, 24],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.family).toBe("D");
    expect(r.familyMatch).toBe(false);
    expect(r.level).toBe("boundary");
  });

  it("flags a true family mismatch with no nearby threshold as divergent", () => {
    const place = makePlace({
      koppen: "Af", // tropical label on a temperate-oceanic climate
      climate: climate(
        [8, 9, 12, 15, 18, 21, 23, 23, 20, 15, 11, 8],
        [3, 3, 4, 6, 9, 12, 14, 14, 11, 8, 5, 3],
        [55, 40, 42, 44, 49, 45, 45, 50, 49, 69, 59, 55],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.code).toBe("Cfb");
    expect(r.familyMatch).toBe(false);
    expect(r.level).toBe("divergent");
  });

  it("treats a multi-zone authored label as a match if the computed code is any zone", () => {
    const place = makePlace({
      koppen: "BSk (valley) / Csb analog (summit)",
      climate: climate(
        [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
        [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
        [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.code).toBe("Csb");
    expect(r.level).toBe("match");
  });

  it("flags an unparseable authored label as divergent — typos cannot silently slip past CI", () => {
    const place = makePlace({
      koppen: "Csab", // typo for Csa/Csb; the parser yields []
      climate: climate(
        [7.8, 9.2, 11.1, 13.4, 16.3, 18.8, 21.6, 21.8, 19.6, 14.8, 10.3, 7.9],
        [1.2, 1.6, 2.8, 4.6, 7.2, 9.8, 11.6, 11.4, 9.6, 6.7, 3.6, 1.6],
        [65, 48, 42, 28, 22, 18, 14, 18, 28, 48, 72, 72],
      ),
    });
    const r = koppenAudit(place);
    expect(r.computed?.code).toBe("Csb");
    expect(r.authoredZones).toEqual([]);
    expect(r.level).toBe("divergent");
  });
});

describe("computeKoppen", () => {
  it("classifies a Place from its climate normals and caches by identity", () => {
    const place = makePlace();
    const first = computeKoppen(place);
    const second = computeKoppen(place);
    expect(first).not.toBeNull();
    expect(second).toBe(first); // same cached object reference
  });
});
