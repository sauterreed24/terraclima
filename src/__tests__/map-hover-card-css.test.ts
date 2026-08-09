import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../styles.css");
const styles = readFileSync(stylesPath, "utf8");

describe("map hover card entrance CSS", () => {
  it("uses an opacity-only entrance that never owns transform", () => {
    const keyframes = styles.match(/@keyframes mapHoverCardEnter\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(keyframes).toMatch(/from\s*\{\s*opacity:\s*0;\s*\}/);
    expect(keyframes).toMatch(/to\s*\{\s*opacity:\s*1;\s*\}/);
    expect(keyframes).not.toMatch(/transform/);

    expect(styles).toMatch(
      /\.tc-map-hover-card-enter\s*\{\s*animation:\s*mapHoverCardEnter\s+160ms/,
    );
  });

  it("disables or shortens the entrance under reduced, minimal, and low-power motion", () => {
    expect(styles).toMatch(/html\[data-motion="reduced"\] \.tc-map-hover-card-enter/);
    expect(styles).toMatch(/html\[data-motion="minimal"\] \.tc-map-hover-card-enter/);
    expect(styles).toMatch(
      /html\[data-motion="(?:reduced|minimal)"\] \.tc-map-hover-card-enter[\s\S]{0,180}?animation:\s*none\s*!important;/,
    );
    expect(styles).toMatch(/html\.tc-low-power \.tc-map-hover-card-enter/);
    expect(styles).toMatch(
      /html\.tc-low-power \.tc-map-hover-card-enter[\s\S]{0,120}?animation-duration:\s*120ms;/,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.tc-map-hover-card-enter,/,
    );
  });
});
