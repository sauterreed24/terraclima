import { describe, expect, it } from "vitest";
import { CLIMATE_TRIP_THEMES } from "../../data/climate-trip-themes";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { buildClimateTourismProfile, getClimateTourismProfile } from "../climate-tourism";
import { makePlace } from "./test-fixtures";

describe("climate tourism profiles", () => {
  it("builds a complete profile for every place without throwing", () => {
    for (const place of PLACES) {
      const profile = buildClimateTourismProfile(place);
      expect(profile.placeId).toBe(place.id);
      expect(profile.climateStory.trim().length).toBeGreaterThan(20);
      expect(profile.bestVisitWindow.label.trim()).not.toBe("");
    }
  });

  it("clamps scores to 0..100", () => {
    for (const place of PLACES) {
      const profile = buildClimateTourismProfile(place);
      for (const value of Object.values(profile.scores)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("is deterministic for the same place", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(buildClimateTourismProfile(place)).toEqual(buildClimateTourismProfile(place));
  });

  it("reuses cached profiles without changing derived output", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    const cached = getClimateTourismProfile(place);
    expect(getClimateTourismProfile(place)).toBe(cached);
    expect(cached).toEqual(buildClimateTourismProfile(place));
  });

  it("always emits exactly days 1, 2, and 3 with complete itinerary text", () => {
    for (const place of PLACES) {
      const days = buildClimateTourismProfile(place).itinerary.days;
      expect(days.map(day => day.day)).toEqual([1, 2, 3]);
      for (const day of days) {
        expect(day.title.trim()).not.toBe("");
        expect(day.morning.trim()).not.toBe("");
        expect(day.afternoon.trim()).not.toBe("");
        expect(day.evening.trim()).not.toBe("");
        expect(day.climateLens.trim()).not.toBe("");
      }
    }
  });

  it("keeps lodging copy static and free of inventory, price, paid-placement, and fake-brand claims", () => {
    const prohibited = /\b(Hilton|Marriott|Hyatt|Four Seasons|book now|available tonight|availability|per night|USD|\$|affiliate|sponsored)\b/i;
    for (const place of PLACES) {
      const lodging = buildClimateTourismProfile(place).lodgingRead;
      const text = [lodging.base, ...lodging.searchCues, lodging.caveat].join(" ");
      expect(text).not.toMatch(prohibited);
    }
  });

  it("keeps the climate-land score note caveated as non-financial advice", () => {
    const note = buildClimateTourismProfile(PLACES_BY_ID["sequim-wa"]).scoreNotes.climateLandOptionality;
    expect(note.toLowerCase()).toContain("not financial advice");
    expect(note.toLowerCase()).toContain("not a real estate valuation");
    expect(note.toLowerCase()).toContain("not a recommendation to buy");
  });

  it("frames wildlife as habitat cues when no explicit wildlife data exists", () => {
    const profile = buildClimateTourismProfile(makePlace({
      travelFit: ["quiet roads"],
      thingsToDo: [],
    }));
    const text = [
      profile.wildlifeAndHabitat.headline,
      ...profile.wildlifeAndHabitat.cues,
      profile.wildlifeAndHabitat.caveat,
    ].join(" ").toLowerCase();
    expect(text).toContain("habitat");
    expect(text).toContain("cue");
  });
});

describe("climate trip themes", () => {
  it("uses unique theme ids", () => {
    const ids = CLIMATE_TRIP_THEMES.map(theme => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only valid place ids", () => {
    for (const theme of CLIMATE_TRIP_THEMES) {
      expect(theme.placeIds.length).toBeGreaterThanOrEqual(3);
      for (const id of theme.placeIds) {
        expect(PLACES_BY_ID[id], `${theme.id} references ${id}`).toBeTruthy();
      }
    }
  });
});
