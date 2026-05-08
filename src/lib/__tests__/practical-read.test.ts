import { describe, expect, it } from "vitest";
import { makePlace } from "./test-fixtures";
import {
  buildNearbyContextRows,
  buildPracticalActivities,
  buildPracticalReadCards,
  buildSettlementAnchors,
} from "../practical-read";

describe("practical read helpers", () => {
  it("builds four complete practical cards from structured place data", () => {
    const place = makePlace({
      travelFit: ["trail walks", "spring flowers"],
      nearbyContrasts: [{ label: "Lower basin", note: "Hotter and drier in summer." }],
    });

    const cards = buildPracticalReadCards(place);

    expect(cards).toHaveLength(4);
    expect(cards.map(c => c.id)).toEqual(["agriculture", "spatial", "housing", "nearby"]);
    for (const card of cards) {
      expect(card.title.length).toBeGreaterThan(5);
      expect(card.body.length).toBeGreaterThan(40);
      expect(card.bullets).toHaveLength(3);
      expect(card.bullets.every(b => b.length > 10)).toBe(true);
    }
  });

  it("fills B-tier activity, settlement, and nearby context fallbacks without named fake attractions", () => {
    const place = makePlace({
      tier: "B",
      name: "Test Ridge",
      municipality: "Test Town",
      nearbyContrasts: [],
      thingsToDo: [],
      settlementsWithinZone: [],
    });

    expect(buildPracticalActivities(place).length).toBeGreaterThanOrEqual(3);
    expect(buildPracticalActivities(place).length).toBeLessThanOrEqual(5);
    expect(buildSettlementAnchors(place).map(a => a.name)).toContain("Test Town");
    expect(buildNearbyContextRows(place).map(r => r.source)).toContain("derived");
  });

  it("keeps C-tier entries lean unless activities are authored", () => {
    const place = makePlace({
      tier: "C",
      thingsToDo: [],
      settlementsWithinZone: [],
    });

    expect(buildPracticalActivities(place)).toEqual([]);
    expect(buildSettlementAnchors(place)).toEqual([]);
  });

  it("gives A-tier profiles the broader practical coverage expected by the corpus gate", () => {
    const place = makePlace({
      tier: "A",
      name: "Flagship Basin",
      municipality: "Flagship",
      nearbyContrasts: [{ label: "Windward slope", note: "Cooler and wetter." }],
      thingsToDo: [],
      settlementsWithinZone: [],
    });

    expect(buildPracticalActivities(place).length).toBeGreaterThanOrEqual(4);
    expect(buildSettlementAnchors(place).length).toBeGreaterThanOrEqual(2);
    expect(buildNearbyContextRows(place).length).toBeGreaterThanOrEqual(2);
  });
});
