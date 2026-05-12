import { describe, expect, it } from "vitest";
import { dominantPlaceFeelDrag, dominantPlaceFeelStrength, scorePlaceFeel } from "../place-feel";
import { makePlace } from "./test-fixtures";

describe("place-feel scoring", () => {
  it("returns a bounded, inspectable feel read", () => {
    const feel = scorePlaceFeel(makePlace());

    expect(feel.score).toBeGreaterThanOrEqual(0);
    expect(feel.score).toBeLessThanOrEqual(100);
    expect(feel.components.map(component => component.key)).toEqual([
      "sensoryComfort",
      "dailyEase",
      "placeIdentity",
      "scoutingClarity",
    ]);
    expect(feel.strengths.length).toBeGreaterThanOrEqual(1);
    expect(feel.frictions.length).toBeGreaterThanOrEqual(1);
    expect(dominantPlaceFeelStrength(feel.place).value).toBeGreaterThanOrEqual(dominantPlaceFeelDrag(feel.place).value);
  });

  it("rewards authored texture and real-world scouting anchors", () => {
    const sparse = makePlace({
      id: "sparse",
      citations: [],
      summaryImmersive: "A mild place.",
      whyDistinct: "Elevation helps.",
      whoWouldLove: "Comfort seekers.",
      whoMightNot: "Heat seekers.",
    });
    const textured = makePlace({
      id: "textured",
      citations: [
        { label: "NOAA normals", kind: "noaa", url: "https://www.ncei.noaa.gov/access/us-climate-normals/" },
        { label: "USGS terrain", kind: "usgs", url: "https://www.usgs.gov/" },
      ],
      settlementsWithinZone: [
        { name: "Anchor City", role: "hub", population: "~80,000", note: "Hospital, university, and daily-service anchor." },
        { name: "Foothill Town", role: "town", note: "Cooler slope pocket for contrast scouting." },
      ],
      thingsToDo: [
        { label: "Morning ridge walk", kind: "trail", season: "spring", note: "Tests wind, sun, and slope exposure." },
        { label: "Service loop", kind: "urban", season: "year-round", note: "Checks groceries, clinics, and daily errands." },
      ],
      deepSections: [
        {
          id: "texture",
          title: "Readable daily texture",
          paragraphs: [
            "The place has enough authored local context to connect the climate signal to daily life.",
            "Scouting anchors make the profile more actionable than a bare station normal.",
          ],
        },
      ],
      liveSignals: {
        costPressure: 24,
        socialStress: 18,
        accessFriction: 20,
        note: "Service access is strong and daily friction is low.",
        sources: [{ label: "County services", url: "https://example.com/" }],
      },
    });

    const sparseFeel = scorePlaceFeel(sparse);
    const texturedFeel = scorePlaceFeel(textured);

    expect(texturedFeel.score).toBeGreaterThan(sparseFeel.score);
    expect(texturedFeel.components.find(component => component.key === "placeIdentity")!.value).toBeGreaterThan(
      sparseFeel.components.find(component => component.key === "placeIdentity")!.value,
    );
    expect(texturedFeel.components.find(component => component.key === "scoutingClarity")!.value).toBeGreaterThan(
      sparseFeel.components.find(component => component.key === "scoutingClarity")!.value,
    );
  });

  it("penalizes access, cost, and risk friction even when the climate is pleasant", () => {
    const easy = makePlace({
      id: "easy",
      liveSignals: { costPressure: 18, socialStress: 18, accessFriction: 18 },
      settlementsWithinZone: [{ name: "Easy City", role: "hub", note: "Daily services are close." }],
    });
    const difficult = makePlace({
      id: "difficult",
      liveSignals: { costPressure: 88, socialStress: 76, accessFriction: 92 },
      risks: {
        ...makePlace().risks,
        wildfire: { level: "high" },
        flood: { level: "elevated" },
        storm: { level: "high" },
        smoke: { level: "elevated" },
      },
    });

    const easyFeel = scorePlaceFeel(easy);
    const difficultFeel = scorePlaceFeel(difficult);

    expect(easyFeel.score).toBeGreaterThan(difficultFeel.score);
    expect(easyFeel.components.find(component => component.key === "dailyEase")!.value).toBeGreaterThan(
      difficultFeel.components.find(component => component.key === "dailyEase")!.value,
    );
  });
});
