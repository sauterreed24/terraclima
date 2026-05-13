import { describe, expect, it } from "vitest";
import { getPlaceVisualSignature } from "../place-visual-signature";
import { makePlace } from "./test-fixtures";

describe("place visual signatures", () => {
  it("builds a bounded shared signature for map pins and result cards", () => {
    const signature = getPlaceVisualSignature(makePlace());

    expect(signature.primaryLabel).toBe("Mediterranean Pocket");
    expect(signature.primaryTone).toBe("ochre");
    expect(signature.feelScore).toBeGreaterThanOrEqual(0);
    expect(signature.feelScore).toBeLessThanOrEqual(100);
    expect(signature.strength.value).toBeGreaterThanOrEqual(signature.verify.value);
    expect(signature.mapLabel).toContain(signature.feelBand);
    expect(signature.mapLabel).toContain(signature.strength.shortLabel);
    expect(signature.mapAccentRgb).toMatch(/^\d+, \d+, \d+$/);
  });

  it("uses the strongest feel axis as the map aura and card accent", () => {
    const place = makePlace({
      id: "identity-rich",
      summaryImmersive: "A deeply described place with distinctive terrain, farms, neighborhoods, seasonal routines, and scouting clues.",
      whyDistinct: "The local climate identity is unusually clear because slope, water, settlement, and daily texture reinforce one another.",
      deepSections: [
        {
          id: "identity",
          title: "Identity-rich field notes",
          paragraphs: [
            "The place carries enough authored texture for the atlas to separate it from otherwise similar mild climates.",
          ],
        },
      ],
      thingsToDo: [
        { label: "Ridge loop", kind: "trail", season: "spring", note: "Checks wind, sun, and slope exposure." },
        { label: "Market day", kind: "urban", season: "year-round", note: "Checks daily anchors." },
      ],
    });

    const signature = getPlaceVisualSignature(place);

    expect(signature.mapAccentColor).toBe(signature.strength.color);
    expect(signature.mapAccentRgb).toBe(signature.strength.rgb);
    expect(signature.primaryBlurb.length).toBeGreaterThan(20);
  });
});
