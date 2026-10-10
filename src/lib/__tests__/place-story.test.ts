import { describe, expect, it } from "vitest";
import { makePlace } from "./test-fixtures";
import { composeFieldStory } from "../place-story";

describe("composeFieldStory", () => {
  it("builds a short, unit-aware practical note from structured data", () => {
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
    const text = story.paragraphs.join(" ");

    expect(story.title).toBe("On the ground: Test Mesa");
    expect(story.paragraphs[0]).toMatch(/^In round numbers: summer afternoons around 81°F/);
    expect(story.paragraphs).toContain("The same air wraps around Mesa Town (1,200).");
    expect(text).toContain("Mesa overlook (spring)");
    // The overview already carries the why, drivers, contrasts and fit reads.
    expect(text).not.toMatch(/Köppen|Terrain engines|test distinct|Strongest for/);
  });

  it("does not repeat the authored feel or texture shown in the overview", () => {
    const story = composeFieldStory(
      makePlace({
        whyDistinct: "Cold air drains off the mesa into the orchard benches.",
        experience: { feel: "Dry light and a sharp evening cool-down.", texture: "Wind on the rim; frost in the draws." },
      }),
      "C",
      "metric",
    );
    const text = story.paragraphs.join(" ");
    expect(text).not.toContain("Dry light and a sharp evening cool-down.");
    expect(text).not.toContain("Wind on the rim");
    expect(text).not.toContain("Cold air drains off the mesa");
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
