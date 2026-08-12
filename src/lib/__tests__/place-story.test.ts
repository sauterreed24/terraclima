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
    expect(story.paragraphs[0]).toBe("test distinct");
    expect(story.paragraphs.some(p => p.includes("Test Mesa sits near 4,921 ft"))).toBe(true);
    expect(story.paragraphs.some(p => p.includes("High-summer afternoons run around 81°F"))).toBe(true);
    expect(story.paragraphs.some(p => p.includes("Köppen Csb"))).toBe(true);
    expect(story.paragraphs.some(p => p.includes("Orographic lift and Cold-air drainage"))).toBe(true);
    expect(story.paragraphs).toContain("The lived map is anchored by Mesa Town (1,200).");
    expect(story.paragraphs.some(p => p.includes("Mesa overlook (spring)"))).toBe(true);
    expect(story.paragraphs.some(p => /Strongest for gardeners who want cool nights/i.test(p))).toBe(true);
    expect(story.paragraphs.join(" ")).not.toMatch(/Start with the ground/i);
    expect(story.paragraphs.join(" ")).not.toMatch(/climate signature is measurable/i);
    expect(story.paragraphs.join(" ")).not.toMatch(/Fit check/i);
  });

  it("leads with authored feel when present, then why-distinct", () => {
    const story = composeFieldStory(
      makePlace({
        whyDistinct: "Cold air drains off the mesa into the orchard benches.",
        experience: {
          feel: "Dry light and a sharp evening cool-down.",
          texture: "Wind on the rim; frost in the draws.",
          seasons: {
            winter: "Cold.",
            spring: "Bright.",
            summer: "Warm days.",
            autumn: "Clear.",
          },
          travelerFit: "Day hikes.",
          residentFit: "Gardeners.",
        },
      }),
      "C",
      "metric",
    );

    expect(story.paragraphs[0]).toBe("Dry light and a sharp evening cool-down.");
    expect(story.paragraphs[1]).toContain("Cold air drains off the mesa");
    expect(story.paragraphs.at(-1)).toBe("Wind on the rim; frost in the draws.");
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
