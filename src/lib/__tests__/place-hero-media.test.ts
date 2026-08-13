import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { getPlaceHeroMedia, listPlaceHeroFiles, placeHeroMediaCount } from "../place-hero-media";

describe("place hero media", () => {
  it("serves responsive, attributable media for default live-fit leaders", () => {
    for (const placeId of ["sequim-wa", "monterey-ca", "black-mountain-nc", "qualicum-bc", "hood-river-or"]) {
      const media = getPlaceHeroMedia(placeId);
      expect(media).not.toBeNull();
      expect(media!.src).toContain("Special:FilePath");
      expect(media!.srcSet).toContain("640w");
      expect(media!.srcSet).toContain("1280w");
      expect(media!.sizes).toContain("100vw");
      expect(media!.sourceUrl).toContain("commons.wikimedia.org/wiki/File:");
      expect(media!.alt.length).toBeGreaterThan(24);
    }
  });

  it("covers every corpus place with an attributable Commons photograph", () => {
    expect(placeHeroMediaCount()).toBeGreaterThanOrEqual(PLACES.length);

    for (const place of PLACES) {
      const media = getPlaceHeroMedia(place.id);
      expect(media, `${place.id} missing hero photograph`).not.toBeNull();
      expect(media!.alt.length, `${place.id} alt`).toBeGreaterThan(24);
      expect(media!.sourceUrl).toContain("commons.wikimedia.org/wiki/File:");
      expect(media!.src).toContain("Special:FilePath");
      expect(media!.creditLine).toMatch(/Wikimedia Commons/i);
    }
  });

  it("lists a Commons filename for every corpus place", () => {
    const files = listPlaceHeroFiles();
    const byId = new Map(files.map(row => [row.id, row.file]));
    expect(files.length).toBeGreaterThanOrEqual(PLACES.length);
    for (const place of PLACES) {
      const file = byId.get(place.id);
      expect(file, `${place.id} missing Commons filename`).toBeTruthy();
      expect(/\.(jpe?g|png|webp)$/i.test(file!), `${place.id} unexpected file ${file}`).toBe(true);
    }
  });
});
