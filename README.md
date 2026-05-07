# Terraclima

**The North American Microclimate Atlas.**

Terraclima is a research-grade, human-readable climate intelligence application for exploring how terrain changes lived weather across the United States, Canada, and Mexico. It treats places as physical systems, not just pins on a map: rain shadows, sky islands, marine layers, chinook corridors, frost hollows, tropical highlands, fog belts, lake-effect snowbelts, orchard valleys, and wind gaps are explained through the mechanisms that make them real.

The result is part atlas, part field guide, part decision tool. It is built to show architectural judgment: structured data, provenance, derived analysis, accessible UI, performance discipline, and enough validation tooling that both humans and coding agents can review it without guessing what matters.

## Why This Project Exists

Most climate products answer "what is the weather like?" Terraclima asks a more useful question: **why does this place feel different from the region around it?**

That distinction matters for relocation research, agricultural scouting, travel planning, climate adaptation, and plain curiosity. A coastal city can be cool because of upwelling, a mountain town can be mild because it sits above a cold-air pool, and two places at the same latitude can live in different worlds because one is exposed to gap winds while the other is sheltered by relief. Terraclima makes those differences legible.

## What It Does

- **Explorer map:** An Albers-projected North America atlas with tiered pins, keyboard-accessible markers, live climate previews, country and archetype filters, and URL-shareable state. On **narrow viewports** the primary nav moves into a **hamburger menu** (`<dialog>` with blurred scrim); filters and ranking move into a **floating “Filters & rank” sheet** with the same modal polish, a single search field (no duplicate IDs), and the atlas footprint panel below the controls. From **1024px** up, filters stay in a **fixed-width dock** beside the explorer.
- **Keyboard shortcuts:** `E` / `C` / `L` switch views; `/` jumps to Explorer and focuses search (on narrow layouts it also opens the filter sheet so the field is visible); `F` opens the filter sheet on narrow Explorer; `R` picks a random place from the current filtered list; `Esc` closes shortcuts, compare, the filter sheet, the site menu, or an open place profile in that order; `?` toggles shortcut help (rendered above other dialogs).
- **Place profiles:** Long-form dossiers for each microclimate with seasonal charts, corpus comparisons, geospatial screening, soils, growability, risks, local contrasts, climate-change notes, similar places, and citations.
- **Geospatial analysis:** Deterministic terrain, climate, risk, and corpus-derived scores explain geospatial signal strength, an EO observability read aligned with Sentinel-2 / Landsat capabilities, and a **relief texture** proxy for where fine-scale topography (lidar-grade in the field) would most change interpretation. The app stays explicit that these are screening scores, not live pixels or point clouds.
- **Ranking lenses:** Sort by hidden gems, coolest summers, mildest winters, growability, low fire risk, diurnal sleep climate, geospatial signal, monsoon drama, wet-forest refuges, Mediterranean-like conditions, and more.
- **Collections and learning mode:** Curated bundles and a glossary that connect mechanisms such as lapse rate, cold-air pooling, orographic lift, marine layer, foehn winds, and karst hydrology to real places.
- **Comparison workflow:** Up to four places side by side, with responsive columns, focus-managed modal behavior, climate ribbons, fingerprint charts, and derived scores.
- **Unit-aware prose:** The corpus is authored in metric climate language, while the UI localizes temperatures, ranges, deltas, precipitation, snowfall, elevation, wind speed, and distance for the active unit system.

## Engineering Highlights

