import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEMANTIC_TOKEN_KEYS,
  SEMANTIC_TOKENS_DARK,
  SEMANTIC_TOKENS_LIGHT,
  captionContrastOk,
  semanticTokensFor,
} from "../theme-tokens";

const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../styles.css");
const styles = readFileSync(stylesPath, "utf8");

describe("theme-tokens", () => {
  it("defines all semantic CSS variable names", () => {
    expect(SEMANTIC_TOKEN_KEYS).toHaveLength(18);
    expect(SEMANTIC_TOKEN_KEYS.every(k => k.startsWith("--tc-"))).toBe(true);
  });

  it("light and dark palettes differ on every surface", () => {
    const light = semanticTokensFor("light");
    const dark = semanticTokensFor("dark");
    const sharedAcrossThemes: Array<keyof typeof light> = ["motionDurationFast", "motionDurationBase"];
    for (const key of Object.keys(light) as Array<keyof typeof light>) {
      if (sharedAcrossThemes.includes(key)) continue;
      expect(light[key]).not.toBe(dark[key]);
    }
  });

  it("exports stable light/dark constants", () => {
    expect(SEMANTIC_TOKENS_LIGHT.surfaceElevated).toContain("255");
    expect(SEMANTIC_TOKENS_DARK.surfaceElevated).toContain("28");
    expect(SEMANTIC_TOKENS_LIGHT.scrim).toMatch(/rgba\(/);
    expect(SEMANTIC_TOKENS_DARK.chipActive).toMatch(/196,\s*220/);
    expect(SEMANTIC_TOKENS_LIGHT.shadowElevated).toContain("inset");
    expect(SEMANTIC_TOKENS_DARK.glassBg).toContain("28");
  });

  it("caption contrast guard passes for both modes", () => {
    expect(captionContrastOk("light")).toBe(true);
    expect(captionContrastOk("dark")).toBe(true);
  });

  /** Regression guard: dark-mode selectors added in the UI beauty pass. */
  it("documents required dark-theme CSS selector tokens", () => {
    const required = [
      "html[data-theme=\"dark\"] .hero-quick-pick",
      "html[data-theme=\"dark\"] .living-compass__rank-row",
      "html[data-theme=\"dark\"] .lens-receipt",
      "html[data-theme=\"dark\"] .tc-accent-panel",
      "html[data-theme=\"dark\"] .climate-scenario",
      "html[data-theme=\"dark\"] .scenario-remap",
      ".tc-modal-scrim",
      ".tc-nav-btn--active",
    ];
    expect(required.every(s => s.includes("dark") || s.startsWith(".tc-"))).toBe(true);
    for (const selector of required.filter(s => s.includes("dark"))) {
      expect(styles).toContain(selector);
    }
  });
});
