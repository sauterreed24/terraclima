# Terraclima

**The North American Microclimate Atlas.**

Open it: **[https://sauterreed24.github.io/terraclima/](https://sauterreed24.github.io/terraclima/)**. No signup. No install. Works on a phone or a laptop.

Terraclima helps you understand **how a place actually feels to live in or visit** — and *why* — by reading terrain, seasonality, risk, and local contrast across the United States, Canada, and Mexico. It is part atlas, part field guide, and part decision notebook for people comparing climates before they move, travel, plant, or dig deeper into a landscape.

## Who it’s for

| If you are… | You can use Terraclima to… |
|-------------|----------------------------|
| **Thinking about relocating** | Shortlist towns by cool summers, mild winters, dry air, gardenability, low fire/smoke, coastal buffering, or overall comfort — then pin finalists, set a home base, and compare “vs home” deltas instead of raw averages. |
| **Scouting a trip by climate** | Follow Climate Trips into fog belts, rain shadows, sky islands, orchard valleys, snowbelts, or places that feel climatically out of place — then open stop profiles for visit windows and field-check notes. |
| **Curious about a specific landscape** | Open a place profile and read the mechanism: rain shadow, marine layer, cold-air pool, chinook corridor, sky island, frost hollow. The point is the *why*, not a forecast. |
| **Comparing a few serious finalists** | Bookmark places, run Compare (up to four), export a Markdown scout plan or CSV / GeoJSON / ICS, and share a filtered atlas view with a partner or reviewer. |
| **Learning climate vocabulary** | Use Collections and Learn to connect terms like orographic lift, foehn winds, or thermal belts to real places on the map. |

It is free and public. Claims stay screening-grade and source-aware: citations and confidence notes travel with every place, and the app is explicit about what it knows versus what it infers.

## Quick start

1. Open the [live atlas](https://sauterreed24.github.io/terraclima/). First sessions land on **Most unique** so you see distinctive microclimates right away — or try **Most comfortable**, a Live Finder preset, or **Surprise me** / **R**.
2. Tap or hover a map pin for a compact peek (name, archetype, one climate line). Open the place for the full field-guide profile: archetype, **Why this climate is different here**, seasons, risks, and practical scouting cards.
3. When you get serious, set a **home base** (**H** or the dossier control) so cards and Compare read as deltas against *your* climate. Pin keepers with the bookmark (**B**).
4. Narrow with Live Finder / Fit Finder filters, Collections, or Climate Trips. Use **Compare** and the scout brief when you need a decision pass.
5. Press **?** for keyboard shortcuts. On phones, the map pans with one finger; tap **Scroll page** when you want the page to scroll normally again.

Mobile gets a hamburger menu and bottom filter sheet; from about 1024px up, filters sit in a sticky dock beside the explorer. Accessibility, reduced motion, and touch targets are built in — not bolted on.

## Project links

- **Live app:** **[Open Terraclima](https://sauterreed24.github.io/terraclima/)** — static SPA on GitHub Pages; rebuilt on every push to `main` by `.github/workflows/deploy-pages.yml`.
- **Source:** [https://github.com/sauterreed24/terraclima](https://github.com/sauterreed24/terraclima)
- **Reviewer entry points:** [App.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/App.tsx), [types.ts](https://github.com/sauterreed24/terraclima/blob/main/src/types.ts), [AtlasMap.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/AtlasMap.tsx), [atlas-map-fit.ts](https://github.com/sauterreed24/terraclima/blob/main/src/lib/atlas-map-fit.ts), [atlas-map-zoom.ts](https://github.com/sauterreed24/terraclima/blob/main/src/lib/atlas-map-zoom.ts), [PlaceDetail.tsx](https://github.com/sauterreed24/terraclima/blob/main/src/components/PlaceDetail.tsx), [scoring.ts](https://github.com/sauterreed24/terraclima/blob/main/src/lib/scoring.ts), [sanity-check.ts](https://github.com/sauterreed24/terraclima/blob/main/scripts/sanity-check.ts)
- **Optional deploy:** [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sauterreed24/terraclima) for a custom domain or PR previews.
- **Workflows:** [deploy-pages.yml](https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/deploy-pages.yml) · [static-preview.yml](https://github.com/sauterreed24/terraclima/blob/main/.github/workflows/static-preview.yml)

## Why this exists

Most climate tools answer: **what is the weather like?** Terraclima asks the more useful question: **why does this place feel different from the country around it?**

That gap is where real decisions live. A coastal city can stay cool because offshore upwelling feeds a marine layer. A mountain valley can be colder than higher slopes because dense air pools overnight. Two towns at the same latitude can feel unrelated because one sits in a rain shadow, another faces a gap wind, and a third catches monsoon moisture.

Terraclima makes those patterns visible, comparable, and inspectable — so a map pin starts to feel like a landscape you can reason about, not a forecast tile.

It is also an engineering portfolio piece: typed data, transparent scoring, deterministic prose, accessibility, performance discipline, and automated validation so the knowledge stays navigable instead of buried.

## What you can do

### Find places that match how you want to live

The **Live Finder** explorer is an Albers-projected North America atlas with tiered pins, climate previews, country and archetype filters, ranking lenses, a scout brief for the current shortlist, and shareable URL state. Start from discovery (**Most unique**), then branch into live-here fit, hidden gems, **Most comfortable**, or specialty lenses.

Presets cover cool summers, mild winters, dry air, gardenability, low fire/smoke, four seasons, snow country, coastal buffering, quiet small-town scouting, and a Mexico / Southwest dry-highland path. Hard constraints let you cap summer highs, winter lows, growability, fire risk, and overall risk. The scout brief names the leading match, climate/risk spread, main caution, where contenders win, a scout-day order, and a decision matrix (fit, comfort, easy months, risk, land/garden, first caveat).

On a phone, navigation folds into a hamburger and filters into a bottom sheet; on a wide screen the filter dock stays beside the map.

### Travel by microclimate

**Climate Trips** is a climate-tourism funnel — fog belts, rain shadows, sky islands, cold-air pools, orchard valleys, volcanic soils, Great Lakes snowbelts, Appalachian hollows, and places that feel climatically out of place. Trips pin themes back onto the Explorer map and can compare top stops. Lodging cues are static search prompts, not bookings or paid placement.

### Read the map like a field sheet

- **On a phone:** one-finger drag pans, pinch zooms, clusters stay tappable, and crowded pins spread with leader lines back to exact locations. **Scroll page** / **Use map** lets you stop trapping the page when you need to scroll past the atlas — including on hybrid laptops with touch.
- **Framing that respects the UI:** Fit, selection, cluster zoom, and rotate/resize keep the landmass clear of docks and compact chrome. Selecting a pin from the map nudges just enough to keep it visible; opening a place from a link centers it. Hover tooltips and the cluster picker stay glued to the right spot after pan, zoom, or resize.
- **Keyboard:** Tab once into the map, then arrows walk pins *and* clusters; Home/End jump ends; `0` fits all; `=` / `-` zoom; arrows pan. Only one marker sits in the Tab order at a time.
- **What the colors mean:** pin fill = ranking climate driver, colored aura = feel / comfort signal, gold = current leaders. Under **Most comfortable** (`?r=most-comfortable`), the map key, readout, and hover line say that out loud so a dense ranking stays readable.

### Open a place and go deep

Each **place profile** is a long-form field guide: opening story, a photograph of the place, at-a-glance facts, practical scouting cards, live-here reasons and cautions, seasonal charts, local contrasts, geospatial screening, soils, growability, risks, climate-change notes, climate twins, settlements, things to do, citations, and confidence notes. The Overview leads with why the climate differs, nearby contrast, a short settlement history, and a season-by-season feel.

**Home base (“vs home”):** pin any corpus place as home from the dossier, **H**, or `?hb=`. Cards grow a compact delta strip; dossiers add a **Versus your home base** section; Compare diffs finalists against home (with **Add home**). Deltas use authored 1991–2020 normals; under a 2050 scenario, projected is compared to projected so timelines never mix. See [`src/lib/home-base.ts`](src/lib/home-base.ts).

**Climate twins:** every profile answers *where else feels like here across the year?* — warmth, seasonal shape, maritime↔continental swing, moisture amount and timing, air (humidity/sun/diurnal), and shared terrain mechanism. **"Twin, but —"** steers toward milder winters, warmer, cooler, drier, or lower risk without letting unrelated climates jump the queue. See [`src/lib/climate-analog.ts`](src/lib/climate-analog.ts).

**Practical + tourism reads:** plain-language cards for what the ground can grow, how to read terrain, homes and land tradeoffs, nearby field checks, visit windows, habitat cues, and caveated tourism / “would I live here?” / climate-land scores. The investment lens is a climate-and-land screen — not advice to buy, not a valuation, not a parcel pick.

### Rank, compare, remember, hand off

- **Ranking lenses:** live-here fit, hidden gems, coolest summers, mildest winters, shoulder seasons, growability, low fire risk, diurnal sleep climate, geospatial signal, monsoon drama, wet-forest refuges, Mediterranean-like conditions, and more.
- **Compare:** up to four places with a finalist verdict, scout sequence, comfort/livability rows, climate ribbons, and focus-managed modal behavior.
- **Shortlist:** bookmarks persist in your browser (`localStorage`). Export Markdown scout plans or JSON / CSV / GeoJSON / ICS from [`src/lib/shortlist-export.ts`](src/lib/shortlist-export.ts). Copy/share the current filtered view (`navigator.share` where available, clipboard otherwise).
- **Recently viewed:** last ten profiles on this device. **Print** a profile for a paper-ready brief. Profiles show reading progress and a back-to-top control on long dossiers.
- **Collections & Learn:** curated bundles and a glossary tying mechanisms (lapse rate, cold-air pooling, orographic lift, marine layer, foehn, thermal belts, karst) to real places.
- **Units:** corpus authored in metric; the UI localizes temperatures, precip, snow, elevation, wind, and distance for °F/°C (and related units).
- **Theme:** Auto / Light / Dark (Sonoran-courtyard light, moonlit dark); atlas map shell stays intentionally dark. Shareable via `?theme=` and remembered in `localStorage`.
- **Install / offline:** PWA shell precaches so the atlas opens offline after one visit (iOS Add to Home Screen, Android / desktop install icons).

### Livability, without pretending it’s simple

The hero **Livability blend** mixes felt thermal comfort, atmospheric ease (sky/fog, wind, humidity or arid strain, smoke/air, solar burden), a tail-risk-aware hazard cushion, precipitation moderation, resilience and growability, and lived friction (cost pressure, social fabric, daily services). Fog-belt coasts, hard deserts, humid warm nights, ferry-only outposts, and deep-cold Alaska sit in the same frame as “easy” places — with breakdowns and narratives so you can see *why* a rank landed where it did. See [`src/lib/livability-score.ts`](src/lib/livability-score.ts), [`src/lib/live-fit.ts`](src/lib/live-fit.ts), and [`src/lib/scoring.ts`](src/lib/scoring.ts).

### Keyboard shortcuts (high level)

`E` / `T` / `C` / `L` switch views · `/` or `Ctrl/⌘+K` search · `F` mobile filters · `R` surprise place · `B` pin · `H` home base · `Esc` close / clear search · `?` help · map arrows / Home / End / `0` / `=` / `-` as above.

## Public release posture

Free, public, quality-first: fast to open, easy to share, trustworthy to inspect, stable on phones and desktops.

- No signup wall — the atlas opens immediately.
- Rankings, profile depth, citations, confidence notes, and risk caveats *are* the product surface.
- Copy current view and `?p=` profile links so scouting state and dossiers move cleanly between devices.
- Canonical public URL: `https://sauterreed24.github.io/terraclima/`.
- `npm run quality:check` guards URL parsing, metadata, ranking, corpus shape, prose, °C and polish playtests, coverage, production builds, and gzip byte budgets. Atlas gesture/framing regressions are covered by Vitest atlas suites plus the optional local `npm run playtest:map` sweep. Broader route smoke lives in `npm run playtest:browser` (CI: browser-smoke workflow).

## Climate intelligence

Terraclima combines editorial research with deterministic analysis. It does **not** claim live satellite feeds, parcel-level forecasts, or lidar ingestion. It is explicit about what it knows, what it infers, and where a score is screening-grade context.

- **Terrain and exposure:** elevation, relief, slope context, coast, barriers, valley geometry, regional position.
- **Climate normals:** monthly temperature, precip, snowfall, seasonality, diurnal range, climate class.
- **Risk and resilience:** fire, heat, drought, flood, humidity, wind, snow, water stress, long-term pressure — as decision signals, not guarantees.
- **Live-here scoring:** [`src/lib/live-fit.ts`](src/lib/live-fit.ts) blends comfort, resilience, hazards, growability, hidden-gem signal, presets, and constraints into a match score with plain-language reasons and cautions. No live feeds, appraisal, insurance, or medical heat-stress modeling.
- **Geospatial screening:** where remote-sensing indices, thermal contrast, snow, moisture, burn history, or relief texture would add interpretive value.
- **Local contrasts:** nearby differences, because microclimate only means something against the surrounding landscape.

## Engineering highlights

- **Typed climate schema:** [`src/types.ts`](src/types.ts).
- **Explainable scoring:** [`scoring.ts`](src/lib/scoring.ts), [`geospatial-analysis.ts`](src/lib/geospatial-analysis.ts), [`atlas-corpus-stats.ts`](src/lib/atlas-corpus-stats.ts).
- **Verifiable Köppen class:** [`koppen.ts`](src/lib/koppen.ts) recomputes class from monthly normals and reconciles with the authored label; corpus gate errors on gross mislabels; Mediterranean-like ranking and analog family signals use the computed class.
- **Bioclimatic indices:** [`bioclim.ts`](src/lib/bioclim.ts) — De Martonne, Conrad, Thornthwaite PET, Selianinov, UNEP P/PET — with percentiles, citations, Compare rows, and corpus invariants.
- **Shortlist / practical / tourism synthesis:** [`explorer-scout-brief.ts`](src/lib/explorer-scout-brief.ts), [`decision-matrix.ts`](src/lib/decision-matrix.ts), [`practical-read.ts`](src/lib/practical-read.ts), [`climate-tourism.ts`](src/lib/climate-tourism.ts).
- **Validation:** [`sanity-check.ts`](scripts/sanity-check.ts), [`audit-corpus.ts`](scripts/audit-corpus.ts), [`test-prose.ts`](scripts/test-prose.ts), [`corpus-rank-gold.ts`](scripts/corpus-rank-gold.ts).
- **Tests:** `src/lib/__tests__/` (including atlas fit/zoom/cluster/keyboard/touch math) and `src/__tests__/AtlasMap.dom.test.tsx` for real map DOM behavior.
- **Accessibility:** focus traps on dialogs; live region for filtered counts; pins and clusters share one roving-tabindex; visible focus on map controls; `aria-pressed` / `aria-expanded` on toggles.
- **Map performance:** custom SVG Albers atlas (no Mapbox/Leaflet/tiles) — drag without React thrash, rAF-coalesced wheel zoom, lazy topology, mobile clustering, capability-gated effects. Framing/clamp/wheel handoff/scroll escape live in `atlas-map-fit.ts`, `atlas-map-zoom.ts`, `atlas-map-cluster.ts`, `atlas-map-keyboard.ts`, `atlas-map-touch-gesture.ts`; [`use-atlas-map-view.ts`](src/hooks/use-atlas-map-view.ts) commits clamped view state.
- **Cards & bundles:** virtualized place grid; cold routes (Trips, Collections, Learn, Detail, Compare) code-split; post-build performance budget.
- **CI:** [`.github/workflows/quality.yml`](.github/workflows/quality.yml) runs `npm run quality:check` on PRs and non-`main` pushes. [`.github/workflows/browser-smoke.yml`](.github/workflows/browser-smoke.yml) runs the Playwright browser suite against a local preview.

## Performance targets

Tuned for real devices, not only high-end laptops.

- **Surface Pro 5, 8 GB:** low-power mode drops expensive blur, pulse, hover lifts, deep shadows, and needless backdrop filters.
- **Phones and hybrid touch:** direct one-finger pan/pinch by default, **Scroll page** escape on coarse and hybrid pointers, clustering, leader lines, 44px+ targets, framing that clears chrome.
- **Browser efficiency:** lazy search index warm-up, deferred filtering, code-split topology/cold views, cached derived helpers where useful.

## Data and provenance

Structured editorial research backed by public climate and geospatial references. See [`docs/CLIMATE-DATA-V2.md`](docs/CLIMATE-DATA-V2.md) for formulas and pipeline commands.

- **Current climate (Now):** Daymet V4 R1 rolling **1996–2025** climatology (not a WMO standard normal). Official **1991–2020** WMO normals remain the same-source comparison/reference.
- **Station validation:** NOAA/GHCN-D & normals (USA), ECCC (Canada), SMN/WMO (Mexico) validate the grid — they do not silently replace it.
- **Fallback / QA:** ERA5-Land only for Daymet failure, offshore/land-mask exceptions, or independent QA. WorldClim 2.1 (1970–2000) is a historical comparator, not “current” provenance.
- **Projections:** NASA NEX-GDDP-CMIP6 ensemble deltas (median + P10/P90) when ingested; research/screening only.
- **Earth observation context:** Sentinel-2 / Landsat for spectral screening (NDVI-class, thermal, moisture, snow, burn history).
- **Relief texture:** screening where finer topography would materially improve interpretation.

Every place carries citations plus split `editorialConfidence` / `climateDataConfidence`. Derived scores stay conservative; interpretive content is labeled as such. The dossier Evidence disclosure separates measured normals, editorial context, deterministic calculations, projections, and screening scores, including a compact vs-1991–2020 receipt.

The corpus covers **226** North American places, including **8 Tier A flagships** and **54 Tier B** deeper relocation/travel candidates. Tier A/B entries require confidence notes, at least two URL-backed citations, and deep-section coverage. Every profile now carries a researched **Overview history** (settlement, land use, people) plus a longer **People and land** field-dossier chapter, so the first screen is a place you can actually get to know rather than a climate table with a caption.

## Stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 plus a custom CSS design system
- Framer Motion for selected overlays
- `d3-geo`, `topojson-client`, `world-atlas`, `us-atlas` for cartography
- `@tanstack/react-virtual` for the place grid
- Vitest + Testing Library
- ESLint v9 (`typescript-eslint`, `react-hooks`, `jsx-a11y`; `--max-warnings 0`)
- GitHub Actions for quality checks and Pages deploy

## Deployment and discoverability

Static SPA: one canonical public URL, optional custom domain, one portable artifact branch.

### Primary — GitHub Pages

Every push to `main` runs `.github/workflows/deploy-pages.yml` with `VITE_BASE_PATH=/terraclima/`.

- **Live URL:** [`https://sauterreed24.github.io/terraclima/`](https://sauterreed24.github.io/terraclima/)
- Opens straight into Explorer; phones get one-finger pan/pinch and **Scroll page** / **Use map** (also on hybrid fine+touch devices).
- Same URL is wired through `index.html`, Open Graph, Twitter cards, `public/robots.txt`, `public/sitemap.xml`, and `public/404.html`.

Rebuild: push to `main`, or re-run **Deploy GitHub Pages** from Actions.

### Vercel (optional)

1. [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sauterreed24/terraclima)
2. If Vercel lands you on the dashboard, paste `https://github.com/sauterreed24/terraclima` into Import at [vercel.com/new](https://vercel.com/new).
3. Vite auto-detect → `npm run build` → `dist/`; `vercel.json` provides the SPA fallback.
4. Use the `*.vercel.app` URL or attach a custom domain.

### Static artifact branch

`.github/workflows/static-preview.yml` builds with `VITE_BASE_PATH=./` and force-pushes `dist/` to orphan `static-preview` — a portable mirror artifact, not the canonical public URL.

### Build modes

| Command | Base | Use |
|---------|------|-----|
| `npm run build` | `/` | Vercel, Netlify, root hosts |
| `npm run build:static` | `./` | static-preview / portable |
| `npm run build:pages` | `/terraclima/` | GitHub Pages |

### Canonical URL vs preview

Same bundle, different hosts — crawlers follow the **canonical** metadata:

| Deploy | Role |
|--------|------|
| **GitHub Pages** | Canonical public app in `index.html`, robots, sitemap, OG/Twitter |
| **Vercel** | Custom domain or PR previews |
| **`static-preview`** | Relative-path artifact |

If the primary public URL changes, update canonical, OG, robots, and sitemap **together**.

### Hardening in-repo

- `index.html` — canonical, OG, Twitter, app-title, install, crawler metadata
- `src/lib/site-metadata.ts` — runtime metadata source of truth
- `scripts/check-site-metadata.ts` — keeps shell files aligned
- `public/site.webmanifest`, `robots.txt`, `sitemap.xml`, `.nojekyll`, `404.html`
- `vercel.json` SPA rewrite; static-preview uses first-party git under the repo token

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Quality gate

Before publishing or reviewing a substantial change:

```bash
npm run quality:check
```

That runs:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:prose
npm run test:celsius
npm run playtest:polish
npm run check:metadata
npm run audit:corpus
npm run sanity
npm run corpus:coverage
npm run test:corpus-gold
npm run build
npm run check:performance-budget
```

Same pipeline on every **PR** and **non-`main` push** via [`.github/workflows/quality.yml`](.github/workflows/quality.yml). Pushes to **`main`** also run [`.github/workflows/quality-main.yml`](.github/workflows/quality-main.yml).

Useful while iterating:

```bash
npm run dev                # Vite dev server
npm run build              # tsc + Vite production build
npm run preview            # Preview dist (default port 4173)
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint src/ + scripts/ (--max-warnings 0)
npm run test               # Vitest unit + light DOM tests
npm run test:watch         # Vitest watch
npm run test:prose         # Prose / unit localization regressions
npm run test:celsius       # °C localization playtest
npm run playtest:polish    # UI polish / copy consistency
npm run playtest:map       # Real-browser atlas sweep (local preview + playwright-core; not in quality:check)
npm run playtest:browser   # Product smoke: Explorer/map/dossier/Compare + axe (alias: test:browser)
npm run check:metadata     # Shell / discovery metadata
npm run check:performance-budget # Cold-route modulepreload + initial gzip byte budgets
npm run audit:corpus       # Corpus prose / units / consistency
npm run sanity             # Structural + geospatial sanity
npm run corpus:coverage    # Tier / section coverage report
npm run test:corpus-gold   # Ranking / geospatial goldens
npm run generate:og        # Regenerate public/og-image.png
npm run generate:icons     # Regenerate PWA PNG ladder
```

### Manual QA — desktop and phone (after UI or map changes)

CI cannot fully exercise touch or real-device GPUs. After layout, map, nav, or overlay changes, spot-check:

| Check | Phone / narrow | Desktop / wide |
|-------|----------------|----------------|
| **Nav** | Hamburger (under ~560px); closes cleanly | Explorer / Trips / Collections / Learn in the header |
| **Filters** | Bottom “Filters & rank” sheet; **`F`** | Sticky dock (≥1024px) |
| **Scout brief** | Stacks; Compare leaders opens without clipping | Readable between rank strip and livability lens |
| **Climate Trips** | Cards fit; Compare top stops works | Pinning returns to Explorer; profiles open |
| **Map gestures** | One-finger pan/pinch; **Scroll page** / **Use map** | Wheel zooms while room remains; at limits unused wheel scrolls the page; pan stays bounded |
| **Map framing** | Fit/selection clear of chrome; rotate width↔height without losing the landmass | Dock-aware frame; tooltip/picker stay on the pin |
| **Map keyboard** | Tab in; arrows walk pins **and** clusters; `0` / `=` / `-` | One Tab stop among markers |
| **Most comfortable** | `?r=most-comfortable` — key/readout/hover: fill = driver · aura = feel · gold = comfort leaders | Same on hover |
| **Place + compare** | Drawer scrolls; compare readable | Shortcuts via **`?`** |

Try ~**375px**, **768px**, **1024px**, and full desktop. Run `npm run quality:check` first.

**Dossier layout:** `scripts/playtest-visual.mjs` opens every place profile in headless Chromium and fails on horizontal overflow or clipped chart/header collisions. Needs `npm run preview` plus a local `playwright-core` install (see script header). Not in `quality:check`.

**Atlas map:** `npm run playtest:map` against a local preview. Centers on `/?r=most-comfortable`, sweeps **1440×900** → **360×800**, checks overflow and unified roving focus, exercises fit/pan/zoom keys, wheel, pin open, cluster activate, orientation flip, light/dark low-power, and hybrid scroll escape. Local-only base URL; off-host network aborted. Artifacts: `/opt/cursor/artifacts/playtest-map` or `TC_MAP_ARTIFACT_DIR`. Run after `AtlasMap`, `atlas-map-*`, map styles, or map keyboard/touch changes.

**Browser smoke:** `npm run playtest:browser` (or `test:browser`) after `npm run build` + `npm run preview`. Covers discovery load, empty-results recovery, dossier evidence disclosure, Compare under a scenario layer, map keyboard/touch samples, and axe serious/critical checks across light/dark and several viewports. Network is local-only. Artifacts: `TC_BROWSER_ARTIFACT_DIR` (default `/opt/cursor/artifacts/playtest-browser`). Install Chromium once with `npx playwright install chromium`. CI runs this in `browser-smoke.yml`; it is intentionally not part of `quality:check`.

## Human review guide

1. **Use it first:** Explorer → pin or card → read a profile end to end. It should feel like a field guide with instruments, not a weather table.
2. **Product shape:** `App.tsx`, `PlaceDetail.tsx`, `ClimateTripsView.tsx`, `AtlasMap.tsx`.
3. **Data model:** `types.ts`, then `src/data/places.*.ts`.
4. **Derived intelligence:** `place-story.ts`, `practical-read.ts`, `climate-tourism.ts`, `geospatial-analysis.ts`, `scoring.ts`, `atlas-corpus-stats.ts`.
5. **Quality:** `npm run quality:check`.
6. **Perf / a11y:** `device-profile.ts`, `AtlasMap.tsx`, `atlas-map-fit.ts`, `atlas-map-zoom.ts`, `atlas-map-cluster.ts`, `atlas-map-keyboard.ts`, `atlas-map-touch-gesture.ts`, `use-atlas-map-view.ts`, `VirtualPlaceGrid.tsx`, `use-focus-trap.ts`, low-power CSS.
7. **Tests:** `src/lib/__tests__/`, `src/__tests__/` (incl. `AtlasMap.dom.test.tsx`), `scripts/`.

## Agentic review guide

- **Live preview:** [Open Terraclima](https://sauterreed24.github.io/terraclima/) — no auth.
- **URL / compare:** [docs/URL-INVARIANTS.md](docs/URL-INVARIANTS.md), `src/lib/app-url.ts`, `COMPARE_LIMIT`.
- **Context:** [docs/IMPROVEMENT-CONTEXT.md](docs/IMPROVEMENT-CONTEXT.md).
- Treat `src/types.ts` as the contract; `sanity-check.ts` / `audit-corpus.ts` as executable invariants.
- Treat `place-story.ts`, `practical-read.ts`, `climate-tourism.ts`, `place-at-a-glance.ts` as adapters over existing fields — do not invent climate facts.
- Prefer validation before corpus shape changes; keep screening/editorial framing when data is missing.
- Preserve URL behavior (`app-url.ts`) and modal focus (`use-focus-trap.ts`).
- Preserve phone/hybrid map behavior: one-finger pan/pinch by default, **Scroll page** on coarse *and* hybrid pointers, clamped pan, wheel handoff at zoom limits, cluster zoom, leader lines to exact anchors, unified pin+cluster roving tabindex.
- Preserve chrome-aware framing (asymmetric safe areas; ensure-visible for map selection; live tooltip/picker anchors) and Most comfortable lens copy (fill = driver · aura = feel · gold = comfort leaders).
- Update `README.md` with user-visible or architectural changes.
- After edits: `npm run quality:check`. For UI: Manual QA above. For atlas map: also `npm run playtest:map` against local preview + playwright-core.

## Project layout

```text
src/
  components/                  React UI: atlas, cards, profile, compare, collections, learn
    AtlasMap.tsx               Custom SVG Albers North America atlas
    AtlasMapTooltip.tsx        Compact hover / focus peek (name, archetype, climate line)
    charts/                    SVG chart primitives
    chrome/                    TopBar / Footer / LogoMark / ShortcutsOverlay / ThemeToggle
    place-detail/              Per-section dossier + shared UI primitives
    ExplorerFilterSheet.tsx    Mobile filter dialog + FAB
    ClimateTripsView.tsx       Trip-theme funnel
    FootprintPanel.tsx         Country / tier counts
    TempToggle.tsx             °F / °C control
  data/                        Places, collections, archetypes, glossary, field notes
  hooks/                       Focus trap, media query, reading spy, atlas view commit
    use-atlas-map-view.ts      Clamped pan/zoom commit helpers
  lib/                         Scoring, units, geospatial, URL state, corpus stats,
                               theme, PWA, share, shortlist-export, lazy views
    atlas-map-fit.ts           Chrome-aware safe-frame fit + ensure-visible
    atlas-map-zoom.ts          Zoom, translation clamp, wheel handoff, resize view
    atlas-map-cluster.ts       Screen-space clustering + safeArea-aware cluster fit
    atlas-map-keyboard.ts      Unified pin+cluster roving helpers
    atlas-map-touch-gesture.ts Scroll page / Use map (coarse + hybrid)
    atlas-map-geometry.ts      Projection / content bbox
    atlas-map-pin-layout.ts    Leader-line declutter
    atlas-map-label*.ts        Label placement / visibility
    atlas-map-scale-bar.ts     Scale bar
    atlas-map-topology.ts      Lazy topology + retry
    __tests__/                 Vitest (lib + ranking + atlas math)
  __tests__/                   DOM smoke (App shell, AtlasMap.dom / .topo)
  types.ts                     Domain schema
public/
  sw.js                        Service worker (shell precache + SWR)
  icon-{180,192,512,512-maskable}.png  PWA icons
scripts/                       Audits, goldens, OG/icons, playtest-polish / map / visual / celsius
.github/workflows/             quality.yml, quality-main.yml, static-preview.yml, deploy-pages.yml
```

## What this demonstrates

Terraclima is an attempt to make complex environmental knowledge *usable*: human enough to scout with curiosity, structured enough to compare under pressure, and disciplined enough that every claim stays tied to evidence.

It is not a toy weather dashboard. It is a working atlas for relocation research, climate travel, agricultural curiosity, adaptation screening, and landscape literacy — built with the same care you’d want if a real decision hung on the next pin you open.
