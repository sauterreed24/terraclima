import { describe, expect, it } from "vitest";
import { placeMapSecondaryLine, truncateMapTitle } from "../atlas-map-label";
import { makePlace } from "./test-fixtures";

describe("placeMapSecondaryLine", () => {
  it("maps country to a two-letter code (USA->US, Canada->CA, Mexico->MX)", () => {
    expect(placeMapSecondaryLine(makePlace({ country: "USA", region: "", municipality: undefined }))).toBe("US");
    expect(placeMapSecondaryLine(makePlace({ country: "Canada", region: "", municipality: undefined }))).toBe("CA");
    expect(placeMapSecondaryLine(makePlace({ country: "Mexico", region: "", municipality: undefined }))).toBe("MX");
  });

  it("joins municipality, region, and country code with a middle dot", () => {
    const p = makePlace({ country: "Canada", municipality: "Banff", region: "Alberta" });
    expect(placeMapSecondaryLine(p)).toBe("Banff · Alberta · CA");
  });

  it("drops the municipality when it equals the place name", () => {
    const p = makePlace({ name: "Patzcuaro", municipality: "Patzcuaro", region: "Michoacan", country: "Mexico" });
    expect(placeMapSecondaryLine(p)).toBe("Michoacan · MX");
  });

  it("drops a blank or whitespace-only municipality and trims the region", () => {
    const p = makePlace({ country: "USA", municipality: "   ", region: "  Oregon  " });
    expect(placeMapSecondaryLine(p)).toBe("Oregon · US");
  });

  it("returns just the country code when region is empty", () => {
    const p = makePlace({ country: "USA", region: "", municipality: undefined });
    expect(placeMapSecondaryLine(p)).toBe("US");
  });
});

describe("truncateMapTitle", () => {
  it("leaves titles at or under the limit unchanged", () => {
    expect(truncateMapTitle("Bend", 8)).toBe("Bend");
    expect(truncateMapTitle("Mountain", 8)).toBe("Mountain");
  });

  it("truncates over-limit titles to (maxChars-1) chars plus an ellipsis", () => {
    expect(truncateMapTitle("Mountain View", 8)).toBe("Mountai…");
    expect(truncateMapTitle("Mountain View", 8)).toHaveLength(8);
  });

  it("keeps at least one character before the ellipsis at tiny limits", () => {
    expect(truncateMapTitle("ABC", 1)).toBe("A…");
    expect(truncateMapTitle("ABC", 0)).toBe("A…");
  });
});
