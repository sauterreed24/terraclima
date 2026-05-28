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
- **Dark theme:** lens receipt, Live Finder (`.tc-accent-panel`), reading nav, and map loading pill should read as moonlit jewel/chrome — no paper-white flash on `data-theme="dark"`. Hero spectrum bar and map instrument contrast unchanged.
- **Motion tier:** `document.documentElement.dataset.motion` follows `motionPolicy()` (`full` / `minimal` / `reduced`). With OS reduce motion on, view cross-fade and drawer spring should calm or disable while layout stays usable.
- **Reduced motion:** enable OS “reduce motion”; modals and map topo load should skip blur/long fades (`motionPolicy()` → `reduced` / `minimal`).
- **Map:** one-finger pan, pinch zoom, cluster picker Escape + focus return, leader lines when pins spread.

## Inapplicable Research Items

- PHP route wrappers and `includes/` partials.
- Composer, PHPUnit, and PHPStan.
- Contact form validation, email transport, and CSRF hardening.
- HVAC branding, mission/vision copy, VRF/VRV terminology, and local-service business footer claims.
- LocalBusiness JSON-LD.

## Useful Research Translation

The useful part of the report is the general principle: public facts should be centralized and regression-tested. In this repo that means app metadata, canonical URLs, corpus conventions, URL invariants, and climate/prose audits rather than PHP templates and business-contact copy.
