import { describe, expect, it } from "vitest";
import { possessive } from "../place-name";

describe("possessive", () => {
  it("drops a trailing parenthetical qualifier before adding the apostrophe", () => {
    expect(possessive("Friday Harbor (San Juan Islands)")).toBe("Friday Harbor's");
    expect(possessive("Port Townsend")).toBe("Port Townsend's");
  });

  it("uses a bare apostrophe after a final s", () => {
    expect(possessive("Twin Falls")).toBe("Twin Falls'");
    expect(possessive("Honolulu (Leeward Oʻahu)")).toBe("Honolulu's");
  });
});
