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
    expect(exp.feelLine).toContain("easy to be outside");
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

  it("does not mark a place authored when experience override is cleared", () => {
    const base = PLACES_BY_ID["yuma-az"];
    expect(composePlaceExperience({ ...base, experience: undefined }).authored).toBe(false);
  });

  it("weaves the primary driver into the derived feel line", () => {
    const base = PLACES_BY_ID["bishop-ca"];
    const exp = composePlaceExperience({ ...base, experience: undefined });
    expect(exp.feelLine).toContain("shaped mainly by");
    expect(exp.feelLine).toContain("rain shadow");
  });

  it("enriches spring/summer season detail with relief context when not authored", () => {
    const forks = PLACES_BY_ID["forks-wa"];
    const exp = composePlaceExperience({ ...forks, experience: undefined });
    const summer = exp.seasons.find(s => s.key === "summer")!;
    expect(summer.detail).toContain("Olympic Peninsula west slope");
    expect(summer.authored).toBe(false);
  });

  it("leads the overview with mechanism, nearby contrast, and a short history for every place", () => {
    for (const place of PLACES) {
      const exp = composePlaceExperience(place);
      expect(exp.whyDifferent.trim().length, `${place.id} whyDifferent`).toBeGreaterThan(24);
      expect(exp.whyDrivers.toLowerCase()).toMatch(/most of the work here comes from|what sets the weather apart is|the local climate is shaped by|local terrain/);
      expect(exp.contrastItems.length, `${place.id} contrast`).toBeGreaterThanOrEqual(1);
      for (const item of exp.contrastItems) {
        expect(item.label.trim()).not.toHaveLength(0);
        expect(item.note.trim().length).toBeGreaterThan(12);
      }
      expect(exp.historyParagraphs.length, `${place.id} history`).toBeGreaterThanOrEqual(2);
      for (const para of exp.historyParagraphs) {
        expect(para.trim().length, `${place.id} history para`).toBeGreaterThan(40);
        expect(para, `${place.id} history voice`).not.toMatch(/abstract climate class|household pattern this climate/i);
      }
      expect(exp.immersive, `${place.id} immersive voice`).not.toMatch(/The rhythm holds most years|doing quiet work behind the numbers|postcard version of the|risk lines worth checking|growability scores/);
      expect(exp.historyParagraphs.join(" "), `${place.id} history voice`).not.toMatch(/growability scores|the record works out as follows|editorial shorthand/i);
    }
  });

  it("prefers sensory seasons over generated numeric templates", () => {
    const alamos = composePlaceExperience(PLACES_BY_ID["alamos-mx"]);
    expect(alamos.seasons.find(s => s.key === "winter")!.detail).not.toMatch(/keeps winter highs near/);
    expect(alamos.seasons.find(s => s.key === "winter")!.authored).toBe(false);
  });

  it("keeps hand-written Sequim seasons", () => {
    const sequim = composePlaceExperience(PLACES_BY_ID["sequim-wa"]);
    expect(sequim.seasons.find(s => s.key === "summer")!.detail).toMatch(/Strait of Juan de Fuca/i);
    expect(sequim.seasons.find(s => s.key === "summer")!.authored).toBe(true);
  });

  it("replaces generated season templates with a sensory read", () => {
    const asheville = composePlaceExperience(PLACES_BY_ID["asheville-nc"]);
    expect(asheville.seasons.find(s => s.key === "winter")!.detail).not.toMatch(/cold months stay close to/);
    expect(asheville.seasons.find(s => s.key === "winter")!.authored).toBe(false);
    expect(asheville.travelerFit).not.toMatch(/most leave surprised/i);
    expect(asheville.texture).not.toMatch(/None of that erases the appeal/i);
  });

  it("strips generated immersive padding and keeps the authored portrait", () => {
    const astoria = composePlaceExperience(PLACES_BY_ID["astoria-or"]);
    expect(astoria.immersive).toMatch(/storm-lashed port/i);
    expect(astoria.immersive).not.toMatch(/doing quiet work behind the numbers|The rhythm holds most years|risk lines worth checking/);
  });

  it("does not leave dangling punctuation on cleaned fit copy", () => {
    const bacalar = composePlaceExperience(PLACES_BY_ID["bacalar-mx"]);
    expect(bacalar.residentFit).not.toMatch(/,\./);
    expect(bacalar.residentFit.trim().endsWith(".")).toBe(true);
  });

  it("uses Portal settlement history rather than scoring jargon", () => {
    const portal = composePlaceExperience(PLACES_BY_ID["portal-az"]);
    expect(portal.historyParagraphs.join(" ")).toMatch(/Paradise|Portal|Chiricahua/i);
    expect(portal.historyParagraphs.join(" ")).not.toMatch(/growability scores|the record works out as follows/i);
  });

  it("uses Sequim's rain-shadow contrast and Portal's settlement history", () => {
    const sequim = composePlaceExperience(PLACES_BY_ID["sequim-wa"]);
    expect(sequim.whyDifferent).toMatch(/Olympic/i);
    expect(sequim.contrastItems.some(item => /forks/i.test(`${item.label} ${item.note}`))).toBe(true);

    const portal = composePlaceExperience(PLACES_BY_ID["portal-az"]);
    expect(portal.historyParagraphs.join(" ")).toMatch(/Paradise|Portal|Chiricahua/i);
  });

  it("keeps Overview why, history, and immersive at readable depth for every place", () => {
    const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    for (const place of PLACES) {
      const exp = composePlaceExperience(place);
      expect(words(exp.whyDifferent), `${place.id} whyDifferent words`).toBeGreaterThanOrEqual(70);
      expect(words(exp.immersive), `${place.id} immersive words`).toBeGreaterThanOrEqual(80);
      expect(exp.historyParagraphs.length, `${place.id} history paras`).toBeGreaterThanOrEqual(3);
      expect(exp.historyParagraphs.reduce((n, p) => n + words(p), 0), `${place.id} history total`).toBeGreaterThanOrEqual(200);
      for (const para of exp.historyParagraphs) {
        expect(words(para), `${place.id} history para words`).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it("lets authored history and why override the derived portrait", () => {
    const base = PLACES_BY_ID["yuma-az"];
    const authored = composePlaceExperience({
      ...base,
      experience: {
        why: "AUTHORED why this desert floor is different.",
        history: ["AUTHORED history paragraph one is long enough.", "AUTHORED history paragraph two is also long enough."],
      },
    });
    expect(authored.whyDifferent).toBe("AUTHORED why this desert floor is different.");
    expect(authored.historyParagraphs).toEqual([
      "AUTHORED history paragraph one is long enough.",
      "AUTHORED history paragraph two is also long enough.",
    ]);
    expect(authored.historyAuthored).toBe(true);
    expect(authored.authored).toBe(true);
  });
});
