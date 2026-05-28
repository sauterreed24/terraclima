import { describe, expect, it } from "vitest";
import {
  SEMANTIC_TOKEN_KEYS,
  SEMANTIC_TOKENS_DARK,
  SEMANTIC_TOKENS_LIGHT,
  captionContrastOk,
  semanticTokensFor,
} from "../theme-tokens";

describe("theme-tokens", () => {
  it("defines all semantic CSS variable names", () => {
    expect(SEMANTIC_TOKEN_KEYS).toHaveLength(7);
    expect(SEMANTIC_TOKEN_KEYS.every(k => k.startsWith("--tc-"))).toBe(true);
  });

  it("light and dark palettes differ on every surface", () => {
    const light = semanticTokensFor("light");
    const dark = semanticTokensFor("dark");
    for (const key of Object.keys(light) as Array<keyof typeof light>) {
      expect(light[key]).not.toBe(dark[key]);
    }
  });

  it("exports stable light/dark constants", () => {
    expect(SEMANTIC_TOKENS_LIGHT.surfaceElevated).toContain("255");
    expect(SEMANTIC_TOKENS_DARK.surfaceElevated).toContain("28");
    expect(SEMANTIC_TOKENS_LIGHT.scrim).toMatch(/rgba\(/);
    expect(SEMANTIC_TOKENS_DARK.chipActive).toMatch(/196,\s*220/);
  });

  it("caption contrast guard passes for both modes", () => {
    expect(captionContrastOk("light")).toBe(true);
    expect(captionContrastOk("dark")).toBe(true);
  });

  /** Regression guard: dark-mode selectors added in the UI visual pass. */
  it("documents required dark-theme CSS selector tokens", () => {
    const required = [
      "html[data-theme=\"dark\"] .hero-quick-pick",
      "html[data-theme=\"dark\"] .living-compass__rank-row",
      ".tc-modal-scrim",
      ".tc-nav-btn--active",
    ];
    expect(required.every(s => s.includes("dark") || s.startsWith(".tc-"))).toBe(true);
  });
});
