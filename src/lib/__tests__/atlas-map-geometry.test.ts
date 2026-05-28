import { describe, expect, it } from "vitest";
import {
  firstTwoPointers,
  formatLatLon,
  haversineKm,
  pointerDistance,
  svgPointFromClient,
} from "../atlas-map-geometry";

describe("svgPointFromClient", () => {
  it("maps a client coordinate into SVG user units accounting for box scaling", () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(svgPointFromClient(100, 50, rect, 800, 400)).toEqual({ x: 0, y: 0 });
    expect(svgPointFromClient(500, 250, rect, 800, 400)).toEqual({ x: 800, y: 400 });
    expect(svgPointFromClient(300, 150, rect, 800, 400)).toEqual({ x: 400, y: 200 });
  });
});

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(-100, 40, -100, 40)).toBe(0);
  });

  it("matches a known great-circle: NYC to LA is ~3936 km", () => {
    const km = haversineKm(-74.006, 40.7128, -118.2437, 34.0522);
    expect(km).toBeGreaterThan(3800);
    expect(km).toBeLessThan(4100);
  });

  it("handles antipodal points without NaN (sqrt clamp)", () => {
    // 0° N 0° E to 0° N 180° E is ~half the earth's circumference.
    const km = haversineKm(0, 0, 180, 0);
    expect(km).toBeGreaterThan(20000);
    expect(km).toBeLessThan(20100);
    expect(Number.isFinite(km)).toBe(true);
  });
});

describe("formatLatLon", () => {
  it("formats northern + western coords with N / W hemisphere markers", () => {
    expect(formatLatLon(40.7128, -74.006)).toBe("40.71°N  74.01°W");
  });

  it("formats southern + eastern coords with S / E hemisphere markers", () => {
    expect(formatLatLon(-33.86, 151.21)).toBe("33.86°S  151.21°E");
  });

  it("rounds to two decimals", () => {
    expect(formatLatLon(0.123456, -0.987654)).toBe("0.12°N  0.99°W");
  });
});

describe("pointerDistance", () => {
  it("returns Euclidean distance between two pointers", () => {
    expect(pointerDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(5);
  });
});

describe("firstTwoPointers", () => {
  it("returns null when fewer than two pointers are present", () => {
    expect(firstTwoPointers(new Map())).toBeNull();
    expect(firstTwoPointers(new Map([[1, { clientX: 0, clientY: 0 }]]))).toBeNull();
  });

  it("returns the first two values when at least two pointers are present", () => {
    const m = new Map([
      [1, { clientX: 10, clientY: 10 }],
      [2, { clientX: 20, clientY: 20 }],
      [3, { clientX: 30, clientY: 30 }],
    ]);
    const pair = firstTwoPointers(m);
    expect(pair).not.toBeNull();
    expect(pair![0]).toEqual({ clientX: 10, clientY: 10 });
    expect(pair![1]).toEqual({ clientX: 20, clientY: 20 });
  });
});
