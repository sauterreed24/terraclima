import { describe, expect, it } from "vitest";
import { buildAtAGlanceTiles } from "../place-at-a-glance";
import { makeClimate, makePlace } from "./test-fixtures";

const agro = () => makeClimate({ frostFreeDays: 150, gdd10: 1500 });

const fmtPrecip = (mm: number) => `${Math.round(mm)} mm`;
const fmtDiurnal = (dC: number) => `${Math.round(dC)} °C`;

describe("buildAtAGlanceTiles", () => {
  it("returns the depth + place-feel + climate-class tiles for every tier", () => {
    const a = buildAtAGlanceTiles(makePlace({ id: "tier-a", tier: "A", climate: agro() }), fmtPrecip, fmtDiurnal, "F");
    const b = buildAtAGlanceTiles(makePlace({ id: "tier-b", tier: "B", climate: agro() }), fmtPrecip, fmtDiurnal, "F");
    const c = buildAtAGlanceTiles(makePlace({ id: "tier-c", tier: "C", climate: agro() }), fmtPrecip, fmtDiurnal, "F");
    expect(a[0].value).toBe("Flagship write-up");
    expect(b[0].value).toBe("Spotlight card");
    expect(c[0].value).toBe("Index entry");

    for (const tiles of [a, b, c]) {
      const labels = tiles.map(t => t.label);
      expect(labels).toContain("Place feel");
      expect(labels).toContain("Climate class");
      expect(labels).toContain("Climate drivers");
      expect(labels).toContain("Data confidence");
      // Reader-facing tiles outrank the screening ones: these two used to be
      // cut off by the eight-tile cap on every place.
      expect(labels).toContain("Water year (mean)");
      expect(labels).toContain("Growing season (est.)");
      expect(labels).toContain("High-season diurnal");
    }
  });

  it("fills spare room with the screening tiles", () => {
    const sparse = makePlace({ id: "sparse", climate: makeClimate({ frostFreeDays: undefined, gdd10: undefined }) });
    const labels = buildAtAGlanceTiles(sparse, fmtPrecip, fmtDiurnal, "F").map(t => t.label);
    expect(labels).not.toContain("Growing season (est.)");
    expect(labels).toContain("Remote sensing");
  });

  it("returns at most 8 tiles (avoids overrunning the grid)", () => {
    const place = makePlace({ id: "rich", tier: "A" });
    const tiles = buildAtAGlanceTiles(place, fmtPrecip, fmtDiurnal, "C");
    expect(tiles.length).toBeLessThanOrEqual(8);
  });

  it("uses GDD base 10C label in metric mode and GDD base 50F in imperial mode", () => {
    const metric = buildAtAGlanceTiles(makePlace({ id: "agro-c", climate: agro() }), fmtPrecip, fmtDiurnal, "C");
    const imperial = buildAtAGlanceTiles(makePlace({ id: "agro-f", climate: agro() }), fmtPrecip, fmtDiurnal, "F");
    const metricSeason = metric.find(t => t.label === "Growing season (est.)")?.value ?? "";
    const imperialSeason = imperial.find(t => t.label === "Growing season (est.)")?.value ?? "";
    // Both modes surface the growing-season tile with mode-appropriate labels.
    expect(metricSeason).toContain("GDD base 10C");
    expect(imperialSeason).toContain("GDD base 50F");
    // The same heat sum counted in °F-days is 1.8 times the °C-days figure.
    const num = (v: string) => Number(v.match(/~([\d,]+)$/)![1]!.replace(/,/g, ""));
    expect(num(imperialSeason)).toBe(Math.round(num(metricSeason) * 1.8));
  });
});
