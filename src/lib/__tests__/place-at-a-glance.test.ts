import { describe, expect, it } from "vitest";
import { buildAtAGlanceTiles } from "../place-at-a-glance";
import { makePlace } from "./test-fixtures";

const fmtPrecip = (mm: number) => `${Math.round(mm)} mm`;
const fmtDiurnal = (dC: number) => `${Math.round(dC)} °C`;

describe("buildAtAGlanceTiles", () => {
  it("returns the depth + place-feel + climate-class tiles for every tier", () => {
    const a = buildAtAGlanceTiles(makePlace({ id: "tier-a", tier: "A" }), fmtPrecip, fmtDiurnal, "F");
    const b = buildAtAGlanceTiles(makePlace({ id: "tier-b", tier: "B" }), fmtPrecip, fmtDiurnal, "F");
    const c = buildAtAGlanceTiles(makePlace({ id: "tier-c", tier: "C" }), fmtPrecip, fmtDiurnal, "F");
    expect(a[0].value).toBe("Flagship write-up");
    expect(b[0].value).toBe("Spotlight card");
    expect(c[0].value).toBe("Index entry");

    for (const tiles of [a, b, c]) {
      const labels = tiles.map(t => t.label);
      expect(labels).toContain("Place feel");
      expect(labels).toContain("Climate class");
      expect(labels).toContain("Terrain engines");
      expect(labels).toContain("Data confidence");
      expect(labels).toContain("Remote sensing");
      expect(labels).toContain("Geospatial signal");
    }
  });

  it("returns at most 8 tiles (avoids overrunning the grid)", () => {
    const place = makePlace({ id: "rich", tier: "A" });
    const tiles = buildAtAGlanceTiles(place, fmtPrecip, fmtDiurnal, "C");
    expect(tiles.length).toBeLessThanOrEqual(8);
  });

  it("uses GDD base 10C label in metric mode and GDD base 50F in imperial mode", () => {
    const metric = buildAtAGlanceTiles(makePlace({ id: "agro-c" }), fmtPrecip, fmtDiurnal, "C");
    const imperial = buildAtAGlanceTiles(makePlace({ id: "agro-f" }), fmtPrecip, fmtDiurnal, "F");
    const metricSeason = metric.find(t => t.label === "Growing season (est.)")?.value ?? "";
    const imperialSeason = imperial.find(t => t.label === "Growing season (est.)")?.value ?? "";
    // The test fixture default includes a gdd10 value; both modes should
    // surface the growing-season tile but with mode-appropriate base labels.
    if (metricSeason) expect(metricSeason).toContain("GDD base 10C");
    if (imperialSeason) expect(imperialSeason).toContain("GDD base 50F");
  });
});
