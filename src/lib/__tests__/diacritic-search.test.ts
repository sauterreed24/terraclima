import { describe, it, expect } from "vitest";
import { PLACES_BY_ID, foldDiacritics, getPlaceSearchText } from "../../data/places";

describe("foldDiacritics (D3)", () => {
  it("strips combining marks and lowercases", () => {
    expect(foldDiacritics("San José")).toBe("san jose");
    expect(foldDiacritics("Querétaro")).toBe("queretaro");
    expect(foldDiacritics("Mañana")).toBe("manana");
    expect(foldDiacritics("Río Grande")).toBe("rio grande");
  });

  it("leaves ASCII intact", () => {
    expect(foldDiacritics("Sequim, WA")).toBe("sequim, wa");
  });

  it("idempotent: folding a folded string is the same string", () => {
    const once = foldDiacritics("Cañón");
    const twice = foldDiacritics(once);
    expect(twice).toBe(once);
  });
});

describe("getPlaceSearchText live-here fields", () => {
  it("indexes settlements, things to do, confidence notes, citations, and deep sections", () => {
    const losAlamos = getPlaceSearchText(PLACES_BY_ID["los-alamos-pajarito-plateau-nm"]);
    expect(losAlamos).toContain("pajarito acres");
    expect(losAlamos).toContain("bandelier");
    expect(losAlamos).toContain("noaa ncei");
    expect(losAlamos).toContain("mesa neighborhoods are not one smooth climate");

    const zacatlan = getPlaceSearchText(PLACES_BY_ID["zacatlan-de-las-manzanas-mx"]);
    expect(zacatlan).toContain("apple orchards");
    expect(zacatlan).toContain("gulf moisture climbs into apple country");
  });
});
