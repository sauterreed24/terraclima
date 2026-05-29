import { describe, expect, it } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { composePlaceExperience } from "../place-overview";

describe("composePlaceExperience", () => {
  it("returns four seasons in calendar order for every place", () => {
    const order = ["winter", "spring", "summer", "autumn"];
    for (const place of PLACES) {
      const exp = composePlaceExperience(place);
      expect(exp.seasons.map(s => s.key)).toEqual(order);
    }
  });

  it("produces a complete, non-empty humanistic read", () => {
    // Strip any authored override so this asserts the derived read specifically
    // (flagship places now carry hand-written experience overrides).
    const base = PLACES_BY_ID["bishop-ca"];
    const exp = composePlaceExperience({ ...base, experience: undefined });
    expect(exp.lede.length).toBeGreaterThan(8);
    expect(exp.immersive.length).toBeGreaterThan(40);
    expect(exp.feelLine).toContain("easy-comfort zone");
    expect(exp.travelerFit.trim()).not.toHaveLength(0);
    expect(exp.residentFit.trim()).not.toHaveLength(0);
    expect(exp.wouldNotFit.trim()).not.toHaveLength(0);
    expect(exp.texture.trim()).not.toHaveLength(0);
    for (const s of exp.seasons) {
      expect(s.detail.length).toBeGreaterThan(24);
      expect(s.headline).toContain("&");
      expect(Number.isFinite(s.highC)).toBe(true);
      expect(Number.isFinite(s.lowC)).toBe(true);
    }
  });

  it("reads hot-desert summers as hot and subarctic winters as frigid/cold", () => {
    const yuma = composePlaceExperience(PLACES_BY_ID["yuma-az"]);
    expect(yuma.seasons.find(s => s.key === "summer")!.tone).toBe("hot");

    const fairbanks = composePlaceExperience(PLACES_BY_ID["fairbanks-ak"]);
    expect(["frigid", "cold"]).toContain(fairbanks.seasons.find(s => s.key === "winter")!.tone);
  });

  it("lets authored experience fields override the derived read", () => {
    const base = PLACES_BY_ID["yuma-az"];
    const authored = composePlaceExperience({
      ...base,
      experience: {
        feel: "AUTHORED feel.",
        seasons: { summer: "AUTHORED summer detail that is plenty long to pass." },
        travelerFit: "AUTHORED traveler.",
        residentFit: "AUTHORED resident.",
        texture: "AUTHORED texture.",
      },
    });
    expect(authored.feelLine).toBe("AUTHORED feel.");
    expect(authored.travelerFit).toBe("AUTHORED traveler.");
    expect(authored.residentFit).toBe("AUTHORED resident.");
    expect(authored.texture).toBe("AUTHORED texture.");
    const summer = authored.seasons.find(s => s.key === "summer")!;
    expect(summer.detail).toBe("AUTHORED summer detail that is plenty long to pass.");
    expect(summer.authored).toBe(true);
    expect(authored.authored).toBe(true);
  });

  it("does not mark a place authored when no experience override is present", () => {
    expect(composePlaceExperience(PLACES_BY_ID["houghton-mi"]).authored).toBe(false);
  });
});
