import { describe, expect, it } from "vitest";
import { getPlaceHeroMedia } from "../place-hero-media";

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
});
