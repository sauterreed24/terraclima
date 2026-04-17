# Terraclima — The North American Microclimate Atlas

A research-grade microclimate intelligence application for the USA, Canada, and Mexico. Terraclima is a field guide in software form: explore rain shadows, sky islands, cool-summer coasts, eternal-spring highlands, orchard valleys, chinook corridors, fog belts, fjord inlets, and frost hollows — with the topographic and atmospheric mechanisms that shape each place made explicit.

> "Alpine twilight — bright enough to read a chart in, quiet enough to look like a field guide."

## What it does

- **Explorer map.** Albers-projected atlas of North America with 130+ curated microclimate places, tier-graded markers, live climate tooltips, and archetype filtering.
- **Hidden-gem finder.** Ranks places by a small library of profiles (`hidden-gems`, `comfortable-year-round`, `climate-resilient`, `growability-leaning`, …).
- **Place detail.** Deep per-place brief: monthly climate ribbon, precipitation bars, microclimate fingerprint, comfort matrix, risk profile, local-contrast chart, climate-change delta, soils, growability, and curated citations.
- **Compare places.** Up to 4 places side-by-side across temp/precip/comfort/risk/resilience.
- **Collections.** Hand-assembled thematic bundles — "Continental Rain Shadows", "Pacific Fog-Belt Coasts", "Sky-Island Refuges", etc.
- **Learn mode.** Field-guide glossary: lapse rate, cold-air pooling, orographic lift, chinook foehn, marine layer, gap winds — with example places for each.
- **Units.** Fahrenheit-first with a live °C toggle. Distances in imperial or metric. Descriptive prose localizes Celsius ↔ Fahrenheit automatically (including ranges and deltas).

## Data

- Climate normals (1991–2020 where available): NOAA (USA) · ECCC / Climate Atlas of Canada · SMN (Mexico).
- Spatial baselines: PRISM, WorldClim downscaling.
- Soils: SoilGrids + regional soil-series references.
- Risk briefs: FEMA, USGS, INEGI, INECC, Atlas Nacional de Riesgos.
- Climate-change outlook: CMIP6 ensembles, NASA NEX-GDDP.

Every place ships with a citation list. Sparse or low-confidence data are labeled; this is designed to scale to hundreds of places while keeping provenance explicit.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4 + a custom design-system in `src/styles.css`
- Framer Motion for view transitions
- `d3-geo` + `topojson-client` for the atlas map
- `world-atlas` (countries 110m) + `us-atlas` (states 10m) for geography

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

### Performance posture

Terraclima is tuned to run comfortably on modest hardware (it's developed on a Surface Pro 5 / 8 GB). Specifically:

- Heavy panels (`PlaceDetail`, `CompareView`, `CollectionsView`, `LearnMode`) are lazy-loaded — the initial JS payload only contains the explorer, map, cards, and filter bar.
- `vite.config.ts` splits `world-atlas` / `us-atlas` / `d3-geo` / `topojson-client` / `framer-motion` into dedicated chunks so the main entry stays lean and the browser cache reuses them aggressively.
- A search index and annual-precipitation cache are precomputed once in `src/data/places.ts`, so filtering is O(n) substring checks per keystroke rather than per-place string concatenation.
- The filter state is wrapped in `useDeferredValue`, keeping search typing responsive while the list/map reconcile at lower priority.
- `PlaceCard` is a pure, memoized `<button>` with a CSS-only hover lift — no framer-motion runtime work per card.
- The atlas map already avoids React re-renders during drag (direct DOM transform mutation) and coalesces wheel-zoom into a single RAF per frame; hover state is kept local so hovering a marker does not re-render the app tree.

## Scripts

```bash
npm run dev         # start Vite dev server
npm run build       # type-check + production build
npm run preview     # preview the production build
npm run typecheck   # tsc --noEmit
npx tsx scripts/sanity-check.ts      # adversarial data validator
npx tsx scripts/test-prose-corpus.ts # prose unit-localizer test
```

## Project layout

```
src/
  components/        React components (AtlasMap, PlaceDetail, CompareView, …)
    charts/          SVG charts (ClimateRibbon, PrecipBars, RiskProfile, …)
  data/              Place, archetype, collection, and glossary data
  lib/               Units, scoring, filters
  types.ts           Place intelligence schema
scripts/             Validation + test scripts
```

## Philosophy

Most "climate" apps show you weather. Terraclima shows you the *mechanism*. Why does Ensenada stay cool while San Diego bakes? Why does Creel get snow while Chihuahua doesn't? Why is Haines cooler than Juneau but colder than Sitka? The answer is always topography + atmosphere — orographic lift, rain shadow, marine layer, inversions, chinook, gap winds — and this app makes those forces legible for every place in the corpus.
