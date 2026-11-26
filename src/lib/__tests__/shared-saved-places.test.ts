import { describe, expect, it } from "vitest";
import { SAVED_LINK_MAX, readSharedSavedIds, savedPlacesLink, withoutSavedParam } from "../shared-saved-places";

const known = new Set(["sequim-wa", "bishop-ca", "oaxaca-mx", "san-miguel-de-allende-mx"]);
const resolve = (id: string) => (id === "san-miguel-mx" ? "san-miguel-de-allende-mx" : known.has(id) ? id : null);

describe("saved places in a link", () => {
  it("round-trips ids through the link, in order", () => {
    const link = savedPlacesLink("https://example.org/terraclima/?p=bishop-ca&r=coolest-summers#deep", ["oaxaca-mx", "sequim-wa"]);
    expect(link).toBe("https://example.org/terraclima/?saved=oaxaca-mx,sequim-wa");
    expect(readSharedSavedIds(new URL(link).search, resolve)).toEqual(["oaxaca-mx", "sequim-wa"]);
  });

  it("resolves old ids, drops unknown, duplicate and hostile ones", () => {
    expect(readSharedSavedIds("?saved=san-miguel-mx,%3Cimg%20src%3Dx%3E,bishop-ca,bishop-ca,__proto__,,", resolve))
      .toEqual(["san-miguel-de-allende-mx", "bishop-ca"]);
    expect(readSharedSavedIds("?p=bishop-ca", resolve)).toEqual([]);
    expect(readSharedSavedIds("", resolve)).toEqual([]);
  });

  it("caps very long lists", () => {
    const many = Array.from({ length: SAVED_LINK_MAX + 50 }, (_, i) => `p-${i}`);
    expect(readSharedSavedIds(`?saved=${many.join(",")}`, id => id)).toHaveLength(SAVED_LINK_MAX);
  });

  it("removes only the saved parameter from the address", () => {
    expect(withoutSavedParam("https://example.org/?saved=a,b&theme=dark#x")).toBe("https://example.org/?theme=dark#x");
  });
});
