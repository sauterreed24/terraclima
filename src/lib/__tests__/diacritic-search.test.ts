import { describe, it, expect } from "vitest";
import { foldDiacritics, getPlaceSearchFields, getPlaceSearchText, normalizeSearchText } from "../../data/places";
// Sources load with the profile; the full list carries them for every place.
import { PLACES_FULL_BY_ID as PLACES_BY_ID } from "../../data/places.full";

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

describe("normalizeSearchText", () => {
  it("pads with spaces, folds accents and collapses punctuation", () => {
    expect(normalizeSearchText("San José")).toBe(" san jose ");
    expect(normalizeSearchText("Coeur d'Alene (Lake)")).toBe(" coeur dalene lake ");
    expect(normalizeSearchText("fog-belt-coast")).toBe(" fog belt coast ");
    expect(normalizeSearchText("  ")).toBe(" ");
  });
});

describe("getPlaceSearchText live-here fields", () => {
  it("indexes settlements, things to do and authored deep sections", () => {
    const losAlamos = getPlaceSearchText(PLACES_BY_ID["los-alamos-pajarito-plateau-nm"]);
    expect(losAlamos).toContain("pajarito acres");
    expect(losAlamos).toContain("bandelier");
    expect(losAlamos).toContain("mesa neighborhoods are not one smooth climate");

    const zacatlan = getPlaceSearchText(PLACES_BY_ID["zacatlan-de-las-manzanas-mx"]);
    expect(zacatlan).toContain("apple orchards");
    expect(zacatlan).toContain("gulf moisture climbs into apple country");
  });

  it("leaves out citations, receipts and confidence notes", () => {
    const losAlamos = PLACES_BY_ID["los-alamos-pajarito-plateau-nm"];
    expect(losAlamos.citations.some(c => /noaa ncei/i.test(c.label))).toBe(true);
    expect(getPlaceSearchText(losAlamos)).not.toContain("noaa ncei");
  });

  it("splits text into tiers, with other places' names only in the cross-reference tier", () => {
    const sequim = getPlaceSearchFields(PLACES_BY_ID["sequim-wa"]);
    expect(sequim.name).toBe(" sequim ");
    expect(sequim.locality).toContain(" washington ");
    expect(sequim.locality).toContain(" united states ");
    expect(sequim.classification).toContain(" rain shadow sanctuary ");
    expect(sequim.crossReference).toContain(" forks ");
    expect(sequim.name + sequim.locality).not.toContain(" forks ");
  });

  it("derives a core name without the qualifier", () => {
    expect(getPlaceSearchFields(PLACES_BY_ID["oaxaca-mx"]).nameCore).toBe(" oaxaca city ");
    expect(getPlaceSearchFields(PLACES_BY_ID["forks-wa"]).nameCore).toBe(" forks ");
  });
});
