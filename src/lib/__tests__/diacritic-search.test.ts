import { describe, it, expect } from "vitest";
import { foldDiacritics } from "../../data/places";

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
