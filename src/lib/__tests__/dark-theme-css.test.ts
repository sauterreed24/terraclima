import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = readFileSync(resolve(import.meta.dirname, "../../styles.css"), "utf8");

describe("dark theme CSS coverage", () => {
  const selectors = [
    "html[data-theme=\"dark\"] .hero-quick-pick",
    "html[data-theme=\"dark\"] .hero-top-ten__chip",
    "html[data-theme=\"dark\"] .living-compass__rank-row",
    "html[data-theme=\"dark\"] .place-card__livability-bar",
    "html[data-theme=\"dark\"] .lifestyle-bundle-btn",
    "html[data-theme=\"dark\"] .text-depth-hero",
    "html[data-theme=\"dark\"] .tc-filter-search-field",
  ];

  it.each(selectors)("stylesheet defines %s", (sel) => {
    expect(STYLES).toContain(sel);
  });
});
