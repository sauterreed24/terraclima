# Terraclima Improvement Context

Last reconciled: 2026-05-28.

## Repo Reality

The checked-out `sauterreed24/terraclima` repository is not the small PHP brochure site described in the Deep Research report. It is a Vite, React, and TypeScript static SPA for the North American Microclimate Atlas.

Do not add PHP entrypoints, Composer tooling, contact-form CSRF handling, or LocalBusiness metadata unless the repository is intentionally replaced with a different application. Those recommendations belong to a different public surface.

## Confirmed Architecture

- `src/App.tsx` owns the top-level app shell, URL synchronization, view switching, search, filters, compare state, and document title updates.
- `src/data/places*.ts`, `src/data/collections.ts`, `src/data/archetypes.ts`, and `src/data/glossary.ts` are the authored corpus.
- `src/types.ts` is the domain contract for place, climate, risk, citation, and profile data.
- `src/lib/` contains deterministic scoring, URL state, unit localization, metadata, geospatial analysis, and map helpers.
- `scripts/` contains executable corpus and ranking guardrails.
- `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`, and `public/404.html` define static hosting and discovery metadata.
- `.github/workflows/quality*.yml` run the quality gate, `.github/workflows/deploy-pages.yml` publishes the public GitHub Pages app, and `.github/workflows/static-preview.yml` keeps a portable static artifact branch.

## Current Quality Gate

Run:

```bash
npm run quality:check
```

That includes type checking, ESLint, Vitest, prose tests, metadata consistency, corpus audits, sanity checks, ranking goldens, and a production build.

## Filter state contract

- **`createEmptyFilterState()`** in [`src/lib/scoring.ts`](../src/lib/scoring.ts) is the canonical reset for “clear all filters” (omits optional Live Finder / elevation keys).
- **`filterStateFromValidated()`** hydrates explorer filters from URL-validated fields on first paint and `popstate` — keep in sync with [`validatedStateFromSearch`](../src/lib/app-url.ts), not duplicated in `App.tsx`.
- **`hasActiveExplorerFilters()`** / **`countActiveExplorerFilterSignals()`** are the single source for “filters active” in FilterBar and the mobile filter sheet badge.
- **`npm run playtest:polish`** asserts filter clear restores the full corpus and omits stale live-fit URL params after clear.

## Evolution v4.8 (2026-05)

- **Apparent-comfort (UTCI-style) proxy:** [`apparentComfortIndex`](../src/lib/comfort-precision.ts) reuses the existing heat-index + wet-bulb shade math to report a warm-season thermal-strain band. It is explicitly **not** a true UTCI (the corpus has no wind / solar / mean-radiant inputs); the UI carries that caption. Surfaced in `PlaceComfortPrecision` and a `CompareView` row.
- **2050 scenario projection:** [`src/lib/climate-projection.ts`](../src/lib/climate-projection.ts) deterministically morphs normals to SSP2-4.5 / SSP5-8.5 mid-century layers from a coarse **sourced regional anomaly table** (country + latitude band; IPCC AR6 Atlas, NASA NEX-GDDP-CMIP6). No per-site fabrication; authored `Place.projection` overrides win. `scn=` URL param; the dossier stays present-day.
- **Compute worker:** [`src/workers/climate-processor.worker.ts`](../src/workers/climate-processor.worker.ts) + [`use-climate-processor`](../src/hooks/use-climate-processor.ts) run the project→filter→rank pipeline off-thread via the pure [`runScenarioRanking`](../src/lib/climate-processor.ts) orchestrator. HONEST SCALE NOTE: at 226 places the synchronous path is ~1 ms, so the worker is architectural headroom (loaded lazily only when a future scenario is engaged), not a measured win; the sync seed is the source of truth and tests run synchronously.
- **Native CSS:** Tailwind v4 `@property`-registered animatable accent (motion-gated), container queries on `.place-card` / `.tc-compare-col` / `.tc-card-grid`, `@starting-style` entry. The window virtualizer still drives card column COUNT in JS (it needs it for row math); container queries handle per-card/per-column internals.
- **Vite 8:** `server.forwardConsole` forwards browser + worker runtime errors to the dev terminal. `resolve.tsconfigPaths` left off (no `paths` map; would be a no-op).
- **Projection data integrity:** `sanity-check` + `audit-corpus` validate any authored `Place.projection` deltas (finite, plausibility-bounded, pathway ordering) — dormant until per-place overrides are authored.

