# Terraclima

**The North American Microclimate Atlas.**

## Project links

- **Live app:** [https://sauterreed24.github.io/terraclima/](https://sauterreed24.github.io/terraclima/)
- **Source code:** [https://github.com/sauterreed24/terraclima](https://github.com/sauterreed24/terraclima)
- **Reviewer entry points:** [src/App.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/App.tsx), [src/types.ts](https://github.com/sauterreed24/terraclima/blob/main/src/types.ts), [src/components/AtlasMap.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/AtlasMap.tsx), [src/components/PlaceDetail.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/PlaceDetail.tsx), [src/lib/scoring.ts](https://github.com/sauterreed24/terraclima/blob/main/src/lib/scoring.ts), [scripts/sanity-check.ts](https://github.com/sauterreed24/terraclima/blob/main/scripts/sanity-check.ts)
- **Deployment workflow:** [https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/deploy-pages.yml](https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/deploy-pages.yml)

Terraclima is a research-grade climate atlas for exploring how terrain shapes lived weather across the United States, Canada, and Mexico. It treats each place as a physical system: rain shadows, sky islands, marine layers, chinook corridors, frost hollows, tropical highlands, fog belts, lake-effect snowbelts, orchard valleys, and wind gaps are explained through the forces that create them.

The project sits between atlas, field guide, and decision tool. It turns a large authored corpus into an interface for relocation research, travel scouting, agricultural curiosity, climate adaptation, and environmental learning. The goal is not to summarize weather. The goal is to make place-specific climate logic visible, comparable, and inspectable.

Terraclima is also built as an engineering portfolio: typed data, transparent scoring, accessible interaction patterns, performance discipline, source-aware climate writing, automated validation, and a visual system that makes complex environmental knowledge feel navigable instead of buried.

## Why This Project Exists

Most climate tools answer a narrow question: **what is the weather like?** Terraclima asks the more useful one: **why does this place feel different from the region around it?**

That difference matters. A coastal city can stay cool because offshore upwelling feeds a marine layer. A mountain valley can be colder than higher slopes because dense air pools overnight. Two towns at the same latitude can feel unrelated because one sits in a rain shadow, another faces a gap wind, and a third catches monsoon moisture.

Terraclima makes those patterns easier to see. It gives readers the vocabulary, context, and comparisons needed to understand why a landscape behaves the way it does.

## What It Does

- **Explorer map:** An Albers-projected North America atlas with tiered pins, keyboard-accessible markers, climate previews, country filters, archetype filters, ranking controls, and URL-shareable state. On narrow screens, navigation moves into a hamburger menu and filters move into a polished modal sheet. From 1024px up, the filter dock stays beside the explorer.
- **Place profiles:** Long-form dossiers for each microclimate, including seasonal charts, local contrasts, geospatial screening, soils, growability, risks, climate-change notes, similar places, citations, and confidence notes.
- **Ranking lenses:** Sort by hidden gems, coolest summers, mildest winters, shoulder seasons, growability, low fire risk, diurnal sleep climate, geospatial signal, monsoon drama, wet-forest refuges, Mediterranean-like conditions, and more.
- **Comparison workflow:** Compare up to four places side by side with climate ribbons, derived scores, responsive columns, and focus-managed modal behavior.
- **Collections and learning mode:** Curated bundles and a glossary connect mechanisms such as lapse rate, cold-air pooling, orographic lift, marine layer, foehn winds, thermal belts, and karst hydrology to real places.
- **Unit-aware prose:** The corpus is authored in metric climate language while the interface localizes temperatures, ranges, deltas, precipitation, snowfall, elevation, wind speed, and distance for the active unit system.
- **Keyboard shortcuts:** `E`, `C`, and `L` switch views; `/` opens Explorer search; `F` opens mobile filters; `R` picks a random place from the current ranked set; `Esc` closes the active overlay; `?` opens shortcut help.

## Climate Intelligence

Terraclima combines editorial research with deterministic analysis. The app does not claim live satellite feeds, parcel-level forecasts, or lidar ingestion. It is explicit about what it knows, what it infers, and where a score should be treated as screening-grade context.

- **Terrain and exposure:** Elevation, relief, slope context, coastal influence, mountain barriers, valley geometry, and regional position inform the atlas narrative.
- **Climate normals:** Monthly temperature, precipitation, snowfall, seasonality, diurnal range, and regional climate class anchor each profile.
- **Risk and resilience:** Fire, heat, drought, flood, humidity, wind, snow, water stress, and long-term climate pressure are framed as decision signals, not guarantees.
- **Geospatial screening:** Deterministic scores explain where remote-sensing indices, thermal contrast, snow cover, moisture signals, burn history, or relief texture would likely add interpretive value.
- **Local contrasts:** Profiles emphasize nearby differences, because microclimate only becomes meaningful when compared against the surrounding landscape.

## Engineering Highlights

- **Typed climate schema:** `src/types.ts` models climate normals, soils, growability, hazards, citations, field notes, local contrasts, deep profile sections, and derived geospatial context.
- **Explainable scoring:** `src/lib/scoring.ts`, `src/lib/geospatial-analysis.ts`, and `src/lib/atlas-corpus-stats.ts` keep rankings and derived scores transparent, deterministic, and testable.
- **Validation built into the project:** `scripts/sanity-check.ts`, `scripts/audit-corpus.ts`, `scripts/test-prose.ts`, and `scripts/corpus-rank-gold.ts` catch malformed data, unit/prose regressions, corpus drift, and rank instability.
- **Unit tests for pure logic:** `src/lib/__tests__/` covers units, scoring, best-month windows, similarity, and URL state with Vitest.
- **Accessibility as architecture:** Dialogs use focus traps and clear escape behavior. The filtered result count has a screen-reader-only live region. SVG map markers expose visible focus states. Mobile filter/search behavior avoids duplicate IDs and unpredictable modal stacks.
- **Performance-conscious map:** The SVG atlas avoids React re-renders during drag, coalesces wheel zoom with `requestAnimationFrame`, lazy-loads topology, and gates expensive effects based on device capability.
- **Scalable card rendering:** The place grid uses virtualization and `content-visibility` so a large corpus stays responsive on modest hardware.
- **CI-backed quality gate:** `.github/workflows/quality.yml` runs the full `npm run quality:check` pipeline on pull requests and non-`main` pushes.

## Performance Targets

Terraclima is tuned for real devices, not just high-end developer machines.

- **Surface Pro 5, 8 GB RAM:** Low-power mode disables expensive blur, marker pulse, hover lifts, deep shadows, and unnecessary backdrop filters. The map and card grid are structured to avoid punishing scroll and pan interactions.
- **iPhone 13 Pro Max:** The map uses dynamic viewport units, touch targets stay usable, and comparison columns scroll horizontally instead of collapsing into unreadable fragments.
- **General browser efficiency:** Search uses precomputed indexes. Filtering is deferred with `useDeferredValue`. Atlas topology is code-split. SVG paint IDs are unique per chart instance. Unit and geospatial helpers cache derived work where useful.

## Data and Provenance

Terraclima uses structured editorial research supported by public climate and geospatial references:

- **Climate normals:** Usually 1991-2020 where available, drawing from NOAA, ECCC / Climate Atlas of Canada, SMN, and adjacent public station products.
- **Spatial and environmental baselines:** PRISM, WorldClim, SoilGrids, USGS, INEGI, INECC, FEMA, Atlas Nacional de Riesgos, CMIP6, and NASA NEX-GDDP where applicable.
- **Earth-observation context:** Sentinel-2 and Landsat anchor the spectral screening list, including NDVI-class indices, thermal contrast, moisture, snow, and burn-history signals.
- **Relief texture:** A separate screening score highlights where public topography and atlas archetypes suggest finer terrain data would materially improve interpretation.

Every place carries citations and confidence notes. Derived scores are deliberately conservative. Where the corpus is interpretive rather than measurement-grade, the interface says so.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS v4 plus a custom CSS design system
- Framer Motion for selected overlays and transitions
- `d3-geo`, `topojson-client`, `world-atlas`, and `us-atlas` for cartography
- `@tanstack/react-virtual` for scalable card rendering
- Vitest for pure-logic tests
- ESLint v9 with `typescript-eslint`, `react-hooks`, and `jsx-a11y`
- GitHub Actions for PR-time quality checks and GitHub Pages deployment

## Deployment and Discoverability

Terraclima ships as a static GitHub Pages app at [https://sauterreed24.github.io/terraclima/](https://sauterreed24.github.io/terraclima/).

- `npm run build:pages` sets `VITE_BASE_PATH=/terraclima/` so Vite rewrites bundle and static-asset URLs for Project Pages.
- `index.html` carries canonical, Open Graph, Twitter card, app-title, install, and crawler metadata.
- `public/site.webmanifest` supports add-to-home-screen behavior with the existing SVG icon.
- `public/robots.txt` and `public/sitemap.xml` point crawlers at the canonical GitHub Pages deployment.

If the project moves to a custom domain, update the canonical URL, Open Graph URL/image URL, robots sitemap URL, and sitemap `<loc>` together.

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

The same pipeline runs automatically on every pull request and non-`main` push via `.github/workflows/quality.yml`.

Individual commands are useful while iterating:

```bash
npm run dev                # Vite dev server
npm run build              # TypeScript build check + Vite production build
npm run preview            # Preview production output
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint over src/ and scripts/
npm run test               # Vitest unit tests
npm run test:watch         # Vitest in watch mode
npm run test:prose         # Prose/unit localization regression tests
npm run audit:corpus       # Corpus prose, units, typography, and consistency audit
npm run sanity             # Structural corpus and geospatial sanity checks
npm run test:corpus-gold   # Ranking and geospatial snapshot guardrails
npm run generate:og        # Regenerate public/og-image.png
```

## Human Review Guide

For a portfolio review, start here:

1. **Product architecture:** Open `src/App.tsx`, `src/components/PlaceDetail.tsx`, and `src/components/AtlasMap.tsx` to see how the corpus becomes a navigable research product.
2. **Data modeling:** Read `src/types.ts`, then inspect entries in `src/data/places.*.ts`. The app is built around structured knowledge, not arbitrary content blobs.
3. **Derived intelligence:** Review `src/lib/geospatial-analysis.ts`, `src/lib/scoring.ts`, and `src/lib/atlas-corpus-stats.ts` for explainable ranking and screening logic.
4. **Quality discipline:** Run `npm run quality:check`. The scripts make the corpus auditable, not merely type-safe.
5. **Performance and accessibility:** Check `src/lib/device-profile.ts`, `src/components/VirtualPlaceGrid.tsx`, `src/hooks/use-focus-trap.ts`, and the low-power sections in `src/styles.css`.
6. **Test coverage:** Review `src/lib/__tests__/` and the validation scripts under `scripts/`.

## Agentic Review Guide

For AI agents or automated reviewers:

- Treat `src/types.ts` as the contract.
- Treat `scripts/sanity-check.ts` and `scripts/audit-corpus.ts` as executable invariants.
- Prefer adding validation before changing corpus shape.
- Do not invent climate facts. If a data point is not present or cited, keep language framed as screening or editorial context.
- Preserve URL behavior in `src/lib/app-url.ts` and modal focus behavior in `src/hooks/use-focus-trap.ts`.
- When a change is user-visible or architectural, update `README.md` in the same work.
- After edits, run `npm run quality:check`. For UI changes, also inspect Explorer, a place profile, the compare overlay, and mobile-width layout.

## Project Layout

```text
src/
  components/                  React UI: atlas, cards, profile, compare, collections, learn mode
    charts/                    SVG chart primitives
    place-detail/              Reading nav and deep profile sections
    ExplorerFilterSheet.tsx    Mobile filter dialog + FAB trigger
    FootprintPanel.tsx         Atlas country / tier counts
    TempToggle.tsx             Shared °F / °C control
  data/                        Places, collections, archetypes, glossary, field notes
  hooks/                       Focus trap, media query, reading spy
  lib/                         Scoring, units, geospatial analysis, URL state, corpus stats
    __tests__/                 Vitest tests for pure logic
  types.ts                     Domain schema
scripts/                       Corpus audits, sanity checks, rank goldens, debug dumps, OG-image generator
.github/workflows/             quality.yml and deploy-pages.yml
```

## What This Demonstrates

Terraclima shows how AI-accelerated development can still produce work with taste, structure, and accountability. The project combines product judgment, environmental research, data modeling, visual design, performance engineering, accessibility, validation, and editorial discipline into one coherent system.

It is not a toy weather dashboard. It is an attempt to make complex environmental knowledge understandable, inspectable, and useful.
