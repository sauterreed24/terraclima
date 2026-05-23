import { describe, expect, it } from "vitest";
import { countLivedSourceEvidence, formatLivedSources } from "../lived-sources";

describe("lived source formatting", () => {
  it("uses the explicit label when present", () => {
    expect(formatLivedSources([{ label: "County profile", url: " https://example.com/profile " }])[0]).toMatchObject({
      label: "County profile",
      href: "https://example.com/profile",
    });
  });

  it("falls back to the safe URL hostname for URL-only runtime sources", () => {
    expect(formatLivedSources([{ url: "https://www.niche.com/places-to-live/example/" }])).toMatchObject([
      {
        label: "niche.com",
        href: "https://www.niche.com/places-to-live/example/",
      },
    ]);
  });

  it("does not count unsafe URL-only sources as evidence", () => {
    expect(formatLivedSources([{ url: "javascript:alert(1)" }])).toEqual([]);
    expect(countLivedSourceEvidence([{ label: "Area profile" }, { url: "javascript:alert(1)" }])).toBe(1);
  });
});
