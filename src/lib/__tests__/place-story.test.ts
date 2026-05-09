import { describe, expect, it } from "vitest";
import { makePlace } from "./test-fixtures";
import { composeFieldStory } from "../place-story";

describe("composeFieldStory", () => {
  it("builds a unit-aware, field-guide story from structured data", () => {
    const place = makePlace({
      name: "Test Mesa",
      elevationM: 1500,
      reliefContext: "A mesa edge catches wind while lower draws pool cold air.",
      biome: "pine-oak woodland",
      koppen: "Csb",
      drivers: ["orographic-lift", "cold-air-drainage"],
      settlementsWithinZone: [{ name: "Mesa Town", role: "town", population: "1,200" }],
      thingsToDo: [{ label: "Mesa overlook", kind: "vista", season: "spring", note: "Clear views." }],
      whoWouldLove: "gardeners who want cool nights",
      whoMightNot: "people who need frost-free winters",
    });

    const story = composeFieldStory(place, "F", "imperial");

    expect(story.title).toBe("Field story: Test Mesa");
    expect(story.paragraphs).toHaveLength(6);
    expect(story.paragraphs[0]).toContain("Test Mesa sits near 4,921 ft");
    expect(story.paragraphs[1]).toContain("high-summer afternoons around 81°F");
    expect(story.paragraphs[1]).toContain("Köppen Csb");
    expect(story.paragraphs[2]).toContain("Orographic lift and Cold-air drainage");
    expect(story.paragraphs[3]).toContain("The lived map is anchored by Mesa Town (1,200).");
    expect(story.paragraphs[4]).toContain("Mesa overlook (spring)");
    expect(story.paragraphs[5]).toContain("strongest for gardeners who want cool nights");
  });

  it("falls back to travel fit when no activities are authored", () => {
    const story = composeFieldStory(
      makePlace({
        thingsToDo: [],
        settlementsWithinZone: [],
        travelFit: ["quiet roads", "spring flowers"],
      }),
      "C",
      "metric",
    );

    expect(story.paragraphs.some(p => p.includes("quiet roads and spring flowers"))).toBe(true);
    expect(story.paragraphs.join(" ")).not.toContain("undefined");
  });
});
