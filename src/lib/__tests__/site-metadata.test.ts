import { describe, expect, it } from "vitest";
import { SITE_METADATA, placeDocumentTitle } from "../site-metadata";

describe("SITE_METADATA", () => {
  it("keeps canonical public URLs absolute and on the expected deployment hosts", () => {
    expect(new URL(SITE_METADATA.canonicalUrl).origin).toBe("https://sauterreed24.github.io");
    expect(new URL(SITE_METADATA.previewUrl).origin).toBe("https://raw.githack.com");
    expect(new URL(SITE_METADATA.ogImageUrl).origin).toBe(new URL(SITE_METADATA.canonicalUrl).origin);
  });

  it("formats document titles from one shared source", () => {
    expect(placeDocumentTitle(null)).toBe(SITE_METADATA.title);
    expect(placeDocumentTitle("Taos")).toBe(`Taos · ${SITE_METADATA.appName}`);
  });
});