## Explorer symbiosis (2026-05)

- **Lifestyle bundles:** [`src/lib/lifestyle-bundles.ts`](../src/lib/lifestyle-bundles.ts) — hero quick-picks and FilterBar dock share `applyLifestyleBundle()`; auto **`live-fit`** ranking when constraints are active without a full bundle match.
- **Map ↔ list:** `AtlasMap` pans to the selected pin via `fitMapViewToPoints` (respects `motionPolicy()`); `VirtualPlaceGrid` scrolls the selected card into view (debounced `scrollToIndex`).
- **Compare → profile:** Compare column titles and highlight strips call `onOpenPlace`; App closes compare then opens the dossier (focus return matches place-detail pattern).
- **Share depth:** `CopyPlaceLink` uses `shareUrl()` and preserves `#deep-…` dossier section hashes when copying from a scrolled profile.
- **Corpus:** 28 fog-belt / cool-summer-maritime places now ship station-sourced `climate.humidity` (sanity WARNs cleared).

## Improvement Priorities

1. Keep the atlas URL model stable. Changes to `src/lib/app-url.ts` should update `docs/URL-INVARIANTS.md` and tests.
2. Add validation before changing corpus shape. Prefer `scripts/sanity-check.ts`, `scripts/audit-corpus.ts`, or focused Vitest coverage.
3. Keep public metadata centralized through `src/lib/site-metadata.ts` and guarded by `npm run check:metadata`.
4. Preserve phone map behavior: direct one-finger pan, pinch zoom, explicit Scroll page / Use map escape, tap-to-zoom clusters, and leader lines for visually spread pins.
5. Treat climate statements as sourced editorial context, not live weather, parcel appraisal, or forecast claims.
6. Keep UI changes dense, navigable, and inspection-oriented. This is an atlas/tool surface, not a marketing landing page.

## Manual QA (UI / visual)

After visual or map-pin changes, spot-check in the browser:

- **Light beauty pass:** Explorer hero glow → lens receipt chips → place card hover → open place detail; surfaces should feel layered (inset highlights, not flat white slabs in nested blocks).
- **Dark theme:** lens receipt, Live Finder (`.tc-accent-panel`), reading nav, map loading pill, and **climate scenario control** should read as moonlit jewel/chrome — no paper-white flash on `data-theme="dark"`. Hero spectrum bar and map instrument contrast unchanged.
- **Motion tier:** `document.documentElement.dataset.motion` follows `motionPolicy()` (`full` / `minimal` / `reduced`). With OS reduce motion on, view cross-fade and drawer spring should calm or disable while layout stays usable.
- **Reduced motion:** enable OS “reduce motion”; modals and map topo load should skip blur/long fades (`motionPolicy()` → `reduced` / `minimal`).
- **Map:** one-finger pan, pinch zoom, cluster picker Escape + focus return, leader lines when pins spread.
- **Map ↔ list sync:** select a pin or card — map view should center the pin; virtual grid should scroll the matching card into view (reduced motion: no animated fly).
- **Lifestyle bundle:** hero Remote Work and dock Remote Work should produce the same URL (`fit=cool-summers,low-fire-smoke`, `sh=26`, ranking `best-for-remote-work`).

## Inapplicable Research Items

- PHP route wrappers and `includes/` partials.
- Composer, PHPUnit, and PHPStan.
- Contact form validation, email transport, and CSRF hardening.
- HVAC branding, mission/vision copy, VRF/VRV terminology, and local-service business footer claims.
- LocalBusiness JSON-LD.

## Useful Research Translation

The useful part of the report is the general principle: public facts should be centralized and regression-tested. In this repo that means app metadata, canonical URLs, corpus conventions, URL invariants, and climate/prose audits rather than PHP templates and business-contact copy.
