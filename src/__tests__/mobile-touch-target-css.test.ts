import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../styles.css");
const styles = readFileSync(stylesPath, "utf8");

function expectRule(selector: string, declaration: RegExp) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "m"));
  expect(match?.[1] ?? "").toMatch(declaration);
}

function ruleBody(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";
}

function ruleBodies(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(styles.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "gm")), match => match[1] ?? "");
}

describe("mobile touch target CSS", () => {
  it("keeps desktop first-viewport Explorer controls at or above a 44px hit area", () => {
    expect(
      ruleBodies(".hero-quick-pick").some(body =>
        /display:\s*inline-flex;/.test(body) && /min-height:\s*2\.75rem;/.test(body),
      ),
    ).toBe(true);
    expectRule(".skip-to-main", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expect(styles).toMatch(/\.hero-action-stack \.btn-ghost,\s*\.hero-action-stack \.btn-primary\s*\{[^}]*min-height:\s*46px;/);
    expectRule(".desktop-scout-board__action", /min-height:\s*2\.75rem;/);
    expectRule(".chip-btn", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".rank-menu__select", /min-height:\s*2\.75rem;/);
    expectRule(".tc-header-help-btn", /min-height:\s*2\.75rem;/);
    expectRule(".tc-filter-search-field", /padding-top:\s*0;[\s\S]*padding-bottom:\s*0;/);
    expectRule(".tc-filter-search-field input", /align-self:\s*stretch;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".tc-filter-search-field button", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
  });

  it("keeps first-viewport hero controls at or above a 44px hit area", () => {
    expect(styles).toMatch(/\.hero-quick-pick\s*\{\s*scroll-snap-align:\s*start;\s*min-height:\s*2\.75rem;/);
    expect(styles).toMatch(/\.hero-action-stack \.btn-ghost,\s*\.hero-action-stack \.btn-primary\s*\{[^}]*min-height:\s*46px;/);
    expect(styles).toMatch(/\.hero-mini-rail__chip\s*\{[^}]*flex:\s*0 0 auto;[^}]*min-height:\s*2\.75rem;/);
    expectRule("[data-active-scope-clear]", /min-height:\s*2\.75rem;/);
    expectRule(".tc-home-base-clear", /display:\s*inline-flex;[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".tc-hero-home-receipt__action", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".fit-journey-receipt__action", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".hero-mini-rail__chip-open", /min-height:\s*2\.75rem;/);
    expectRule(".hero-mini-rail__chip-remove", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".hero-mini-rail__action", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".tc-shortlist-export__trigger", /min-height:\s*2\.75rem;/);
    expectRule(".tc-shortlist-export__item", /min-height:\s*2\.75rem;/);
    expectRule(".scout-brief__actions > *", /min-height:\s*2\.75rem;/);
    expectRule(".tc-hero-empty-recovery__action", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
  });

  it("keeps interactive hero rails fully hit-testable", () => {
    const heroQuickPicks = ruleBodies(".hero-quick-picks").join("\n");
    const climateSignalRailGrid = ruleBody(".climate-signal-rail__grid");
    const heroMiniRail = ruleBody(".hero-mini-rail");

    expect(heroQuickPicks).toMatch(/overflow-x:\s*auto;/);
    expect(heroQuickPicks).toMatch(/scrollbar-width:\s*thin;/);
    expect(heroQuickPicks).not.toMatch(/mask-image/);
    expect(climateSignalRailGrid).toMatch(/overflow-x:\s*auto;/);
    expect(climateSignalRailGrid).toMatch(/scrollbar-width:\s*thin;/);
    expect(climateSignalRailGrid).not.toMatch(/mask-image/);
    expect(heroMiniRail).toMatch(/overflow-x:\s*auto;/);
    expect(heroMiniRail).not.toMatch(/mask-image/);
  });

  it("keeps compact header navigation and unit controls at or above a 44px hit area", () => {
    expectRule(".tc-header-menu-trigger", /min-width:\s*46px;[\s\S]*min-height:\s*46px;/);
    expectRule(".tc-nav-btn--stretch", /min-height:\s*46px;/);
    expectRule(".tc-nav-btn:not(.tc-nav-btn--stretch)", /min-height:\s*46px;/);
    expectRule(".tc-temp-toggle__btn", /min-width:\s*46px;[\s\S]*min-height:\s*46px;/);
    expectRule(".tc-theme-toggle__btn", /min-width:\s*46px;[\s\S]*min-height:\s*46px;/);
    expectRule(".tc-compare-open-trigger", /min-height:\s*46px;[\s\S]*justify-content:\s*center;/);
    expectRule(".tc-filter-sheet-trigger", /min-height:\s*46px;/);
    expectRule(".live-select-row__select", /min-height:\s*2\.75rem;/);
    expectRule(".tc-header-help-desktop", /display:\s*none;[\s\S]*align-items:\s*center;[\s\S]*gap:\s*0\.5rem;[\s\S]*flex-wrap:\s*wrap;/);
    expectRule(".tc-header-help-mobile", /display:\s*inline-flex;/);
    expect(styles).toMatch(/@media \(min-width:\s*768px\)\s*\{[\s\S]*?\.tc-header-help-desktop\s*\{[\s\S]*?display:\s*flex;[\s\S]*?\.tc-header-help-mobile\s*\{[\s\S]*?display:\s*none;/);
    expect(styles).toMatch(/@media \(max-width:\s*480px\)\s*\{[\s\S]*?\.tc-filter-sheet-trigger\s*\{[\s\S]*?min-width:\s*46px;[\s\S]*?min-height:\s*46px;/);
    expect(styles).toMatch(/@media \(max-width:\s*480px\)\s*\{[\s\S]*?\.tc-filter-sheet-trigger__label\s*\{[\s\S]*?max-width:\s*5rem;[\s\S]*?text-overflow:\s*ellipsis;/);
    expect(styles).not.toMatch(/@media \(max-width:\s*480px\)\s*\{[\s\S]*?\.tc-filter-sheet-trigger__label\s*\{[\s\S]*?clip:\s*rect/);
    expectRule(".tc-site-menu-dialog__inner .tc-temp-toggle__btn", /min-height:\s*46px;/);
    expectRule(".tc-site-menu-dialog__inner .tc-theme-toggle__btn", /min-height:\s*46px;/);
    expectRule(".tc-site-menu-dialog__close", /min-width:\s*46px;[\s\S]*min-height:\s*46px;/);
    expectRule(".tc-shortcuts-overlay__close", /display:\s*inline-flex;[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
  });

  it("keeps map chrome controls at or above a 44px hit area", () => {
    expectRule(".map-btn", /width:\s*44px;[\s\S]*height:\s*44px;/);
    expectRule(".map-key-toggle", /min-height:\s*46px;/);
    expectRule(".map-legend-close", /flex:\s*0 0 44px;[\s\S]*width:\s*44px;[\s\S]*min-width:\s*44px;[\s\S]*height:\s*44px;[\s\S]*min-height:\s*44px;/);
    expectRule(".map-key-popover", /max-height:\s*min\(19rem,\s*calc\(100vh - 6rem\),\s*calc\(100% - 6rem\)\);/);
    expectRule(".map-key-notes summary", /min-height:\s*2\.75rem;[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;/);
  });

  it("keeps filter-sheet actions and collection chips at or above a 44px hit area", () => {
    expectRule(".tc-filter-sheet-dialog__inner", /overflow-y:\s*auto;[\s\S]*scroll-padding-top:\s*4\.75rem;/);
    expectRule(".tc-filter-sheet-dialog__head", /position:\s*sticky;[\s\S]*top:\s*-1rem;[\s\S]*z-index:\s*3;/);
    expectRule(".tc-filter-sheet-dialog__head .btn-ghost", /min-width:\s*46px;[\s\S]*min-height:\s*46px;/);
    expect(styles).toMatch(/\.tc-filter-sheet-dialog__head \.btn-ghost,\s*\.tc-filter-sheet-dialog__inner \.climate-scenario__opt,\s*\.tc-filter-sheet-dialog__inner \.tc-filter-search-field button,\s*\.tc-filter-sheet-dialog__inner \.lens-receipt__clear,\s*\.tc-filter-sheet-dialog__inner \.lens-receipt__chip--dismiss,\s*\.tc-filter-sheet-dialog__inner \.chip-btn,\s*\.tc-filter-sheet-dialog__inner \.live-select-row__select,\s*\.tc-filter-sheet-dialog__inner \.rank-menu__select\s*\{[^}]*min-height:\s*46px;/);
    expect(styles).toMatch(/\.tc-filter-sheet-dialog__head \.btn-ghost,\s*\.tc-filter-sheet-dialog__inner \.tc-filter-search-field button,\s*\.tc-filter-sheet-dialog__inner \.chip-btn\s*\{[^}]*min-width:\s*46px;/);
    expectRule(".tc-filter-sheet-dialog__inner .tc-filter-search-field", /min-height:\s*46px;[\s\S]*padding-top:\s*0;[\s\S]*padding-bottom:\s*0;/);
    expectRule(".tc-filter-sheet-dialog__inner .tc-filter-search-field input", /align-self:\s*stretch;[\s\S]*min-height:\s*46px;/);
    expectRule(".climate-scenario__opt", /min-height:\s*2\.75rem;/);
    expectRule(".lens-receipt__clear", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".lens-receipt__chip--dismiss", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".collection-pin-button", /min-height:\s*2\.75rem;[\s\S]*justify-content:\s*center;/);
    expectRule(".collection-place-chip", /min-height:\s*2\.75rem;/);
  });

  it("keeps climate trip card actions at or above a 44px hit area", () => {
    expect(styles).toMatch(/\.climate-trip-card \.btn-ghost,\s*\.climate-trip-card \.btn-primary\s*\{[^}]*min-height:\s*2\.75rem;/);
    expectRule(".climate-trip-season-button", /min-height:\s*2\.75rem;/);
  });

  it("keeps Explorer context and place-card save controls at or above a 44px hit area", () => {
    expect(styles).toMatch(/\.context-stress__head-actions \.btn-ghost,\s*\.context-stress__head-actions \.btn-primary\s*\{[^}]*min-height:\s*2\.75rem;/);
    expectRule(".context-stress__actions > *", /min-height:\s*2\.75rem;/);
    expectRule(".tc-bookmark-chip", /width:\s*2\.75rem;[\s\S]*height:\s*2\.75rem;/);
  });

  it("keeps Learn example-place chips at or above a 44px hit area", () => {
    expectRule(".learn-concept-card .chip-btn", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
  });

  it("keeps Compare Workbench controls at or above a 44px hit area", () => {
    expectRule(".compare-dialog__actions .btn-ghost", /min-height:\s*2\.75rem;/);
    expectRule(".compare-workbench__lens-option", /min-height:\s*2\.75rem;/);
    expectRule(".compare-workbench__candidate-search input", /min-height:\s*2\.75rem;/);
    expectRule(".compare-workbench__source-filter-btn", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".compare-workbench__candidate-sort select", /min-height:\s*2\.75rem;/);
    expectRule(".compare-workbench__candidate-reset", /min-height:\s*2\.75rem;/);
    expectRule(".compare-bioclim-key summary", /min-height:\s*2\.75rem;/);
    expect(styles).toMatch(/@media \(max-width:\s*700px\)\s*\{[\s\S]*?\.compare-workbench\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.compare-workbench__candidate-tools\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.compare-workbench__source-filter\s*\{[\s\S]*?overflow-x:\s*auto;/);
    expectRule(".compare-decision-read__action", /min-height:\s*2\.75rem;/);
    expectRule(".compare-evidence-readiness__place", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".compare-single-guide__keep-scouting", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".compare-diff-board__toggle", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule("[data-compare-loading] [data-compare-loading-close]", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".compare-insight-strip__place.compare-insight-strip__place--link", /display:\s*inline-flex;[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*46px;/);
    expectRule(".compare-column-title", /display:\s*inline-flex;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule(".compare-finalist-table__place", /display:\s*inline-flex;[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
  });

  it("keeps place-detail drawer actions at or above a 44px hit area", () => {
    expect(styles).toMatch(/\[data-place-detail\] \.detail-drawer-header \.chip-btn,\s*\[data-place-detail\] \.detail-drawer-header \.btn-ghost,\s*\[data-place-detail\] \.tc-detail-map-link,\s*\[data-place-detail\] \.tc-reading-nav-link\s*\{[^}]*min-height:\s*2\.75rem;/);
    expect(styles).toMatch(/\[data-place-detail\] \.residency-brief__action-button,\s*\[data-place-detail\] \.tc-driver-chip,\s*\[data-place-detail\] \.tc-driver-glossary-close,\s*\[data-place-detail\] \.tc-twin-shift,\s*\[data-place-detail\] \.detail-dossier-jump,\s*\[data-place-detail\] \.tc-detail-source-link\s*\{[^}]*min-height:\s*2\.75rem;/);
    expect(styles).toMatch(/\[data-place-detail\] \.tc-driver-chip,\s*\[data-place-detail\] \.tc-driver-glossary-close,\s*\[data-place-detail\] \.tc-twin-shift,\s*\[data-place-detail\] \.detail-dossier-jump,\s*\[data-place-detail\] \.tc-detail-source-link\s*\{[^}]*display:\s*inline-flex;/);
    expectRule("[data-place-detail] [data-place-detail-close]", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule("[data-place-detail-loading] [data-place-detail-close]", /min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
    expectRule("[data-place-detail] .tc-driver-glossary-close", /min-width:\s*2\.75rem;[\s\S]*justify-content:\s*center;/);
    expectRule("[data-place-detail] #pd-settlements .panel-thin", /min-width:\s*0;[\s\S]*max-width:\s*100%;/);
    expectRule("[data-place-detail] #pd-settlements .panel-thin .flex.items-center", /flex-wrap:\s*wrap;/);
    expectRule("[data-place-detail] #pd-settlements .panel-thin .chip", /min-width:\s*0;[\s\S]*max-width:\s*100%;/);
    expectRule(".tc-hero-credit a", /display:\s*grid;[\s\S]*min-height:\s*2\.75rem;/);
  });
});
