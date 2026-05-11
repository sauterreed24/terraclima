# Terraclima

**The North American Microclimate Atlas.**

## Quick start

**Use it now:** open **[https://sauterreed24.github.io/terraclima/](https://sauterreed24.github.io/terraclima/)**. No signup, no install, works on phones and desktops.

What to try first:

1. Hover or tap any pin on the map for a one-line climate snapshot.
2. Open a place card — the profile reads like a field guide: opening story, livability breakdown, practical read, charts, risks, similar places, sources.
3. Pin places to your shortlist with the bookmark control (or press **B** while a profile is open). Pins live in your browser, no account required.
4. Sort by **Rank by**, narrow with **Filters**, then use **Compare** to put up to four places side by side.
5. Press **?** anywhere for the keyboard-shortcut overlay.

Built for new users: every screen-reader-only label, focus state, keyboard shortcut, touch-friendly tap target, and reduced-motion mode is wired in by default. Mobile users get a hamburger menu + bottom filter sheet; desktop users get a dock-style layout above 1024 px.

## Project links

- **Live app — works on any device, no signup, no install:** **[Open Terraclima](https://sauterreed24.github.io/terraclima/)** — served as a static SPA from GitHub Pages. Anyone with the URL can use the app, including on a phone. The site is rebuilt on every push to `main` by `.github/workflows/deploy-pages.yml`.
- **Source code:** [https://github.com/sauterreed24/terraclima](https://github.com/sauterreed24/terraclima)
- **Reviewer entry points:** [src/App.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/App.tsx), [src/types.ts](https://github.com/sauterreed24/terraclima/blob/main/src/types.ts), [src/components/AtlasMap.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/AtlasMap.tsx), [src/components/PlaceDetail.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/PlaceDetail.tsx), [src/lib/scoring.ts](https://github.com/sauterreed24/terraclima/blob/main/src/lib/scoring.ts), [scripts/sanity-check.ts](https://github.com/sauterreed24/terraclima/blob/main/scripts/sanity-check.ts)
- **Other deploy options:** [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sauterreed24/terraclima) (custom domain or pull-request previews).
- **Deployment workflows:** [.github/workflows/deploy-pages.yml](https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/deploy-pages.yml) (primary public site) · [.github/workflows/static-preview.yml](https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/static-preview.yml) (portable static artifact branch).

Terraclima is a research-grade climate atlas for exploring how terrain shapes lived weather across the United States, Canada, and Mexico. It treats each place as a physical system: rain shadows, sky islands, marine layers, chinook corridors, frost hollows, tropical highlands, fog belts, lake-effect snowbelts, orchard valleys, and wind gaps are read through the forces that create them.

The project sits between atlas, field guide, and decision tool. It turns a large authored corpus into an interface for relocation research, travel scouting, agricultural curiosity, climate adaptation, and environmental learning. The goal is not to summarize weather. The goal is to make place-specific climate logic visible, comparable, and inspectable enough that a map dot starts to feel like a landscape.

Terraclima is also built as an engineering portfolio: typed data, transparent scoring, deterministic prose helpers, accessible interaction patterns, performance discipline, source-aware climate writing, automated validation, and a visual system that makes complex environmental knowledge feel navigable instead of buried.

## Why This Project Exists

Most climate tools answer a narrow question: **what is the weather like?** Terraclima asks the more useful one: **why does this place feel different from the region around it?**

That difference matters. A coastal city can stay cool because offshore upwelling feeds a marine layer. A mountain valley can be colder than higher slopes because dense air pools overnight. Two towns at the same latitude can feel unrelated because one sits in a rain shadow, another faces a gap wind, and a third catches monsoon moisture.

Terraclima makes those patterns easier to see. It gives readers the vocabulary, context, and comparisons needed to understand why a landscape behaves the way it does.

## What It Does

- **Live Finder explorer:** An Albers-projected North America atlas with tiered pins, keyboard-accessible markers, climate previews, country filters, archetype filters, ranking controls, a scout brief for the current shortlist, a desktop relocation workbench, a one-tap current-view share link, and URL-shareable state. First-run sessions start with **Live-here fit** so the opening shortlist is relocation-oriented before readers branch into hidden gems or specialty climate lenses. The Live Finder layer adds presets for cool summers, mild winters, dry air, gardenability, low fire/smoke, four seasons, snow country, coastal buffering, and quiet small-town scouting, plus hard constraints for summer high, winter low, growability, fire risk, and overall risk. The scout brief explains the leading match, shortlist climate/risk spread, main caution, where top contenders win across living-priority signals, and can compare the leading places immediately. On narrow screens, navigation moves into a hamburger menu and filters move into a polished modal sheet. From 1024px up, the filter dock stays sticky beside the explorer.
- **Climate Trips:** A static climate-tourism funnel for traveling by microclimate: fog belts, rain shadows, sky islands, cold-air pools, orchard valleys, volcanic soils, Great Lakes snowbelts, Appalachian hollows, and places that feel climatically out of place. Trips pin curated climate themes back onto the Explorer map and can compare the top stops without adding booking or inventory data.
- **Phone-safe map interaction:** Touch users land in direct map mode by default: one-finger drag pans the atlas, pinch zooms, plus/minus and Fit remain available, clusters stay tappable, and dense pins visually spread with leader lines back to their exact locations. Tapping **Scroll page** gives control back to browser scrolling; **Use map** re-enters direct map interaction.
- **Place profiles:** Long-form field profiles for each microclimate, including an opening story, responsive Wikimedia hero media where curated, scannable at-a-glance facts, practical scouting cards, live-here fit reasons/cautions, seasonal charts, local contrasts, geospatial screening, soils, growability, risks, climate-change notes, similar places, settlement anchors, things to do, citations, and confidence notes.
- **Climate tourism read:** Each profile derives a compact scouting itinerary, visit window, growability read, habitat cues, static lodging search cues, risk screen, and three transparent scores: tourism appeal, climate-oriented "Would I live here?", and a climate/land signal.
- **Practical read:** Every profile turns the same typed fields into plain-language cards for what the ground can grow, how to read terrain, homes and land tradeoffs, and nearby ways to test the microclimate in person before the longer dossier.
- **Ranking lenses:** Sort by live-here fit, hidden gems, coolest summers, mildest winters, shoulder seasons, growability, low fire risk, diurnal sleep climate, geospatial signal, monsoon drama, wet-forest refuges, Mediterranean-like conditions, and more.
- **Comparison workflow:** Compare up to four places side by side with a quick highlight strip, climate ribbons, derived scores, responsive columns, and focus-managed modal behavior.
- **Collections and learning mode:** Curated bundles and a glossary connect mechanisms such as lapse rate, cold-air pooling, orographic lift, marine layer, foehn winds, thermal belts, and karst hydrology to real places.
- **Static lodging and investment caveats:** Lodging cues are static style/search prompts, not reservation inventory or paid placement. The investment lens is a climate-and-land screening signal, not financial advice, not a valuation, not a parcel recommendation, and not a recommendation to buy.
- **Unit-aware prose:** The corpus is authored in metric climate language while the interface localizes temperatures, ranges, deltas, precipitation, snowfall, elevation, wind speed, and distance for the active unit system.
- **Keyboard shortcuts:** `E`, `T`, `C`, and `L` switch views; `/` opens Explorer search; `F` opens mobile filters; `R` picks a random place from the current ranked set; `B` pins / unpins the currently open place to your shortlist; `Esc` closes the active overlay; `?` opens shortcut help.
- **Persistent shortlist:** Pin any place to your local shortlist with the bookmark control on cards or in the place profile header. The Explorer hero exposes a quick-jump rail for pinned places. Pins persist across sessions in `localStorage` — no account required.
- **Recently viewed rail:** The Explorer hero remembers the last ten place profiles you opened on this device so you can resume scouting without losing context.
- **Print-friendly profiles:** Open a place profile and choose your browser's Print to get a paperboard-ready brief (atlas chrome, controls, and overlays are hidden by the print stylesheet).
- **Reading progress:** Place profiles show a thin progress bar at the top of the panel and a back-to-top button after deep scrolling.
- **Livability lens v2:** The hero "Livability blend" score now uses a bidirectional thermal-comfort plateau (humidity-aware, with diurnal recovery credit), a tail-risk-aware hazard cushion (60% mean-of-9 + 40% max-of-9), and a U-shaped precipitation moderation curve. Per-component breakdowns appear inside every place profile so you can see why a place ranked where it did. See [`src/lib/livability-score.ts`](src/lib/livability-score.ts).

## Public Release Posture

Terraclima is free, public, and quality-first. The current priority is making the atlas fast to open, easy to share, trustworthy to inspect, and stable on phones and desktops.

- **No signup wall:** the live app opens directly into the atlas.
- **Open atlas surface:** rankings, profile depth, citations, confidence notes, and risk caveats are the product surface.
- **Shareable scouting state:** Explorer exposes a copy-current-view control so filtered, ranked, and place-specific atlas states can move cleanly between devices or reviewers.
- **One canonical URL:** `https://sauterreed24.github.io/terraclima/` is the public entry point used by metadata, robots, sitemap, and README links.
- **Regression discipline:** URL parsing, metadata, ranking, corpus shape, prose localization, and production builds are all guarded by `npm run quality:check`.

## Climate Intelligence

Terraclima combines editorial research with deterministic analysis. The app does not claim live satellite feeds, parcel-level forecasts, or lidar ingestion. It is explicit about what it knows, what it infers, and where a score should be treated as screening-grade context.

- **Terrain and exposure:** Elevation, relief, slope context, coastal influence, mountain barriers, valley geometry, and regional position inform the atlas narrative.
- **Climate normals:** Monthly temperature, precipitation, snowfall, seasonality, diurnal range, and regional climate class anchor each profile.
- **Risk and resilience:** Fire, heat, drought, flood, humidity, wind, snow, water stress, and long-term climate pressure are framed as decision signals, not guarantees.
- **Live-here scoring:** `src/lib/live-fit.ts` deterministically blends comfort, resilience, hazards, growability, hidden-gem signal, selected presets, and user constraints into a match score with human-readable reasons and cautions. It does not use live feeds, parcel appraisal, insurance advice, or medical heat-stress modeling.
- **Geospatial screening:** Deterministic scores explain where remote-sensing indices, thermal contrast, snow cover, moisture signals, burn history, or relief texture would likely add interpretive value.
- **Local contrasts:** Profiles emphasize nearby differences, because microclimate only becomes meaningful when compared against the surrounding landscape.

## Engineering Highlights

- **Typed climate schema:** `src/types.ts` models climate normals, soils, growability, hazards, citations, field notes, local contrasts, deep profile sections, and derived geospatial context.
- **Explainable scoring:** `src/lib/scoring.ts`, `src/lib/geospatial-analysis.ts`, and `src/lib/atlas-corpus-stats.ts` keep rankings and derived scores transparent, deterministic, and testable.
- **Shortlist synthesis:** `src/lib/explorer-scout-brief.ts` turns the active Explorer ranking into a deterministic field brief: best current match, leader rationale, climate/risk spread, dominant microclimate family, and compare-ready leader IDs.
- **Practical corpus synthesis:** `src/lib/practical-read.ts` turns existing typed fields into stable, non-market user guidance for agriculture, spatial analysis, homes and land, activities, settlements, and nearby contrasts.
- **Climate tourism synthesis:** `src/lib/climate-tourism.ts` derives trip windows, scouting itineraries, static lodging cues, habitat reads, and caveated tourism / climate-land scores from the typed corpus, with cached per-place profiles for repeated UI reads.
- **Validation built into the project:** `scripts/sanity-check.ts`, `scripts/audit-corpus.ts`, `scripts/test-prose.ts`, and `scripts/corpus-rank-gold.ts` catch malformed data, unit/prose regressions, corpus drift, and rank instability.
- **Unit tests for pure logic:** `src/lib/__tests__/` covers units, scoring, best-month windows, similarity, and URL state with Vitest.
- **Accessibility as architecture:** Dialogs use focus traps and clear escape behavior. The filtered result count has a screen-reader-only live region. SVG map markers, cluster markers, and map controls expose visible focus states. Mobile filter/search behavior avoids duplicate IDs and unpredictable modal stacks.
- **Performance-conscious map:** The SVG atlas avoids React re-renders during drag, coalesces wheel zoom with `requestAnimationFrame`, lazy-loads topology, clusters dense mobile pins in screen space, and gates expensive effects based on device capability.
- **Scalable card rendering:** The place grid uses virtualization, realistic mobile row estimates, scroll-position-safe dynamic measurement, and `content-visibility` so a large corpus stays responsive on modest hardware.
- **Cold-route bundle discipline:** Explorer stays on the eager path; Climate Trips, Collections, Learn, Place Detail, and Compare load on demand so the first atlas screen parses less JavaScript.
- **CI-backed quality gate:** `.github/workflows/quality.yml` runs the full `npm run quality:check` pipeline on pull requests and non-`main` pushes.

## Performance Targets

Terraclima is tuned for real devices, not just high-end developer machines.

- **Surface Pro 5, 8 GB RAM:** Low-power mode disables expensive blur, marker pulse, hover lifts, deep shadows, and unnecessary backdrop filters. The map and card grid are structured to avoid punishing scroll and pan interactions.
- **Phones and coarse-pointer devices:** The map uses stable small-viewport sizing, defaults to direct one-finger pan plus pinch zoom, keeps an explicit **Scroll page** escape, clusters dense low-zoom pins, visually spreads crowded pins with leader lines, and keeps 44px-plus touch targets reachable. Comparison columns still scroll horizontally instead of collapsing into unreadable fragments.
- **General browser efficiency:** Search builds full-prose text lazily and warms it during idle time. Filtering is deferred with `useDeferredValue`. Atlas topology and cold views are code-split, with a post-build budget check to keep cold chunks out of initial `modulepreload`s. SVG paint IDs are unique per chart instance. Unit, geospatial, corpus-rank, best-month, and climate-tourism helpers cache derived work where useful.

## Data and Provenance

Terraclima uses structured editorial research supported by public climate and geospatial references:

- **Climate normals:** Usually 1991-2020 where available, drawing from NOAA, ECCC / Climate Atlas of Canada, SMN, and adjacent public station products.
- **Spatial and environmental baselines:** PRISM, WorldClim, SoilGrids, USGS, INEGI, INECC, FEMA, Atlas Nacional de Riesgos, CMIP6, and NASA NEX-GDDP where applicable.
- **Earth-observation context:** Sentinel-2 and Landsat anchor the spectral screening list, including NDVI-class indices, thermal contrast, moisture, snow, and burn-history signals.
- **Relief texture:** A separate screening score highlights where public topography and atlas archetypes suggest finer terrain data would materially improve interpretation.

Every place carries citations and confidence notes. Derived scores are deliberately conservative. Where the corpus is interpretive rather than measurement-grade, the interface says so.

The current corpus covers **226** North American places, including **8 Tier A flagships** and **54 Tier B deeper relocation/travel candidates**. Tier A/B entries are sanity-checked for confidence notes, at least two URL-backed citations, and deep-section coverage; the latest pass added Port Orford / Cape Blanco, Klamath Falls / Upper Klamath Basin, Los Alamos / Pajarito Plateau, Lander / Sinks Canyon, Atlin Lake, Fernie / Elk Valley, Valle de Bravo, and Zacatlan de las Manzanas, while promoting or deepening Nelson, Patzcuaro, Todos Santos, Tapalpa, and Mazamitla.

## Stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 plus a custom CSS design system
- Framer Motion for selected overlays and transitions
- `d3-geo`, `topojson-client`, `world-atlas`, and `us-atlas` for cartography
- `@tanstack/react-virtual` for scalable card rendering
- Vitest + Testing Library for unit / light DOM smoke tests
- ESLint v9 with `typescript-eslint`, `react-hooks`, and `jsx-a11y`; `npm run lint` uses **`--max-warnings 0`** so warnings fail the quality gate.
- GitHub Actions for PR-time quality checks and GitHub Pages deployment

## Deployment and Discoverability

Terraclima is a static SPA with one public URL, one optional custom-domain path, and one portable build artifact path.

### Primary — GitHub Pages

Every push to `main` triggers `.github/workflows/deploy-pages.yml`, which builds the SPA with `VITE_BASE_PATH=/terraclima/` and publishes it to GitHub Pages.

- **Live URL:** [`https://sauterreed24.github.io/terraclima/`](https://sauterreed24.github.io/terraclima/)
- The link opens directly into the Explorer experience: one-finger drag pans the map on phones, pinch zooms, and **Scroll page** lets normal page scrolling pass through the map until **Use map** is tapped again.
- The same URL is used by `index.html`, Open Graph, Twitter cards, `public/robots.txt`, `public/sitemap.xml`, and `public/404.html`.

To rebuild manually: trigger the **Deploy GitHub Pages** workflow from the Actions tab, or push any commit to `main`.

### Vercel (optional — custom domain or pull-request previews)

1. Click [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sauterreed24/terraclima).
2. Sign in with GitHub. **Tip:** if Vercel drops you on your dashboard, paste `https://github.com/sauterreed24/terraclima` into the "Import Git Repository" box at [vercel.com/new](https://vercel.com/new) — don't pick an unrelated existing project.
3. Vercel auto-detects Vite, runs `npm run build`, and serves `dist/` over its global CDN. `vercel.json` adds the SPA fallback rewrite.
4. Share the resulting `https://terraclima-<username>.vercel.app/` URL or attach a custom domain.

### Static artifact branch

`.github/workflows/static-preview.yml` also builds with `VITE_BASE_PATH=./` and force-pushes `dist/` to the orphan `static-preview` branch. Treat that branch as a portable build artifact for reviewers or emergency mirrors, not the README's primary public URL.

### Build modes

- `npm run build` — default `/` base. Suitable for Vercel, Netlify, any root-mounted host.
- `npm run build:static` — `./` (relative) base. Used by the static-preview workflow; portable across hosts.
- `npm run build:pages` — `/terraclima/` base. Used by the GitHub Pages workflow.

### Canonical URL vs preview (sharing + SEO)

There are **multiple valid ways** to host this static SPA. They ship the **same JavaScript bundle**, but **search engines and scrapers** follow the canonical URL advertised in metadata:

| Deploy | Typical role |
|--------|----------------|
| **GitHub Pages** (`https://sauterreed24.github.io/terraclima/`) | **Canonical public app** in [`index.html`](index.html), [`public/robots.txt`](public/robots.txt), [`public/sitemap.xml`](public/sitemap.xml), Open Graph, and Twitter metadata |
| **Vercel** | Custom domain or PR previews |
| **`static-preview` branch** | Relative-path build artifact that can be mirrored if needed |

If the **primary public URL** changes, update canonical, OG, robots, and sitemap **together** (see **Hardening** below).

### Hardening shipped in this repo

- `index.html` carries canonical, Open Graph, Twitter card, app-title, install, and crawler metadata.
- `src/lib/site-metadata.ts` is the source of truth for public app metadata used by runtime document titles and metadata validation.
- `scripts/check-site-metadata.ts` keeps `index.html`, manifest, robots, sitemap, and 404 metadata aligned.
- `public/site.webmanifest` supports add-to-home-screen behavior with the existing SVG icon.
- `public/robots.txt` and `public/sitemap.xml` point crawlers at the canonical deploy.
- `public/.nojekyll` keeps Pages from stripping files starting with `_`.
- `public/404.html` redirects unknown Pages paths back to the SPA root (Vercel uses `vercel.json` for the same fallback behavior).
- `vercel.json` adds an SPA fallback rewrite for Vercel.
- The `static-preview` workflow publishes `dist/` with first-party git commands under the repository token instead of handing a write-scoped token to a third-party deploy action.

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
npm run check:performance-budget
```

The same pipeline runs automatically on every **pull request** and on **pushes to non-`main` branches** via [`.github/workflows/quality.yml`](.github/workflows/quality.yml). Pushes to **`main`** also run the full gate via [`.github/workflows/quality-main.yml`](.github/workflows/quality-main.yml) (so direct commits cannot skip it).

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
npm run check:metadata     # Static shell / discovery metadata consistency
npm run check:performance-budget # Post-build cold-route modulepreload guard
npm run audit:corpus       # Corpus prose, units, typography, and consistency audit
npm run sanity             # Structural corpus and geospatial sanity checks
npm run test:corpus-gold   # Ranking and geospatial snapshot guardrails
npm run generate:og        # Regenerate public/og-image.png
```

### Manual QA — desktop and phone (after UI or map changes)

CI cannot exercise **touch** or real device GPUs. After anything that affects layout, the map, nav, or overlays, spot-check in a browser (or DevTools device mode):

| Check | Phone / narrow | Desktop / wide |
|-------|----------------|----------------|
| **Primary nav** | Hamburger menu (under ~560px width); dialog closes; focus sensible | Explorer / Trips / Collections / Learn in header bar |
| **Explorer filters** | Bottom “Filters & rank” sheet; **`F`** opens it | Filter **dock** beside explorer (≥1024px) |
| **Scout brief** | Brief stacks cleanly; Compare leaders opens the compare modal without clipping | Brief sits between rank strip and livability lens; leader and metrics are readable |
| **Climate Trips** | Trips route loads, trip cards fit, Compare top stops opens compare | Trip pinning returns to Explorer; opening a trip profile works |
| **Map** | One-finger pan and pinch by default; **Scroll page** exits to browser scrolling; **Use map** re-enters map control | Wheel zoom, drag pan, keyboard controls, pin opens detail |
| **Place + compare** | Detail drawer scrolls; compare readable | Same; keyboard shortcuts (`?` overlay) |

Try widths near **375px**, **768px**, **1024px**, and full desktop. Always run `npm run quality:check` first.

## Human Review Guide

For a portfolio review, start here:

1. **Use the atlas first:** open Explorer, pick a pin or card, then read a profile from opening story to scores and sources. The app is meant to feel like a field guide with instrumentation, not a weather table.
2. **Product architecture:** open `src/App.tsx`, `src/components/PlaceDetail.tsx`, `src/components/ClimateTripsView.tsx`, and `src/components/AtlasMap.tsx` to see how the corpus becomes a navigable research product.
3. **Data modeling:** read `src/types.ts`, then inspect entries in `src/data/places.*.ts`. The app is built around structured knowledge, not arbitrary content blobs.
4. **Derived intelligence:** review `src/lib/place-story.ts`, `src/lib/practical-read.ts`, `src/lib/climate-tourism.ts`, `src/lib/geospatial-analysis.ts`, `src/lib/scoring.ts`, and `src/lib/atlas-corpus-stats.ts` for deterministic narrative, routing, ranking, and screening logic.
5. **Quality discipline:** run `npm run quality:check`. The scripts make the corpus auditable, not merely type-safe.
6. **Performance and accessibility:** check `src/lib/device-profile.ts`, `src/components/AtlasMap.tsx`, `src/lib/atlas-map-cluster.ts`, `src/components/VirtualPlaceGrid.tsx`, `src/components/ClimateTripsView.tsx`, `src/hooks/use-focus-trap.ts`, and the low-power sections in `src/styles.css`.
7. **Test coverage:** review `src/lib/__tests__/`, `src/__tests__/`, and the validation scripts under `scripts/`.

## Agentic Review Guide

For AI agents or automated reviewers:

- **Runnable preview:** [Open Terraclima](https://sauterreed24.github.io/terraclima/) — the public GitHub Pages build. No auth, no install.
- **URL / compare invariants:** [docs/URL-INVARIANTS.md](docs/URL-INVARIANTS.md) (see also `src/lib/app-url.ts` tests and `COMPARE_LIMIT`).
- **Improvement context:** [docs/IMPROVEMENT-CONTEXT.md](docs/IMPROVEMENT-CONTEXT.md) reconciles external research notes with the actual Vite/React atlas repo.
- Treat `src/types.ts` as the contract.
- Treat `scripts/sanity-check.ts` and `scripts/audit-corpus.ts` as executable invariants.
- Treat `src/lib/place-story.ts`, `src/lib/practical-read.ts`, `src/lib/climate-tourism.ts`, and `src/lib/place-at-a-glance.ts` as deterministic prose adapters over existing fields, not places to invent new climate facts.
- Prefer adding validation before changing corpus shape.
- Do not invent climate facts. If a data point is not present or cited, keep language framed as screening or editorial context.
- Preserve URL behavior in `src/lib/app-url.ts` and modal focus behavior in `src/hooks/use-focus-trap.ts`.
- Preserve phone map behavior: direct one-finger pan and pinch by default, **Scroll page** remains a clear exit to browser scrolling, **Use map** re-enters direct control, cluster tap-to-zoom still works, and visual pin offsets must keep leader lines back to exact anchors.
- When a change is user-visible or architectural, update `README.md` in the same work.
- After edits, run `npm run quality:check`. For UI changes, follow **Manual QA — desktop and phone** above (Explorer, Trips, filters, map touch mode, place detail, compare).

## Project Layout

```text
src/
  components/                  React UI: atlas, cards, profile, compare, collections, learn mode
    charts/                    SVG chart primitives
    place-detail/              Reading nav and deep profile sections
    ExplorerFilterSheet.tsx    Mobile filter dialog + FAB trigger
    ClimateTripsView.tsx       Trip-theme funnel and climate-tourism picks
    FootprintPanel.tsx         Atlas country / tier counts
    TempToggle.tsx             Shared °F / °C control
  data/                        Places, collections, archetypes, glossary, field notes
  hooks/                       Focus trap, media query, reading spy
  lib/                         Scoring, units, geospatial analysis, URL state, corpus stats,
                               map fit and map clustering helpers
    __tests__/                 Vitest tests (lib + ranking contracts)
  __tests__/                   Light DOM smoke tests (App shell; map stubbed)
  types.ts                     Domain schema
scripts/                       Corpus audits, sanity checks, rank goldens, debug dumps, OG-image generator
.github/workflows/             quality.yml, quality-main.yml, static-preview.yml, deploy-pages.yml
```

## What This Demonstrates

Terraclima shows how AI-accelerated development can still produce work with taste, structure, and accountability. The project combines product judgment, environmental research, data modeling, deterministic narrative synthesis, visual design, performance engineering, accessibility, validation, and editorial discipline into one coherent system.

It is not a toy weather dashboard. It is an attempt to make complex environmental knowledge legible: human enough to read with curiosity, structured enough for agents to inspect, and disciplined enough to keep its claims tied to evidence.