- **Typed climate intelligence schema:** `src/types.ts` models climate normals, soil, growability, hazards, citations, local contrasts, field notes, deep sections, and derived geospatial context.
- **Deterministic scoring:** `src/lib/scoring.ts`, `src/lib/geospatial-analysis.ts`, and `src/lib/atlas-corpus-stats.ts` keep ranking logic explainable and regression-testable.
- **Agent-friendly validation:** `scripts/sanity-check.ts`, `scripts/audit-corpus.ts`, `scripts/test-prose.ts`, and `scripts/corpus-rank-gold.ts` catch malformed data, prose/unit regressions, corpus drift, and rank instability.
- **Unit tests for pure logic:** `src/lib/__tests__/` covers `units`, `scoring`, `best-months`, `similarity`, and `app-url` with Vitest. The corpus scripts validate data shape; these tests guard the math (unit conversion, ranking arithmetic, month-window derivation, URL round-trips).
- **Linting with intent:** ESLint flat config in `eslint.config.js` runs `@typescript-eslint`, `react-hooks`, and `jsx-a11y` (a11y as warnings so the existing baseline doesn't block, but new violations surface in PRs and CI).
- **PR-time CI:** `.github/workflows/quality.yml` runs the full `npm run quality:check` pipeline on every pull request and non-`main` push, so the gate is enforced rather than honor-system.
- **Accessible modal stack:** Global `Escape` handling lives in the app shell (including HTML `<dialog>` elements for the site menu and Explorer filter sheet). Compare, keyboard-help, and place detail use focus traps and explicit dialog semantics where applicable. Opening a place profile **closes** the mobile filter sheet so the stack stays predictable. Glass dialogs share a light entrance motion (`tc-glass-dialog-motion`); the filter sheet **traps focus** inside the panel and **focuses search** when it opens (including after the `/` shortcut opens the sheet on narrow layouts). The filtered result count is announced to screen readers via a dedicated `sr-only` `aria-live` region (the visible counter animates and is `aria-hidden`, so SR users hear the final count once instead of every tween frame). SVG map markers carry a `:focus-visible` ring so keyboard navigation across the atlas is visible.
- **Performance-conscious map:** The SVG map avoids React re-renders during drag by mutating the transform through refs, coalesces wheel zoom with `requestAnimationFrame`, lazy-loads topology, and gates rich effects on device capability.
- **Progressive visual system:** The interface uses a custom atmospheric design language in `src/styles.css`, but it is deliberately constrained: charts are SVG, cards are virtualized, heavy effects are tiered, and low-power devices receive cheaper rendering paths.

## Performance Targets

Terraclima is tuned for the kind of hardware people actually use while browsing research-heavy interfaces:

- **Surface Pro 5, 8 GB RAM:** Low-power mode disables expensive map blur, marker pulse, hover lifts, deep shadows, and unnecessary backdrop filters. Card rendering uses virtualization plus `content-visibility` so offscreen work does not punish scrolling.
- **iPhone 13 Pro Max:** The map height uses dynamic viewport units and a smaller mobile minimum, compare columns scroll horizontally instead of collapsing into unreadable slivers, and interaction targets remain touch-friendly.
- **General browser efficiency:** Search uses precomputed indexes; filtering is deferred with `useDeferredValue`; atlas topology is code-split; SVG paint IDs are unique per chart instance; unit and geospatial helpers cache derived work where appropriate.

## Data and Provenance

Terraclima combines structured editorial research with public climate and geospatial references:

- Climate normals, usually 1991-2020 where available: NOAA, ECCC / Climate Atlas of Canada, SMN, and adjacent public station products.
- Spatial and environmental baselines: PRISM, WorldClim, SoilGrids, USGS, INEGI, INECC, FEMA, Atlas Nacional de Riesgos, CMIP6, and NASA NEX-GDDP where applicable.
- Earth-observation context: Sentinel-2 and Landsat anchor the **spectral** screening list (NDVI-class indices, thermal contrast, moisture, snow, burn history). A separate **relief texture** score summarizes where public topography plus atlas archetypes imply lidar would add the most interpretive value. The app does not claim direct scene or lidar ingestion.

Every place carries citations and confidence notes. Derived scores are intentionally transparent and conservative; where the corpus is screening-grade rather than measurement-grade, the UI says so.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS v4 plus a custom CSS design system
- Framer Motion for selected overlays and transitions
- `d3-geo`, `topojson-client`, `world-atlas`, and `us-atlas` for cartography
- `@tanstack/react-virtual` for scalable card rendering
- Vitest for unit tests on pure logic
- ESLint v9 (flat config) with `typescript-eslint`, `react-hooks`, and `jsx-a11y`
- GitHub Actions for PR-time `quality:check` and `main`-push GitHub Pages deploys

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Quality Gate

Use the full check before publishing or reviewing a substantial change:

```bash
npm run quality:check
```

That runs:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:prose
npm run audit:corpus
npm run sanity
npm run test:corpus-gold
npm run build
```

The same pipeline runs automatically on every pull request and non-`main` push via `.github/workflows/quality.yml`, so a green CI badge means the gate actually held.

Individual commands are useful while iterating:

```bash
npm run dev                # Vite dev server
npm run build              # TypeScript build check + Vite production build
npm run preview            # Preview production output
npm run typecheck          # tsc --noEmit (with noUnusedLocals/Parameters)
npm run lint               # ESLint over src/ and scripts/ (caps at 30 warnings)
npm run test               # Vitest — unit tests for pure logic in src/lib
npm run test:watch         # Vitest in watch mode
npm run test:prose         # Unit localization regression tests
npm run audit:corpus       # Authored prose, units, typography, and consistency audit
npm run sanity             # Structural corpus and geospatial sanity checks
npm run test:corpus-gold   # Ranking and geospatial snapshot guardrails
npm run generate:og        # Regenerate public/og-image.png (1200×630 social card)
```

## Human Review Guide

If you are reviewing this as an engineering portfolio, start here:

1. **Product thinking:** Open `src/App.tsx`, `src/components/PlaceDetail.tsx`, and `src/components/AtlasMap.tsx` to see how the app turns a large corpus into a navigable research product.
2. **Data modeling:** Read `src/types.ts`, then inspect a few entries in `src/data/places.*.ts`. The app is built around typed structured knowledge, not arbitrary blobs.
3. **Derived intelligence:** Review `src/lib/geospatial-analysis.ts`, `src/lib/scoring.ts`, and `src/lib/atlas-corpus-stats.ts` for explainable ranking and screening logic.
4. **Quality discipline:** Run `npm run quality:check`. The scripts are meant to make the corpus auditable, not just make TypeScript happy.
5. **Performance and accessibility:** Check `src/lib/device-profile.ts`, `src/components/VirtualPlaceGrid.tsx`, `src/hooks/use-focus-trap.ts`, and the low-power sections in `src/styles.css`.
6. **Test discipline:** `src/lib/__tests__/` for the unit-test layer, plus the corpus scripts under `scripts/`. CI in `.github/workflows/quality.yml` runs the full gate on every PR.

## Agentic Review Guide

For AI agents or automated reviewers, the safest review path is:

- Treat `src/types.ts` as the contract.
- Treat `scripts/sanity-check.ts` and `scripts/audit-corpus.ts` as executable invariants.
- Prefer adding validation before changing corpus shape.
- Do not invent climate facts. If a data point is not present or cited, keep derived language framed as screening or editorial context.
- Preserve URL behavior in `src/lib/app-url.ts` and modal focus behavior in `src/hooks/use-focus-trap.ts`.
- **Shipping:** When a change is user-visible or architectural, update `README.md` in the same work (features, layout breakpoints, keyboard shortcuts, new scripts). Commit with a clear message and push to `origin` so GitHub stays current.
- After edits, run `npm run quality:check`; for UI changes, also inspect the Explorer, a place profile, the compare overlay, and mobile-width layout.

## Project Layout

```text
src/
  components/                  React UI: atlas, cards, profile, compare, collections, learn mode
    charts/                    SVG chart primitives
    place-detail/              Reading nav and deep profile sections
    ExplorerFilterSheet.tsx    Mobile filter dialog + FAB trigger (ref: open / close)
    FootprintPanel.tsx         Atlas country / tier counts beside filters or in the sheet
    TempToggle.tsx             Shared °F / °C control (header + mobile menu)
  data/                        Places, collections, archetypes, glossary, field notes
  hooks/                       use-focus-trap, use-media-query (breakpoint for dock vs sheet), reading-spy
  lib/                         Scoring, units, geospatial analysis, URL state, corpus stats
    __tests__/                 Vitest unit tests for the pure logic in lib (units, scoring, best-months, similarity, app-url)
  types.ts                     Domain schema
scripts/                       Corpus audits, sanity checks, rank goldens, debug dumps, OG-image generator
.github/workflows/             quality.yml (PR-time gate) + deploy-pages.yml (main → GitHub Pages)
```

## What This Demonstrates

Terraclima is meant to show the kind of work I want to do: use AI-augmented engineering tools like Cursor to move quickly without surrendering taste, rigor, or accountability. The app combines product architecture, data modeling, visual design, performance engineering, accessibility, validation, and editorial judgment into one coherent system.

It is not a toy weather dashboard. It is a serious attempt to make complex environmental knowledge understandable, inspectable, and useful.
