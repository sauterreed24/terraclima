import { geoAlbers } from "d3-geo";
import { describe, expect, it } from "vitest";
import { PHYSICAL_LABELS, physicalLabelOpacity, projectPhysicalLabels } from "../atlas-map-physical-labels";

const projection = geoAlbers().rotate([100, 0]).center([0, 48]).parallels([29, 55]).scale(800).translate([420, 300]);

describe("atlas physical labels", () => {
  it("has unique ids and sane zoom bands", () => {
    const ids = new Set(PHYSICAL_LABELS.map(l => l.id));
    expect(ids.size).toBe(PHYSICAL_LABELS.length);
    for (const label of PHYSICAL_LABELS) {
      expect(label.maxK, label.id).toBeGreaterThan(label.minK);
      expect(label.text.trim().length, label.id).toBeGreaterThan(3);
    }
  });

  it("orients range labels along the range and keeps every label readable left-to-right", () => {
    const projected = projectPhysicalLabels(projection);
    expect(projected).toHaveLength(PHYSICAL_LABELS.length);
    for (const label of projected) {
      expect(Number.isFinite(label.x)).toBe(true);
      expect(Number.isFinite(label.y)).toBe(true);
      expect(Math.abs(label.angle)).toBeLessThanOrEqual(90);
    }
    const sierra = projected.find(l => l.id === "sierra-nevada")!;
    // The Sierra Nevada runs NW→SE, so it should be steeply tilted, not flat.
    expect(Math.abs(sierra.angle)).toBeGreaterThan(30);
    const gulf = projected.find(l => l.id === "gulf-mexico")!;
    expect(gulf.angle).toBe(0);
  });

  it("fades labels at the edges of their zoom band", () => {
    const band = { minK: 1, maxK: 4 };
    expect(physicalLabelOpacity(band, 0.9)).toBe(0);
    expect(physicalLabelOpacity(band, 2)).toBe(1);
    expect(physicalLabelOpacity(band, 3.8)).toBeGreaterThan(0);
    expect(physicalLabelOpacity(band, 3.8)).toBeLessThan(1);
    expect(physicalLabelOpacity(band, 4.2)).toBe(0);
    expect(physicalLabelOpacity({ minK: 0, maxK: 2 }, 0.3)).toBe(1);
  });
});
