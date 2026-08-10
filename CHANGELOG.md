# Changelog

All notable changes to Terraclima are tracked here.

## Unreleased

### Release playtest audit harness

- Add `npm run playtest:release-audit` for post-merge regression coverage: mobile Atlas Read chip footprint, featured hover identity, dossier provenance labels, scenario URL persistence, 1499/1500 overflow, and home-base reload.

### Mobile Atlas Read chip — stop blocking the map mid-band

- **Problem:** On phones the Atlas Read panel was a full-width Leaders·Driver bar with `pointer-events: auto`, so while scrolling places it sat in the middle of the viewport and stole page/map gestures. Coarse pointers also hid the More control, so it could not be collapsed.
- **Fix:** Coarse pointers get a compact corner chip (headline + More). Details expand only on demand; the chip hides during map gestures; in Scroll-page mode it does not capture swipes (More stays tappable). Desktop hover/expand behavior is unchanged.

### Map hover identity for dense Climate V2 rank clusters

- **Pin collision hit targets:** collision-spread glyphs now carry the hover/tap hit circle (leader line keeps the geographic anchor), so nearby top-ranked places no longer collapse to one oversized stacked target.
- **Featured paint order:** among gold comfort leaders, worse ranks paint first and #1 last so residual overlaps prefer the current lens leader.
- **Crowded hit padding:** tighter invisible hit radii when pins are marked crowded after layout.

### Climate Data V2 — Daymet 1996–2025 rolling climatology

- **Default Now:** Daymet V4 R1 rolling **1996–2025** climatology (not a WMO standard normal). Same-source **1991–2020** retained for comparison receipts.
- **Pipeline:** offline `scripts/climate-data/*` fetch/generate/verify/audit; committed `data/climate-v2/manifest.json`, generated overlays under `src/data/generated/climate-v2/`, raw Daymet cache gitignored.
- **Provenance:** per-place periods, source refs, validation status (`validated` / `grid-only` / `reviewed-exception`); split `editorialConfidence` / `climateDataConfidence`.
- **Metrics:** `solarEnergyMjM2Day` (solar resource) replaces template sunshine %; Daymet SWE stays snowpack, never snowfall cm; RH estimated from vapor pressure.
- **UI:** “Recent · 1996–2025”, evidence panel + Learn methodology, compact vs-1991–2020 receipt; map hovers keep active-period trust label without expanding the first viewport.
- **Projections:** NEX-GDDP ensemble path reserved; places may mark projection unavailable until ensemble assets land (no invented single-model forecasts).
- **Automation:** monthly Daymet freshness workflow opens a candidate PR only when checks pass (never auto-merge).
- **Audit:** shadow-diff + rank-diff vs pre-V2 baseline; elevation mismatches for Hood River Gorge and Redfield documented as climate-anchor exceptions.

### Playtest harden: pan gesturing, unit tooltip, dark field note, alias URLs

- **Map pan gesturing:** one-finger / mouse pan now sets `data-gesturing` once the drag threshold is crossed, so hover cards and leader lines hide during pan (not only pinch/wheel).
- **Climate Signal tooltips:** archetype blurbs in the signal rail `title` run through `prose()` so °F mode no longer leaks °C copy.
- **Field note strip:** light paper gradient moved into CSS so dark-theme remaps are not overridden by Tailwind utilities.
- **Place-id aliases:** `openPlace` writes the canonical id into selection/URL state (`san-miguel-mx` → `san-miguel-de-allende-mx`).
- **Coverage:** Compare→dossier under `scn=ssp245`, mouse-pan gesturing, Fahrenheit signal-rail titles, dark Field note strip, alias URL canonicalize.

### Focus, Visit-now month, and scenario remap honesty

- **Compare → dossier handoff:** closing Compare into a place profile no longer races delayed Compare-trigger focus restores; the Explorer Compare launcher is preferred as the dossier return target.
- **Visit-now / `best-this-month`:** ranking and PlaceCard climate-bar chrome share a calendar-month epoch (`useRankingCalendarMonth`), refreshed on tab visibility/focus so long-lived sessions do not drift across month boundaries.
- **Scenario remap copy:** lens-score chips are labeled as ranking-score deltas under projected vs present-day climate; summer/winter/precip chips remain climate deltas vs 1991-2020 normals; flat authored-score lenses omit a noisy `+0`.
- **Map leader lines during gestures:** `.map-pin-leaders` hide under `data-gesturing` alongside the hover card.

### Post-merge trust polish (home base, ranking, map hover)

- **Home-base hydrate write-through:** explicit `?hb=` persists to `localStorage` on first paint and `popstate`; unresolved stored ids are purged so orphans cannot resurrect.
- **Auto live-fit snapshot restore:** constraint-driven `live-fit` remembers the prior ranking + URL-explicit flag and restores that snapshot on chip dismiss / Clear all (instead of only `loadPersistedRanking()`).
- **`rankPlaces` id tiebreaker:** same-name and score-0 clusters sort by id after name (Durango CO/MX, missing `sunshinePct` winters).
- **Map hover card:** tooltip screen position tracks live `view` again; pan/pinch hides the card via `.map-shell[data-gesturing="true"]` so it cannot float off the pin.
- **Dark theme paper flashes:** `.atlas-hero-stat` and corpus-matrix row hover use dark surfaces instead of light paper.

### Atlas map gesture and interaction polish

- **Imperative pinch:** two-finger zoom mutates `viewRef` + the SVG transform (and `data-atlas-inv-scale` counter-scale) without reconciling every Marker at 60 Hz; React commits on release.
- **Scroll page + wheel:** while the map is in page-scroll mode, wheel events are no longer `preventDefault`’d — hybrid trackpads can scroll the Explorer past the atlas.
- **Cluster picker keyboard guard:** `+` / `-` / arrows do not pan or zoom the map under an open cluster picker.
- **Hover card during gestures:** live `view` keeps wheel/zoom peeks pinned; imperative pan/pinch hide the card while `data-gesturing` is true.
- **Leader highlight:** per-pin leader lines use `data-leader-for` + `.map-pin-leader--active` (the old sibling CSS never matched).
- Docs: map↔list centering is an intentional instant snap (not a reduced-motion fly).

### Long-horizon correctness and contract polish

- **Compare workbench scenario honesty:** shortlist/recent candidates outside a narrowed Explorer pool now resolve through `placeForCompareSlot` (`src/lib/compare-workbench.ts`), so 2050 layers no longer mix present-day normals into workbench scores.
- **Imperial unit leaks:** Field Guide archetype copy, bioclim/compare surfaces, and related prose now run through `localizeProse` / hardened unit patterns (metres ranges, qualitative distances, chinook deltas).
- **Clear all ↔ curated collection:** FilterBar / Lens Receipt Clear all accepts App's full Explorer reset (`onClearAll`), so curated `col` clears with filters instead of leaving a stuck collection pool.
- **Auto live-fit is transient:** constraint-driven `live-fit` ranking no longer overwrites the persisted preference; Clear all / Reset Explorer restores discovery ranking when live-fit was only a session lens.
- **URL risk ceilings documented correctly:** `fire` / `risk` allowlist is `low` | `moderate` | `elevated` (matching FilterBar); docs no longer advertise dropped `high` / `extreme` tokens.
- **Shared winter-sunshine metric:** `meanWinterSunshinePct` lives once in `climate-metrics.ts` (home-base + live-fit).
- **Dossier vs-home under scenarios:** Versus Home footnote notes when Explorer/Compare use a projected layer while the dossier stays present-day.
- **Compare focus restore:** focus trap no longer races App's compare-trigger restore retries.
- **PlaceCard:** removed deprecated `onClick` prop; lists use `onOpenPlace` only.

### Consolidation, trust, and product-clarity release

- **Evidence hierarchy (`src/lib/evidence-summary.ts`, `PlaceEvidenceSummary`):** place dossiers gain a compact “How to read this profile” disclosure plus section labels that distinguish measured normals, editorial context, deterministic derivation, regional projections, and screening scores. Confidence and completeness stay separate; citations remain section-level, not sentence-level.
- **Corpus validation:** `audit:corpus` and `sanity` enforce allowlisted confidence/citation kinds, nonempty labels, duplicate citation detection, safe URLs, exhaustive evidence classes, and projection-override citation support.
- **Compare scenario honesty:** `placeForCompareSlot()` projects out-of-pool Compare slots when `scn≠now`, so present-day normals are never shown under a future-layer banner.
- **Discovery clarity:** tighter reader-path copy; vs-home deltas labeled as derived; journey-bridge wording cleaned.
- **Orchestration boundaries:** Explorer empty-result recovery and share-status live in focused modules; atlas cluster picker extracted to `AtlasMapClusterPicker`.
- **Verification:** post-build gzip byte budgets for initial CSS/JS and cold chunks; `npm run playtest:browser` / `test:browser` Playwright smoke suite; dedicated `.github/workflows/browser-smoke.yml` (kept outside `quality:check`).
- No ranking formula, URL semantics, corpus place count, or map projection changes.

### Interactive map declutter II: scout peek + surface LOD

- **Hover card slim-down (`src/components/AtlasMapTooltip.tsx`, `src/styles.css`):** the pin preview no longer expands into a dossier-scale panel. Compact stays a name + climate metrics peek; pointer dwell (450 ms) promotes to a medium scout card (climate strip, why-it-differs, up to two drivers) capped at ~18 rem tall / 19 rem wide. Comfort scores, scout cues, and confidence chrome stay in the full profile. Keyboard focus never auto-promotes past compact.
- **Label + pin LOD (`src/lib/atlas-map-label-visibility.ts`, `src/components/AtlasMap.tsx`):** name labels appear later and open to `full` less often; mid-zoom collision gutters are wider. Below continent-scale zoom (`k < 1.0`) pins keep the tier glyph and hit target but drop signature auras and country rings; rank-halo orbit waits until `k ≥ 1.15`. Leader lines are quieter by default.
- **Quieter chrome (`src/components/AtlasMap.tsx`, `src/styles.css`):** the Atlas readout collapses to Leaders + Driver until hover/focus-within or an explicit More/Less toggle (coarse pointers stay collapsed). Rank trails default to quiet until `k ≥ 1.35` outside clusters; country labels fade earlier. Cluster picker max height caps at 380 px. Keyboard pin focus keeps a compact peek even if the pointer grazes and leaves the focused pin.
- No scoring, ranking, corpus data, routes, clustering, or URL semantics change.

### Discovery-first Explorer cold start

- **Default ranking (`src/lib/app-ranking-preference.ts`):** first-run Explorer sessions now open on **Most unique** instead of Live-here fit, so the atlas leads with microclimate discovery. Persisted ranking preferences still win for returning readers; active Live Finder constraints still auto-switch to `live-fit`.
- **Hero discovery surface (`src/App.tsx`):** cold-start copy and quick picks emphasize uniqueness, hidden gems, cool summers, fog/marine coasts, climate-dissonance trips, and visit-now seasonality. Surprise me is the primary CTA; Scout Board / Living Compass / livability rails stay behind an explicit **Scout tools** disclosure.
- **Weighted Surprise (`src/lib/surprise-pick.ts`):** **Surprise me** / **R** favor higher `microclimateUniqueness` (with a lighter hidden-gem boost) inside the current filtered pool and prefer places not in the recently-viewed rail.
- **Archetype field guide (`src/components/PlaceDetail.tsx`):** opening a place surfaces the primary archetype's authored `guide` copy in a compact expandable panel so "why is this distinct?" is answerable without hunting.
- **Desktop Scout brief jump:** the hero Scout brief link targets `#explorer-scout-brief` on both the mobile Scout Brief panel and the desktop relocation workbench.

### Interactive map declutter & zoom affordance

- **Bottom-left cartography cluster (`src/components/AtlasMap.tsx`, `src/styles.css`):** the compass rose used to float top-right where it overlapped the +/−/Fit zoom column, and the raw `×N` zoom readout sat top-left *behind* the App's title caption (never visible). The compass is now a compact north arrow paired with the distance scale bar in a single bottom-left cluster, leaving the top corners clear; the redundant raw zoom multiplier is dropped entirely (the scale bar already reports real distance — a sub-1 "×" value just read oddly). The north arrow is desktop-only; coarse and narrow (≤680 px) viewports keep just the scale bar so the cluster can't crowd the relocated key dock or atlas readout.
- **Mobile atlas-readout clearance (`src/styles.css`):** on phone widths the bottom "Atlas read" band sat a few pixels over the top of the bottom-left scale + Key stack; its `bottom` offset now clears that stack so the scale bar is never clipped.
- **Mobile touch-mode toggle placement (`src/components/AtlasMap.tsx`):** the **Use map / Scroll page** control floated at the top-left, where the title caption painted over it. It now leads the top-right control column alongside the zoom buttons, so the primary phone interaction switch is no longer obscured. The control's role, `aria-pressed`, label, and behavior are unchanged.
- **Projection credit moved on-demand (`src/components/AtlasMap.tsx`):** the always-on "ALBERS CONIC · NORTH AMERICA" label sat in the bottom-right under the Key toggle, partly hidden. The projection line ("Albers equal-area conic, centered on North America, north up") now lives in the map key (desktop usage notes and the mobile legend) instead of cluttering the map surface.
- **Desktop double-click to zoom (`src/components/AtlasMap.tsx`, `src/__tests__/AtlasMap.dom.test.tsx`):** double-clicking empty map now zooms in ~1.7× centered on the cursor — desktop parity with the existing touch double-tap and a standard map affordance. Double-clicks that land on a pin or cluster are left to those elements' own activation, and coarse pointers keep the dedicated double-tap path. The map aria-label and usage notes mention the gesture; new DOM tests cover the zoom, the pin/cluster guard, and the consolidated cluster's responsive contents.
- **Atlas map accessibility (`src/components/AtlasMap.tsx`, `src/__tests__/AtlasMap.dom.test.tsx`):** an axe-core (WCAG 2.1 A/AA) pass across Explorer, the dossier, Compare, and mobile flagged two serious violations on the always-present map, now fixed with no behavior change. (1) The focusable map surface was `role="img"` while containing focusable pin/cluster buttons — a *nested-interactive* violation; it is now `role="application"` with `aria-roledescription="Interactive map"`, which both removes the violation and lets screen readers pass arrow keys through to the map's own pan/zoom/marker-nav instead of intercepting them in browse mode. (2) The "Atlas read" `<dl>` had grouping `<div>`s containing a stray `<span>` beside their `<dt>/<dd>` — an invalid *definition-list* structure; the detail line now nests inside the `<dd>`. After both fixes the audit reports zero serious/critical violations across every audited view.
- No scoring, ranking, corpus data, routes, clustering, or URL semantics change.

### Shared mobile dossier link reliability

- **Place-detail deep links (`src/App.tsx`, `src/components/PlaceDetail.tsx`):** shared `?p=` profile URLs now skip the offscreen drawer entry state on first paint and Back/Forward hydration, so phone-width hard loads land with the dossier visible instead of leaving the animated panel translated 100% off-canvas. User-initiated dossier opens still keep the slide-in motion.
- **Profile loading drawer (`src/App.tsx`, `src/components/place-detail/PlaceDetailLoadingFallback.tsx`):** while the cold PlaceDetail chunk loads, shared profile links now show a full-height dossier-shaped loading drawer with a focused, Escape-aware close control and trapped Tab focus instead of a small centered status card over an inert atlas.
- **Mobile modal semantics (`src/App.tsx`, `src/components/ExplorerFilterSheet.tsx`):** the hamburger navigation menu and mobile filters sheet now explicitly expose `aria-modal="true"` on their native `<dialog>` elements, matching the rest of Terraclima's modal surfaces for assistive technology.
- **Mobile filter-sheet opening focus (`src/components/ExplorerFilterSheet.tsx`):** opening the mobile Explorer filters now sends focus to the in-sheet search field instead of the transparent backdrop, with a retry after native `<dialog>` focus settling and a close-button fallback. The backdrop is no longer programmatically focusable, so keyboard users land on a meaningful control immediately.
- **Mobile shortcuts overlay fit (`src/App.tsx`, `src/components/chrome/ShortcutsOverlay.tsx`):** the keyboard-shortcuts help panel is now bounded to the dynamic viewport and scrolls internally, keeping the focused close button reachable on phone-height screens instead of centering a too-tall panel with its header above the viewport. Closing help now returns focus to the Tips / Shortcuts button that opened it.
- **Trip / collection filter focus landing (`src/App.tsx`):** pinning a trip from Climate Trips or a collection from Collections now lands keyboard focus on the Explorer hero's clear-trip / clear-collection control after the route switch, instead of dropping focus to the page body when the original card unmounts.
- **Readable active Compare controls (`src/components/PlaceDetail.tsx`, `src/components/PlaceCard.tsx`, `src/components/place-detail/PlaceResidencyBrief.tsx`):** selected Compare buttons now use a shared high-contrast active style across the dossier header, result cards, and residency brief. The mobile Morelia dossier path improves the active Compare label from roughly 1.28:1 contrast to 7.89:1.
- **Mobile Compare setup entry (`src/App.tsx`):** when a shared or resumed Explorer URL already has comparison candidates, the mobile hero now exposes a visible `Compare · n` action instead of hiding the only Compare entry behind the site menu.
- **Bare profile URL hygiene (`src/App.tsx`, `docs/URL-INVARIANTS.md`):** opening or closing a clean `?p=<place>` profile link no longer picks up a locally persisted ranking lens such as `r=most-comfortable` during first-paint or close-path URL sync. Explicit ranking URLs, in-session ranking changes, and active Live Finder state still serialize the ranking that shapes the Explorer context.
- **Share feedback accuracy (`src/lib/share.ts`, `src/App.tsx`, `src/components/CompareView.tsx`, `src/components/place-detail/CopyPlaceLink.tsx`):** Explorer, Compare, and dossier link controls now distinguish native-share completion from clipboard fallback, showing "Shared" only for OS share success, "Link copied" / "Copied" for clipboard fallback, and no false success or failure message when the share sheet is dismissed.
- **Resume-rail focus return (`src/App.tsx`):** dossiers opened from recently viewed chips, pinned shortlist chips, or the shortlist Scout packet now restore focus to the exact opener when closed, so keyboard and switch users land back where they resumed scouting instead of dropping to the page body.
- **Compare close focus return (`src/App.tsx`, `src/components/CompareView.tsx`):** Compare now restores focus to the exact Compare button that opened it and exposes a specific "Close comparison" control, while Compare-to-dossier handoffs suppress that restore so the dossier can move focus to its own close control.
- **Deep dossier hash focus (`src/components/PlaceDetail.tsx`, `src/components/place-detail/PlaceDeepSections.tsx`):** copied `?p=<place>#deep-...` chapter links now scroll and move keyboard focus to the shared field-dossier chapter heading instead of leaving focus on the page body or the drawer close control.

### Visual quality pass: no-blur scrim veil, climate-signature hero fallback, dark dossier remap

- **Modal scrim without blur (`src/styles.css`, `src/lib/theme-tokens.ts`):** Compare, the dossier drawer, and the shortcuts overlay relied on `backdrop-filter: blur(8px)` to separate the modal from the page; on the low-power tier, with OS reduce-motion, or in browsers without `backdrop-filter`, the blur was dropped and the remaining 35% tint left the Explorer bleeding through the dialog. A new `--tc-scrim-veil` token (warm paper in light, moonlit navy in dark) now layers under the designed tint whenever the blur is unavailable, reproducing the blurred tier's tone and text contrast. Mirrored in `theme-tokens.ts` with test coverage.
- **Dossier hero fallback (`src/components/PlaceDetail.tsx`, `src/components/charts/MiniClimateStrip.tsx`, `src/styles.css`):** when a hero photo can't load (offline PWA, blocked CDN, 404), the dossier now renders a designed climate-signature panorama — a January→December gradient built from the place's own monthly normals via the shared `tempColor` scale, with the place name, primary signature label, and a Jan/Dec scale strip — instead of a flat "image unavailable" box. The fallback is declarative React state (no DOM injection), re-themes for dark mode, and keeps the photo credit line.
- **Dark-theme dossier remap (`src/styles.css`, `src/components/place-detail/PlaceDeepSections.tsx`):** the place-signature panel, "At a glance" lattice, Field story panel, field-dossier shell/intro, hero credit strip, and desktop reading-nav container all kept hardcoded paper backgrounds while the text scale flipped to moonlight, producing light-on-light sections in dark mode. Each now has a moonlit remap. Active reading-nav and dossier-jump pills dropped their layered `!important` paper backgrounds (which also blocked any dark override) in favour of the token-mapped chip-active tint with the ochre accent bar, legible in both themes. `--color-glacier-700` — used exclusively as link/accent text — is remapped to a bright teal in dark so dossier links stop vanishing (#0d5f72 on #0d1320 was ~1.6:1).
- No scoring, ranking, corpus data, routes, or URL semantics change.

### Home-base climate anchor ("vs home" deltas)

- **New relocation primitive (`src/lib/home-base.ts`):** the reader can pin any corpus place as their **home base** — their current climate, or its closest atlas analog — and the whole atlas then reads as deltas against it. The engine is a pure, deterministic function of the authored 1991–2020 normals: summer-day and winter-night temperature deltas, an annual-precipitation ratio, summer-humidity and winter-sun point spreads, annual-snow difference, comfortable-month count, and the 0–5 all-hazard load. Optional signals (humidity, sunshine, snow) only render when **both** places author the field — no inferred facts. Each signal carries direction, magnitude, salience, a chip tone from the existing palette, and a delta-safe metric phrase that `localizeProse()` converts with the 9/5 ratio (locked by test).
- **Set it anywhere (`src/components/PlaceDetail.tsx`, `src/hooks/use-keyboard-shortcuts.ts`):** a **Set home / Home base** toggle joins the dossier header controls (`aria-pressed`, tooltip explains the lens), and a new **H** shortcut mirrors **B** for the open profile. The count strip above the ranked cards shows the active anchor with a one-click clear; transient feedback narrates set/clear.
- **Vs-home everywhere:** non-compact place cards grow a compact "vs {home}" chip strip (top three salient deltas, or a "climate sibling" read); every dossier gains a **Versus your home base** section (headline sentence, delta tiles with ▲/▼ direction and plain-language descriptors, screening-grade footnote) that flips into a baseline explainer with a clear control when the open dossier *is* home; Compare columns add a per-place vs-home strip plus an **Add home** header action that drops the anchor into the column set when there's room.
- **Shareable + scenario-honest (`src/lib/app-url.ts`, `src/App.tsx`):** new validated `hb=` URL param (corpus-checked, alias-canonicalized, appended last, omitted when unset) so "look at this vs OUR home" links round-trip; localStorage persistence with theme-style precedence (explicit URL wins, Back/Forward falls back to the sticky choice). Under a 2050 scenario layer the Explorer grid and Compare diff the **projected** place against the **projected** home via `projectPlace` — deltas never mix a projected candidate with a present-day baseline — while the dossier section stays on present-day normals like the rest of the dossier.
- **Tests:** 12 new lib tests (storage, signed deltas, ratio clamping, optional-field gating, salience ordering, prose-localization contract, corpus spot pair, unit formatting in both systems), `hb=` URL parse/format/validation coverage, H-shortcut hook tests, and DOM tests for the card strip, dossier section, baseline flip, and header toggle.

### Compare score lens receipt

- **Compare (`src/components/CompareView.tsx`, `src/styles.css`):** filtered or scenario-aware comparisons now show a compact **Score lens** receipt that names the active Live Finder signals, hard thresholds, and climate layer shaping finalist fit scores. Default present-day Compare stays uncluttered, and no scoring, ranking, corpus data, routes, or exports change.

### Fit Finder scope reset

- **Fit Finder (`src/lib/lifestyle-bundles.ts`, `src/components/FilterBar.tsx`):** global guided paths now clear stale region and terrain filters when selected, and they no longer read as active while old geography scope is still filtering the list. This keeps path switching honest without changing scores, corpus data, URL semantics, or regional paths such as Mexico / Southwest.

### Map Fit Finder path cue

- **Explorer map (`src/App.tsx`, `src/styles.css`):** the map caption now switches from a plain rank trail to a compact **Fit path map** cue when a Fit Finder bundle is active, naming the active path plus the Scout lead/finalist count while keeping the map pins, cluster picker, scoring, routes, corpus data, and default ranking caption unchanged.

### Empty-results recovery plan

- **Explorer empty state (`src/App.tsx`, `src/styles.css`):** zero-result searches now show targeted recovery actions for clearing only the search, relaxing Live Finder limits, clearing region/terrain filters, or resetting Explorer. This turns a dead-end filter combination into a guided scouting recovery step while preserving ranking math, corpus data, route semantics, and the existing full-reset behavior.

### One-place Scout plan Compare setup

- **Scout plan export (`src/lib/shortlist-export.ts`, `src/components/chrome/ShortlistExportMenu.tsx`):** a one-place Markdown Scout plan now includes a direct **Compare setup** URL and anchor-finalist next action instead of telling users to pin another place first. The compact export trigger also gets the same 32 px shortlist touch target and dark-mode contrast hardening as the Compare setup action. Multi-place decision tables, empty-shortlist copy, export formats, scoring, routes, and corpus data are unchanged.

### One-place shortlist setup

- **Pinned shortlist (`src/App.tsx`, `src/lib/shortlist-readiness.ts`):** a single saved finalist now offers a direct **Compare setup** handoff to the existing one-place Compare guide instead of implying Compare is unavailable. The two-plus-place decision cue, Compare cap, export files, routes, scoring, and corpus data are unchanged.

### Shortlist packet decision cue

- **Pinned shortlist (`src/App.tsx`, `src/lib/shortlist-packet.ts`, `src/styles.css`):** compare-ready saved places now show a compact Scout packet cue naming the first dossier to read, a contrast dossier, and the first caveat to verify before opening Compare. The cue reuses the existing Compare finalist verdict logic and does not change scores, corpus data, routes, export formats, or bookmark order.

### Save Scout Board finalists

- **Explorer Scout Board (`src/App.tsx`, `src/lib/place-bookmarks.ts`):** Scout Brief and desktop Scout Board actions can now save the current Compare-ready finalists into the pinned shortlist in ranked order. This closes the path from Fit Finder / ranking scan to Compare and Scout plan export without changing scores, corpus data, export formats, or route state.

### Shortlist export feedback

- **Shortlist export (`src/components/chrome/ShortlistExportMenu.tsx`, `src/styles.css`):** export actions now show preparing, download-started, and blocked-download status feedback instead of silently closing the menu. The export formats, file contents, shortlist order, and lazy-loaded export chunk stay unchanged.

### Compare single-finalist guide

- **Compare (`src/components/CompareView.tsx`, `src/styles.css`):** when only one place is saved, Compare now shows a compact shortlist setup read with the anchor signal, missing contrast, and review/keep-scouting actions. The full decision read still appears only once there are at least two finalists, and existing Compare ordering, URL state, scoring, and dossier links are unchanged.

### Dossier fit context receipt

- **Residency brief (`src/components/place-detail/PlaceResidencyBrief.tsx`, `src/styles.css`):** when a Live Finder/Fit Finder path is active, the top dossier brief now names the active fit presets and hard thresholds that shaped the live-here score. This keeps the Explorer-to-dossier journey continuous without changing scoring, routes, corpus data, or adding another detail panel.

### Result card ranking evidence

- **Ranked place cards (`src/components/PlaceCard.tsx`, `src/styles.css`):** promotes each ranking note into a top-of-card **Why this rank** evidence strip with a first-check cue, so users can understand why a result made the shortlist before scanning charts or opening the dossier. The strip uses existing ranking/live-fit/signature data and preserves scoring, ranking, routes, and corpus records.

### Fit Finder journey receipt

- **Explorer hero (`src/App.tsx`, `src/styles.css`):** when a guided Fit Finder path is active, the hero now shows a compact journey receipt with the path name, applied ranking/signals/scope, next scout action, and direct dossier/Compare buttons. The receipt uses the existing bundle activation logic and does not change corpus data, scoring, ranking formulas, or URL state.

### Fit Finder lanes

- **Fit Finder (`src/components/FilterBar.tsx`, `src/lib/lifestyle-bundles.ts`, `src/styles.css`):** groups guided paths into **Escape discomfort**, **Daily life fit**, and **Terrain & seasons** lanes so the larger preference set stays scannable on desktop and mobile. Each lane is exposed as a named accessible group while existing path behavior, ranking, filters, and URL state remain unchanged.

### Fit Finder geography path

- **Fit Finder (`src/lib/lifestyle-bundles.ts`, `src/components/FilterBar.tsx`):** adds a scoped **Mexico / Southwest** guided path that combines existing dry-air/mild-winter constraints with U.S./Mexico and dry-highland terrain filters. The path discloses its region and terrain scope in the applied-settings receipt and round-trips through shareable Explorer URLs.

### Shortlist scout readiness

- **Pinned shortlist (`src/App.tsx`, `src/lib/shortlist-readiness.ts`):** adds a compact Scout packet status line that explains when pinned places are ready for Compare and when the Scout plan export preserves the full ordered shortlist. The cue stays inside the existing rail and does not change ranking, routes, corpus data, or export files.

### Shortlist export Compare table

- **Scout plan export (`src/lib/shortlist-export.ts`, `src/components/chrome/ShortlistExportMenu.tsx`):** carries the Compare finalist decision read into the Markdown shortlist export, including a Compare URL plus role, score, fit, risk, visit window, and watch-first rows for the first four pinned places. Export helpers now lazy-load only when a format is chosen, and the export still keeps every pinned place while preserving the no-booking/no-appraisal/no-move-recommendation boundary.

### Compare finalist decision table

- **Compare (`src/components/CompareView.tsx`, `src/lib/compare-finalist-verdict.ts`):** adds a compact finalist table to the decision read so saved places can be scanned by role, blended score, fit, risk, visit timing, and first caveat before opening dossiers. The table preserves existing Compare ordering, scoring, URL state, and dossier-opening controls.

### Fit Finder signal row polish

- **Explorer filters (`src/styles.css`):** lets Fit Finder **Rank** and **Signals** values use the full narrow desktop card width, preventing live-font clipping in the right dock while preserving the compact label/value layout in the wider mobile filter sheet.

### Fit Finder dock clarity

- **Explorer filters (`src/components/FilterBar.tsx`, `src/styles.css`):** replaces each Fit Finder card's crowded one-line applied-settings read with structured **Rank** and **Signals** rows. Full ranking and constraint details remain available through the card title and accessible description, while desktop labels can wrap instead of truncating.

### Scout Board action rail

- **Desktop Scout Board (`src/App.tsx`, `src/styles.css`):** adds a compact action rail beside the relocation verdict so desktop users can open the leader dossier, compare the current finalists, or pin the leader to the shortlist without hunting through lower panels. The existing board evidence, map, ranking logic, and mobile Scout Brief path are unchanged.

### Scout Board compact evidence

- **Desktop Scout Board (`src/App.tsx`, `src/styles.css`):** folds the priority-leader signals and decision matrix into one compact evidence section with narrow-desktop rails. The relocation verdict stays first, the Compare/profile handoffs remain clickable, and mobile keeps the existing Scout Brief flow.

### Scout/map hierarchy polish

- **Explorer hero (`src/App.tsx`):** promotes the desktop relocation workbench ahead of the climate signal rail so the advisor verdict, scout-day plan, and Compare handoff land earlier in the first Explorer read. Mobile keeps the compact hero-first, map-second, Scout Brief-after-map flow.

### Scout brief advisor verdict

- **Scout Brief (`src/lib/explorer-scout-brief.ts`, `src/App.tsx`):** adds a compact advisor verdict to the Explorer Scout Brief and desktop relocation workbench. It explains why the leader is the first scout, what to check before shortlisting, the next action, and the screening-confidence boundary while preserving deterministic scores, corpus data, routes, and Compare behavior.

### Winter Sun fit screen

- **Explorer rankings and Fit Finder (`src/lib/scoring.ts`, `src/lib/live-fit.ts`, `src/lib/lifestyle-bundles.ts`, `src/components/FilterBar.tsx`):** adds a deterministic **Sunniest winters** ranking plus a **Winter Sun** Fit Finder path for gray-season escape. The path uses existing monthly `sunshinePct` normals and a winter-low floor, fails closed when winter sunshine is missing, and keeps the applied ranking/preset/constraint line visible before users apply it.

### Fit Finder applied settings

- **Explorer filters (`src/components/FilterBar.tsx`):** each Fit Finder path now shows a compact applied-setting line for the ranking lens, Live Finder presets, and any temperature/growability/risk constraints before the user applies it. This makes guided paths more inspectable without changing ranking math, corpus data, URLs, or the manual filter controls.

### Scout brief visit plan

- **Scout Brief (`src/lib/explorer-scout-brief.ts`, `src/App.tsx`):** turns the leader's next action, field-check contrast, and runner-up tradeoff into a compact ordered "Scout day plan." The plan keeps every step clickable, preserves existing ranking math and corpus data, and extends the Celsius runtime audit to cover the new generated copy.

### Compare scout sequence

- **Compare (`src/components/CompareView.tsx`, `src/lib/compare-finalist-verdict.ts`):** adds a compact scouting sequence to the finalist decision read. Compare now turns saved finalists into a visit order with best-month timing and the first caveat to verify, while preserving existing deterministic scoring, URL state, and dossier-opening controls.

### Scout brief field check

- **Scout Brief (`src/lib/explorer-scout-brief.ts`, `src/App.tsx`):** adds a compact "Field check" cue to the Explorer Scout Brief and desktop relocation workbench, derived from existing nearby-contrast, local-contrast, or settlement-anchor fields. This turns the ranked leader into a concrete scouting comparison before a place becomes a finalist, without changing rankings, corpus data, or routes.

### Shortlist compare handoff

- **Pinned shortlist (`src/App.tsx`, `src/components/CompareView.tsx`):** adds a direct Compare action beside Export when two or more places are pinned, preserving pinned order and the existing four-place Compare cap. This tightens the relocation journey from saved finalists to side-by-side decision read, with extra mobile Compare top spacing so the newly reachable dialog does not crowd the app chrome.

### Shortlist scout plan export

- **Shortlist export (`src/components/chrome/ShortlistExportMenu.tsx`, `src/lib/shortlist-export.ts`):** adds a human-readable Markdown Scout plan export ahead of the machine-readable formats, carrying visit windows, watch-first caveats, score ingredients, and dossier links for pinned finalists. This gives the shortlist a cleaner field-scouting handoff without changing rankings, corpus data, or routes.

### Climate twins tradeoff read

- **Climate twins (`src/components/place-detail/PlaceClimateTwins.tsx`, `src/lib/climate-analog.ts`):** adds a compact "same feel, different tradeoffs" read above the lead analog, naming the top preserved climate similarities, the main climate tradeoff, and the next action before adding finalists to Compare. This makes the twins section more relocation-useful without changing analog scoring or corpus data.

### Map hover fit handoff

- **Atlas map preview (`src/components/AtlasMap.tsx`, `src/components/AtlasMapTooltip.tsx`):** the hover/focus scout preview now reflects the active Live Finder constraints, shows current rank context for top map leaders, and adds a compact next-move cue to open the dossier before comparing finalists. This tightens the map-to-shortlist handoff without adding permanent labels or clutter.

### Compare finalist verdict

- **Compare (`src/components/CompareView.tsx`, `src/lib/compare-finalist-verdict.ts`):** upgrades the existing decision read into a compact finalist verdict with a first-dossier recommendation, counterweight caveat, next action, and dossier-opening controls. The scoring stays deterministic and uses only existing live-fit, livability, comfort, lived-ease, growability, and risk signals.

### Scout brief audience read

- **Scout Brief (`src/lib/explorer-scout-brief.ts`, `src/App.tsx`):** adds a compact "Best for / Pause if" read to the Explorer Scout Brief and desktop relocation workbench, derived from the active Fit Finder filters, leader decision row, risk load, and easy-month signal. This makes the shortlist answer who should consider it and who should slow down before opening the dossier, without changing ranking math or corpus data.

### Guided Fit Finder paths

- **Explorer filters (`src/components/FilterBar.tsx`, `src/lib/lifestyle-bundles.ts`):** replaced the old lifestyle-bundle dropdown with compact Fit Finder paths that apply existing rankings plus Live Finder constraints for heat escape, remote work, retirement, gardenability, dry air, coastal buffering, quiet towns, low fire/smoke, snow, and shoulder-season scouting. The hero `Cool summers` quick pick now uses a dedicated cool-summer refuge path instead of the older Snow & Ski bundle, so it no longer applies snow-country filters by surprise.

### Relocation-first hero fit path

- **Explorer hero (`src/App.tsx`):** the first screen now leads with "Find your climate fit before you scout," shifts the default eyebrow to Live Finder, and renames the hero starters from generic ranking shortcuts to climate-fit quick picks such as Visit now, Comfort fit, Garden life, Cool summers, and Low risk. Screen-reader text and tests cover the new first-run promise.

### Scout brief next-step handoff

- **Relocation next step (`src/lib/explorer-scout-brief.ts`, `src/App.tsx`):** the Explorer Scout Brief and desktop relocation workbench now add a compact "Scout next" action derived from the leader's best-month window, first decision-matrix caveat, and runner-up comparison. It opens the same dossier as the leader card, preserves URL unit state, and keeps the cue visually subordinate to the existing shortlist evidence.

### Map keyboard preview + conventional search clear

- **Keyboard pin preview (`src/components/AtlasMap.tsx`):** focusing a map pin (Tab / arrow-key navigation) now shows the same climate-preview tooltip a pointer hover does, and clears it on blur — keyboard and assistive-tech users get the at-a-glance read that was previously mouse-only.
- **Conventional search clear (`src/components/FilterBar.tsx`):** the × inside the search field now clears **only the search text** (the universal convention) and refocuses the input, and appears only when there is a query. Clearing every filter stays on the lens-receipt "Clear all filters" control, so the in-field × no longer ambiguously wiped geography/preset/constraint filters or lingered over an empty search box.

### Dossier accessibility & touch polish

- **Data-bearing chart labels (`src/components/charts/ClimateRibbon.tsx`, `PrecipBars.tsx`):** the temperature-ribbon and precipitation SVGs now carry the chart's gist in their `role="img"` `aria-label` — warmest/coldest month + values for the ribbon, annual total + wettest/driest month for precip — so screen-reader users get the data, not just "a chart". Values track the active unit system; argmax/argmin are unit-invariant.
- **Back-to-top touch target (`src/styles.css`):** the place-dossier back-to-top pill grows from 2.6rem to 2.75rem so it meets the project's 44px touch-target bar on phones.
- **Hero fallback context (`src/components/PlaceDetail.tsx`):** when a place's hero image fails to load, the gradient placeholder now names the place ("{place} — image unavailable") instead of a generic "Image unavailable".

### Tier C experience batch 5 + scenario ranking determinism

- **Tier C experience batch 5:** hand-written `experience` for Valdez, Missoula, Sunshine Coast, Bozeman, Cannon Beach, Grand Manan, Prince Rupert, and Coatepec; `liveSignals`, humidity, and/or sunshinePct where missing.
- **Scenario ranking determinism (`src/lib/__tests__/ranking-determinism.test.ts`):** guards that `runScenarioRanking` produces identical rows under shuffled pool order when a future climate layer is active.

### Dossier scenario honesty + Tier C experience batch 4

- **PlaceDetail scenario banner (`src/components/PlaceDetail.tsx`, `src/App.tsx`):** when a future climate layer is active, the dossier shows a compact honesty note that Explorer/Compare use the projection while the dossier stays on present-day normals.
- **Mobile scenario control (`src/components/ExplorerFilterSheet.tsx`):** filter sheet now embeds `ClimateScenarioControl` and counts the active scenario in the Filters FAB badge.
- **Tier C experience batch 4:** hand-written `experience` for Leadville, Brookings, Sitka, St. John's, Salt Spring Island, Haida Gwaii, Ensenada, and Xalapa; sunshinePct where missing.
- **Regression hardening:** PlaceDetail scenario-banner test; ExplorerFilterSheet scenario badge test; `playtest-polish` batch-4 anchors.

### Lens Receipt scenario chip + Tier C experience batch 3

- **Lens Receipt scenario chip (`src/components/FilterBar.tsx`, `src/App.tsx`, `src/components/ExplorerFilterSheet.tsx`):** when a future climate layer is active, the Explorer lens receipt shows a dismissible scenario chip and projection-aware summary line; dismissing resets `scn` to present-day.
- **Tier C experience batch 3 (`src/data/places.usa.ts`):** hand-written `experience` overrides for Apalachicola, Felton, Ellensburg, Joseph, Houghton, Viroqua, Columbia Gorge corridor, and Winthrop; `liveSignals`, humidity, and/or sunshinePct where missing.
- **Regression hardening:** `FilterBar` scenario-chip test; `playtest-polish` batch-3 anchors.

### Scenario/compare symbiosis + experience engine uplift

- **Compare under climate scenarios (`src/App.tsx`, `src/components/CompareView.tsx`):** when `scn≠now`, Compare now receives projected places from the Explorer pool (not present-day baseline) and shows an honesty banner; PlaceDetail dossiers stay present-day per URL invariants.
- **Scout brief scenario label (`src/lib/explorer-scout-brief.ts`):** leader summary annotates the active SSP layer when a future scenario is engaged.
- **Shortcuts climate-layer tip (`src/components/chrome/ShortcutsOverlay.tsx`):** documents the Climate layer control for discoverability.
- **Derived experience enrichment (`src/lib/place-overview.ts`):** non-authored reads weave primary driver labels into the feel line, relief/local-contrast snippets into spring/summer detail, and `liveSignals.note` into texture.
- **Tier C experience batch 2 (`src/data/places.usa.ts`):** hand-written `experience` overrides for Forks, Astoria, Point Reyes, Port Townsend, Grand Marais (MI), Cloudcroft, Crested Butte, and Marfa; sunshinePct + humidity where missing.
- **Regression hardening:** `ClimateScenarioControl` smoke test, Compare scenario banner tests, scout-brief scenario annotation, place-overview driver/relief tests; `playtest-polish` projected-compare + batch-2 anchors.

### Map affordances + discoverability

- **Map empty state (`src/components/AtlasMap.tsx`, `src/styles.css`):** when the current filters/search leave zero pins, the atlas now shows a clear "No places on the map" card (and an empty-aware `aria-label` / `role="status"` live region) instead of a blank, seemingly-broken canvas.
- **Zoom-limit feedback (`src/components/AtlasMap.tsx`, `src/styles.css`):** the map zoom-in / zoom-out buttons disable (dimmed, `not-allowed`, with a "Maximum/Minimum zoom reached" title) at the zoom limits instead of silently doing nothing. Keyboard `+`/`-` still clamp as before.
- **Cluster-picker scroll affordance (`src/styles.css`):** a long cluster's pick list now shows an always-visible thin scrollbar so 10+ pins read as scrollable rather than truncated at the fold.
- **Search shortcut discoverability (`src/App.tsx`):** the desktop tips now surface the global search shortcut (⌘K on Mac, Ctrl K elsewhere) alongside `/`, so power users discover the from-anywhere shortcut the keyboard layer already implements.
- **Compare-highlight keyboard affordance (`src/styles.css`):** the comparison "highlights" place names (which open the dossier) now have a visible `:focus-visible` ring and hover cue.
- **Corpus integrity guard (`scripts/sanity-check.ts`):** optional monthly arrays (`snowCm`, `humidity`, `sunshinePct`) are now length-validated (must be 12) like the required arrays, so a malformed optional array can't silently slip past the per-month range checks.

### Deterministic stability + map & UI polish

- **Stable livability ranking (`src/lib/livability-score.ts`):** `rankLivabilityWithBreakdown` now applies the documented name tiebreaker, so tied livability scores order identically regardless of corpus insertion order — keeping the hero top-ten preview stable as the atlas grows. It previously relied only on the engine's stable-sort-by-insertion order, unlike `rankLaces` (`scoring.ts`) and `rankLiveFit` (`live-fit.ts`).
- **Order-independent live-fit (`src/lib/live-fit.ts`):** a new `canonicalPresetOrder` sorts a `fitPresets` set by its position in `LIVE_FIT_PRESETS` before it feeds both the assessment cache key and the surfaced badges (`presets.slice(0, 3)`). A preset set built from a URL `fit=`, a lifestyle bundle, or chip toggles now yields the same cache hit and the same badge order — making the assessment a pure function of the set's contents.
- **Explicit comfort-month tiebreaks (`src/lib/comfort-precision.ts`):** the peak / sleep-recovery / easiest / hardest month picks break ties on calendar order rather than leaning on sort stability.
- **Determinism regression suite (`src/lib/__tests__/ranking-determinism.test.ts` new):** asserts corpus-wide order-independence of the livability ranking, its name-tiebreak resolution, preset-order independence of live-fit (cache key + computation), and calendar-order comfort-month resolution.
- **Map cluster keyboard focus (`src/components/AtlasMap.tsx`):** activating a cluster that zooms apart now returns focus to the map SVG, so keyboard / assistive-tech users keep arrow-key pin navigation instead of being dropped to `<body>`.
- **Dark back-to-top control (`src/styles.css`):** the place-dossier back-to-top pill gets a deep-glass dark-theme treatment instead of flashing the light-courtyard paper-white disc on the moonlit drawer.
- **Context-aware empty state (`src/App.tsx`):** the no-results panel now distinguishes a too-narrow search from a too-tight filter set (and the two combined), points at the control that is actually narrowing the list, and offers "Clear search" when only a query is active.

### Terraclima evolution v4.8

- **Apparent-comfort (UTCI-style) proxy (`src/lib/comfort-precision.ts`):** `apparentComfortIndex` reports a warm-season thermal-strain band (mirroring UTCI's 26/32/38 °C heat breakpoints) from air temperature + relative humidity and the wet-bulb shade proxy — **explicitly not a true UTCI** (no wind / solar / mean-radiant inputs, which the corpus does not carry). Surfaced in the place dossier comfort section and a `CompareView` row, each with an honesty caption.
- **2050 climate-scenario projection (`src/lib/climate-projection.ts` new):** deterministic `projectPlace` morphs 1991–2020 normals to mid-century SSP2-4.5 / SSP5-8.5 layers using a coarse **sourced regional anomaly table** (country + latitude band; IPCC AR6 Atlas, NASA NEX-GDDP-CMIP6) with high-latitude winter amplification and a wet-north / dry-southwest precip dipole. Illustrative regional projection, not a downscaled per-site forecast; authored `Place.projection` overrides win. New `scn=` URL param flips the whole Explorer (ranking, map, cards, compass, analogs); the dossier stays present-day.
- **Compute worker (`src/workers/climate-processor.worker.ts`, `src/hooks/use-climate-processor.ts`, `src/lib/climate-processor.ts` new):** the project→filter→rank pipeline runs off the main thread through a pure, shared `runScenarioRanking` orchestrator with a synchronous fallback. The worker is loaded lazily only when a future scenario is engaged (it carries the corpus), so the default present-day view downloads nothing extra. New typed messaging contract in `src/types/worker.ts`.
- **Native web-platform CSS (`src/styles.css`):** Tailwind v4 `@property`-registered animatable accent (motion-gated), first-class container queries on cards (`.place-card`), the card grid, and compare columns (`.tc-compare-col`), and a `@starting-style` entry on the scenario control.
- **Vite 8 (`vite.config.ts`):** `server.forwardConsole` forwards browser + Web Worker runtime errors/warnings to the dev terminal.
- **Pipeline guards (`scripts/sanity-check.ts`, `scripts/audit-corpus.ts`):** validate authored `Place.projection` deltas (finite, plausibility-bounded, SSP pathway ordering).

### Overview spotlight — "what it actually feels like"

- **Authored Tier C overviews (batch 1):** hand-written `experience` overrides for eight high-signal Tier C anchors — Boulder, Truckee, Mammoth Lakes, Borrego Springs, Sedona, Prescott, Taos, and Durango — spanning chinook foothills, Sierra cold pools, subalpine ski country, dark-sky desert, red-rock canyon Goldilocks, Arizona pine-belt refuge, high-desert artist light, and San Juan monsoon valley.
- **Authored Tier B overviews (batches 6–7 — Tier B complete):** hand-written `experience` overrides for the final sixteen Tier B anchors — Tug Hill, Valentine Sandhills, Loess Hills, Flint Hills, Eureka Springs, Niagara Peninsula, Atlin, Fernie, Baie-Saint-Paul, Zacatlan, Tapalpa, Mazamitla, Port Orford, Klamath Basin, Los Alamos, and Lander — completing authored coverage for all 54 Tier B places.
- **Authored Tier B overviews (batch 5):** hand-written `experience` overrides for eight more anchors — Huachuca Sky Island, Traverse City, Ithaca, Logan, Canaan Valley, Wolfville, Valle de Bravo, and Burkes Garden — spanning Madrean sky islands, Great Lakes fruit belts, Finger Lakes wine country, Cache Valley inversions, Appalachian boreal relicts, Atlantic orchard valleys, Mexican highland lakes, and eastern cold-air pools.
- **Authored Tier B overviews (batch 4):** hand-written `experience` overrides for eight more anchors — Grand Marais, Highlands (NC), Santa Fe, Tofino, Nelson, Cuernavaca, Creel, and Spearfish — spanning lake-moderated boreal shores, southern cloud forest, high-desert culture, hyper-maritime Pacific coast, Kootenay lake moderation, eternal-spring Mexico, Copper Canyon vertical gradients, and Black Hills chinook corridors.
- **Authored Tier B overviews (batch 3):** hand-written `experience` overrides for seven more anchors — Fairbanks, Whitehorse, Ashland, Mount Charleston, Valle de Guadalupe, Pátzcuaro, and Ajijic — spanning subarctic interiors, a dry aurora capital, Mediterranean valleys, a Mojave sky island, and lake-tempered Mexican highlands.
- **Authored Tier B overviews (batch 2):** hand-written `experience` overrides for eight more anchors — Driggs (Teton Valley), Gunnison, Death Valley, Hood River, Silver City, Todos Santos, Fort Davis, and (batch 1's) set — covering cold-pool basins, the continent's hottest desert, gorge orchard belt, sky islands, and Baja's Pacific oasis.
- **Authored Tier B overviews (batch 1):** hand-written `experience` overrides for eight high-signal Tier B anchors — Santa Barbara, Flagstaff, Victoria, Key West, Hilo, Bishop, Wenatchee, and Eureka — plus a localization fix where "single-digit … humidity" was wrongly rendered as a temperature band (Osoyoos, Bishop, and the pre-existing Yuma immersive now read in % terms).
- **Authored flagship overviews (`src/data/places.usa.ts`, `places.canada.ts`, `places.mexico.ts`):** hand-written `experience` overrides for all eight Tier A flagships — Sequim, Portal, Monterey, Black Mountain, Osoyoos, Lethbridge, Oaxaca City, and San Cristóbal de las Casas — with voice-driven feel lines, four bespoke season reads each, and traveler/resident/texture framing layered over the derived engine.
- **Humanistic overview spotlight (`src/lib/place-overview.ts`, `src/components/place-detail/PlaceOverviewSpotlight.tsx` new):** every dossier now leads with a vivid, season-by-season read of what the place actually feels like — an evocative lede + drop-capped immersive paragraph, a derived skin-level "feel line," a four-season walkthrough (Winter→Autumn, each with localized highs/lows, a 2–4 word headline, and a sensory detail), and traveler / resident / "who might not" framing. The `composePlaceExperience` engine derives this for all 226 places from the structured climate record; optional authored `Place.experience` fields override any part for flagship depth.
- **Dossier acts (`src/components/place-detail/place-detail-ui.tsx` `ZoneDivider`):** the long dossier is now segmented into readable zones — the lived read, "the data lab" (climate/terrain/measurements), "land & growing" (agriculture, soil, risk), and "fit, neighbors & sources" — so the geospatial analysis and agricultural data sit in their own clearly-labeled, well-crafted sections instead of interleaving with the human read.
- **Agriculture section (`src/components/PlaceDetail.tsx`):** "Soil & growability" reframed as "Agriculture & soil" with a crafted intro.
- **Reading nav (`place-detail-nav.ts`):** "Overview" + "Season by season" anchors lead the table of contents.
- **Schema (`src/types.ts`):** new optional `AuthoredExperience` (`Place.experience`).
- **Playtests:** `playtest-polish` asserts a complete experience read (4 ordered seasons, non-empty feel/fit/texture) for every place + authored-override precedence; `playtest-celsius` proves the engine is leak-free in °F and round-trips in °C.

### Post–v4.8 look + corpus polish

- **Comfort precision grid (`src/styles.css`):** five-card summary layout (UTCI* included) with `@container tc-comfort-precision` breakpoints; dark-theme card/month insets.
- **Climate scenario control (`src/styles.css`, `CompareView.tsx`):** deep-glass dark overrides for the v4.8 scenario layer switch; Compare UTCI* footnote uses semantic caption tokens.
- **Corpus sunshine (`src/data/places.usa.ts`, `places.canada.ts`):** monthly `sunshinePct` for eight flagship Tier B places (santa-barbara-ca, driggs-id, grand-marais-mn, highlands-nc, eureka-ca, victoria-bc, tofino-bc, nelson-bc).
- **Corpus lived friction (`src/data/places.usa.ts`, `places.canada.ts`):** `liveSignals` for driggs-id, grand-marais-mn, and nelson-bc with cited municipal/regional sources.
- **Round 2 corpus (`src/data/places.usa.ts`, `places.canada.ts`):** `sunshinePct` + `liveSignals` for flagstaff-az, wenatchee-wa, gunnison-co, logan-ut, fairbanks-ak, bishop-ca, hood-river-or, whitehorse-yt.
- **Round 3 corpus (`src/data/places.usa.ts`, `places.usa.extra.ts`, `places.usa.gap-states.ts`):** `sunshinePct` + `liveSignals` for canaan-valley-wv, redfield-ny, key-west-fl, klamath-falls-upper-klamath-basin-or, lander-sinks-canyon-wy, mount-charleston-nv, spearfish-sd, burkes-garden-va; `liveSignals` only for death-valley-ca (sunshine already present).
- **Round 4 corpus (`src/data/places.usa.ts`, `places.usa.extra.ts`, `places.canada.ts`, `places.mexico.ts`):** completes Tier B `liveSignals` coverage — valentine-ne, loess-hills-ia, flint-hills-ks, eureka-springs-ar (liveSignals only); hilo-hi, wolfville-ns, atlin-lake-bc, fernie-elk-valley-bc, baie-saint-paul-qc, valle-guadalupe-mx, todos-santos-mx (sunshinePct + liveSignals).
- **Round 5 corpus (`src/data/places.usa.ts`, `places.usa.extra.ts`, `places.canada.ts`, `places.mexico.ts`):** `sunshinePct` for silver-city-nm, ashland-or, fort-davis-tx, port-orford-cape-blanco-or, los-alamos-pajarito-plateau-nm, niagara-on-the-lake, cuernavaca-mx.
- **Round 6 corpus (`src/data/places.mexico.ts`):** completes Tier B `sunshinePct` — patzcuaro-mx, valle-de-bravo-mx, zacatlan-de-las-manzanas-mx, tapalpa-mx, mazamitla-mx, creel-mx, ajijic-lake-chapala-mx.
- **Round 7 corpus (`src/data/places.usa.ts`):** `climate.humidity` for bishop-ca, flagstaff-az, silver-city-nm, hood-river-or, ashland-or, driggs-id, fort-davis-tx, gunnison-co.
- **Round 8 corpus (`src/data/places.usa.ts`, `places.usa.gap-states.ts`, `places.canada.ts`):** `climate.humidity` for logan-ut, canaan-valley-wv, redfield-ny, key-west-fl, mount-charleston-nv, spearfish-sd, burkes-garden-va, wolfville-ns.
- **Rounds 9–10 corpus (`src/data/places.canada.ts`, `places.mexico.ts`):** completes Tier B `climate.humidity` — niagara-on-the-lake, atlin-lake-bc, fernie-elk-valley-bc, nelson-bc, whitehorse-yt, cuernavaca-mx, valle-guadalupe-mx, patzcuaro-mx, valle-de-bravo-mx, zacatlan-de-las-manzanas-mx, todos-santos-mx, tapalpa-mx, mazamitla-mx, ajijic-lake-chapala-mx.
- **Round 11 corpus (`src/data/places.canada.ts`, `places.usa.ts`):** completes Tier A `climate.humidity` (lethbridge-ab); Tier C `liveSignals` batch 1 — boulder-co, grand-marais-mi, apalachicola-fl, santa-cruz-felton-ca, ellensburg-wa, hood-river-gorge, truckee-ca, mammoth-lakes-ca.
- **Round 12 corpus (`src/data/places.usa.ts`):** Tier C `liveSignals` batch 2 — borrego-springs-ca, sedona-az, prescott-az, cloudcroft-nm, taos-nm, crested-butte-co, leadville-co, durango-co.
- **Playtest hardening (`scripts/playtest-polish.ts`):** all polish anchors now require sunshinePct, liveSignals, and humidity; Tier C live anchor list + Tier A humidity gate on lethbridge-ab.

### Maximum-effort symbiosis

- **Lifestyle lens parity:** [`src/lib/lifestyle-bundles.ts`](src/lib/lifestyle-bundles.ts) centralizes dock + hero bundles; auto-switch to **`live-fit`** ranking when Live Finder constraints are active without a full bundle match; dismissible Lens Receipt chips with `aria-live="polite"`.
- **Map ↔ list coupling:** `AtlasMap` pans to selected pin; `VirtualPlaceGrid` scrolls selected card into view (debounced, respects reduced motion).
- **Compare → profile:** column titles and insight strips open the place dossier (`onOpenPlace`).
- **Share depth:** `CopyPlaceLink` routes through `shareUrl()` and keeps `#deep-…` dossier section hashes on copy.
- **Corpus:** monthly `climate.humidity` for 28 fog-belt / cool-summer-maritime places (sanity humidity WARNs → 0).
- **A11y:** mobile filter FAB labeled **Filters**; Living Compass screen-reader leader summary; `playtest:polish` remote-work bundle URL round-trip.

### Playtest hardening and debug fixes

- **BookmarkButton test:** propagation test uses a `div` wrapper (matches production sibling layout; removes nested-button Vitest stderr).
- **PlaceCard test:** asserts bookmark chip is not inside `.place-card__open-target`.
- **Corpus:** `humidity` on Bar Harbor + Highlands; `liveSignals` on Highlands and Xalapa (clears top-20 remote-work sanity gaps).
- **`playtest:polish`:** empty/active filter signals, `liveFitPresetsPoolPass` anchors (Sequim vs Death Valley).

### Corpus, contract, and deterministic stability

- **Filter contract (ported from `593ab79` onto current `main`):** `filterStateFromValidated()`, `hasActiveExplorerFilters()`, `countActiveExplorerFilterSignals()` in `src/lib/scoring.ts`; shared URL hydration in `App`; Lens Receipt **Clear all**; extended `playtest:polish` (polluted filters, empty pool, cleared Live Finder URL params, `data-motion` smoke).
- **Live Finder `fitPresets` pool:** non-empty presets require `presetScore >= 50` per active id in `liveFitFilterPass`; documented in `docs/URL-INVARIANTS.md` (`fit`, `sh`, `wl`, `grow`, `fire`, `risk`).
- **Dead elevation filters removed** from `FilterState` / `applyFilters` (no URL or UI).
- **Corpus guardrails:** `scripts/corpus-coverage-report.ts` + `npm run corpus:coverage` (warn-only in `quality:check`); tier-aware sanity WARNs for fog/cool-maritime without humidity and top-ranked remote-work/retirement gaps without `liveSignals`.
- **Corpus-rank-gold:** five new anchors (`oaxaca-mx`, `banff-ab`, `los-alamos-pajarito-plateau-nm`, `victoria-bc`, `nelson-bc`).
- **Bounded editorial:** `liveSignals` for top-ranked remote-work/retirement shortlist places; humidity on Cape May and Mystic maritime entries.

### UI beauty, symbiosis, and fluidity

- **Beauty tokens (`src/lib/theme-tokens.ts`, `src/styles.css`):** `--tc-shadow-elevated`, inset/glass/accent/glow/focus/motion duration tokens; utilities `.tc-inset-panel`, `.tc-accent-panel`, `.tc-surface-glass`, `.tc-icon-ochre`.
- **Explorer chrome:** lens receipt jewel styling + full dark block; hero quick-picks glow; filter dock shadow tier; `EmptyResults` designed moment (`.tc-empty-results`).
- **Cards & overlays:** place-card selected ring, climate-bar “now” highlight, rank medal sheen; `.place-detail-drawer` shadow; reading nav `.tc-reading-nav-link`; FilterBar Live Finder / lifestyle panels on tokens.
- **Symbiosis:** migrated paper leaks in PlaceDetail insets, reading nav, AtlasMap loading pill.
- **Fluidity:** `html[data-motion]` from `motionPolicy()`; unified view-enter, glass dialog, and Framer drawer/scrim timings via `device-profile` constants.

### Playtest hardening

- **Clear all filters (`src/lib/scoring.ts`, `FilterBar`, `App`):** `createEmptyFilterState()` is the single reset shape; clears Live Finder numeric/risk constraints and elevation limits, not only search/country/archetype/presets. Live Finder inline control renamed to **Clear presets**.
- **Place profile copy link (`src/components/place-detail/CopyPlaceLink.tsx`):** uses `writeClipboardText` with Copied / Copy failed feedback and unmount-safe status reset.

### Filter contract polish

- **`filterStateFromValidated()`** centralizes URL → `FilterState` hydration in `App` (first paint + Back/Forward).
- **`hasActiveExplorerFilters()`** / **`countActiveExplorerFilterSignals()`** unify FilterBar clear affordances and the mobile filter-sheet badge.
- **Lens Receipt** clear control labeled **Clear all** with `aria-label="Clear all filters"`.
- **`playtest:polish`** now regression-tests filter clear + live-fit URL omission; App shell smoke test for bookmark writes when `localStorage` throws.

### UI & visual quality pass (deterministic stability)

- **Semantic tokens (`src/lib/theme-tokens.ts` new, `src/styles.css`):** `--tc-surface-*`, `--tc-border-*`, `--tc-scrim`, `--tc-chip-*` custom properties remapped in dark mode; mirrored in TypeScript for Vitest.
- **Dark depth:** nested hero chips, living-compass rank rows, place-card internals, FilterBar search, PlaceDetail header (`data-tone` gradients), `.btn-primary`, `.kbd`, filter dock, `.text-depth-hero`.
- **Chrome:** `.tc-modal-scrim`, `.tc-nav-btn`, `.tc-header-help-btn`, theme-aware `ErrorBoundary` + `LogoMark`; CompareView mobile hint uses `ChevronRight`.
- **PlaceCard:** `referenceMonth` override for tests, `.text-caption` utilities, `place-card__inset-panel`, stat tones via `data-tone` CSS.
- **Shortlist export UI (`src/components/chrome/ShortlistExportMenu.tsx` new):** JSON / CSV / GeoJSON / ICS download on the pinned shortlist rail (`src/lib/download-blob.ts`).
- **Motion (`src/lib/device-profile.ts`):** `motionPolicy()` gates AtlasMap topo fade durations; `PlaceBackToTop` uses `prefersReducedMotion()`; `src/test-helpers/motion.ts` for tests.
- **Stability gate:** `npm run playtest:polish` in `quality:check`; SVG golden snapshots for `ClimateRibbon` + `MicroclimateFingerprint`; `dark-theme-css` regression test; dark-theme App shell smoke test.

### Maximum-effort polish pass (Phases 1–12)

A single multi-commit pass shipped under one PR. Each phase below is its own commit; every commit individually passes `npm run quality:check`. Test coverage on the branch grew from 484 cases to 624 (+140 cases over ~20 new test files).

- **Defect cleanup (`src/App.tsx`, `src/components/PlaceDetail.tsx`, `src/styles.css`):** removed a hidden `current-rank-strip` block in `HeroCard` that shipped ~38 lines of DOM no user ever saw; collapsed the bit-identical `onPickCollection` / `onPickTripTheme` handlers and threaded `surpriseMe` through `pickRandomPlace`; gated `DesktopScoutBoard` mounting on `(min-width: 1180px)` to match the existing CSS hide; lifted `getPlaceVisualSignature` out of double-compute in PlaceDetail; dropped the `_panelRef` reserved-but-unused prop; deleted ~360 LOC of dead CSS (`current-rank-strip`, `signature-constellation`, `.shimmer` keyframe + class, `.grid-12`, `.glow-ochre`/`sage`, `.text-shadow-soft`, `.focus-ring`, `.ExplorerFilterSheet` print selector).
- **Accessibility hardening (`src/components/PlaceDetail.tsx`, `src/components/CompareView.tsx`, `src/components/AtlasMap.tsx`, `src/components/PlaceCard.tsx`, `src/components/FilterBar.tsx`, `src/styles.css`, `src/App.tsx`):** skip link upgraded to `:focus-visible`; PlaceDetail Compare button now exposes `aria-pressed` + state-specific label; driver chips expose `aria-expanded` + `aria-controls` bound to a `useId` panel id; glossary expand respects `prefers-reduced-motion`; CompareView restructured so the scrim is `aria-hidden` without hiding the dialog via ancestor rule; `aria-modal` added to the cluster picker and mobile map legend; mobile Tips button + FilterBar clear button raised to 44 px on coarse pointers; PlaceCard open button switched from `aria-pressed` to `aria-current` (cards are navigation, not toggles).
- **Map keyboard rework (`src/lib/atlas-map-keyboard.ts` new, `src/components/AtlasMap.tsx`):** roving-tabindex across the marker layer means only the focused marker carries `tabIndex={0}` (down from "every visible pin"); new `nextMarkerId` / `endpointMarkerId` / `isMarkerKeyboardTarget` helpers drive arrow-key navigation between visible pins (Left/Right wrap circularly in render order; Up/Down bucket markers by screen-Y and pick the closest X in the adjacent row; Home/End jump). The SVG-level pan-by-arrows now bails when focus is on a marker so we don't both step a pin and pan.
- **Dark mode (`src/lib/theme.ts` new, `src/components/chrome/ThemeToggle.tsx` new, `src/styles.css`, `index.html`, `src/lib/app-url.ts`, `docs/URL-INVARIANTS.md`):** three-state Auto / Light / Dark control in the top bar and mobile site menu. Preference resolves URL `?theme=…` → localStorage → "auto"; URL invariants doc updated. Full dark-theme override block in `styles.css` scoped to `html[data-theme="dark"]`; the intentionally-dark atlas map shell is untouched. `index.html` ships paired `theme-color` metas and a `prefers-color-scheme: dark` block in the inline critical CSS so dark-OS users don't flash bright paper before mount.
- **PlaceDetail dossier extraction (`src/components/place-detail/*.tsx` new):** PlaceDetail.tsx shrank from 1,763 → 1,286 lines (-27%). New per-section files: `PlaceResidencyBrief`, `PlaceComfortPrecision`, `PlaceBackToTop`, `PlaceReadingProgress`, plus a shared `place-detail-ui.tsx` carrying `Section` / `KeyValue` / `LabelRow` / `Legend` / `ScorePill`. New `src/lib/place-signals.ts` exposes the pure `synthesizePlaceSignals` for the "How the numbers read together" section with its own unit tests.
- **AtlasMap helper extraction (`src/lib/atlas-map-{geometry,zoom,scale-bar}.ts` new):** pure helpers + a shared `zoomAtScreenPoint` used by both wheel zoom and double-tap zoom (removing two near-identical anchor-preserving matrix updates). Each module ships its own test file; the `wheelZoomFactor` re-export from `AtlasMap` preserves existing imports.
- **App chrome + helper extraction (`src/components/chrome/*.tsx` new, `src/lib/{clipboard,view-transition,lazy-views,app-constants}.ts` new):** `App.tsx` lost ~200 lines. `LogoMark`, `Footer`, `ShortcutsOverlay` (with its local `Kbds`) moved into `src/components/chrome/`. `writeClipboardText`, `runViewTransition` + `ViewTransitionDocument`, the lazy-view + preload helpers, and the shared constants (`SEARCH_INPUT_ID`, `SHORTCUTS_SEEN_KEY`, `ShareStatus`) moved into `src/lib/`.
- **Test coverage closure:** the 5 previously-untested lib modules (`scroll-within-container`, `place-at-a-glance`, `device-profile`, `atlas-metadata`, `atlas-map-topology`), the previously-untested `use-media-query` hook, and component smoke tests for `BookmarkButton`, `ErrorBoundary`, `FootprintPanel`, and all 7 charts (`ClimateRibbon`, `PrecipBars`, `ComfortMatrix`, `ContrastChart`, `MiniClimateStrip`, `RiskProfile`, `ClimateChangeDelta`).
- **PWA + installability (`public/icon-*.png` new, `public/sw.js` new, `src/lib/pwa.ts` new, `scripts/generate-icons.ts` new):** PNG icon ladder (180 × 180 Apple touch, 192 × 192, 512 × 512, plus a 10%-inset 512 × 512 maskable for Android adaptive icons) generated by a dependency-free script (same node-zlib + manual PNG approach as `scripts/generate-og-image.ts`). New `public/site.webmanifest` ladder + maskable purpose. Service worker precaches the app shell and stale-while-revalidates hashed assets so the atlas opens fully offline after a single visit. Registration helper installs only in production, bails silently on unsupported browsers, and reloads once on `controllerchange` so updates roll out cleanly. `scripts/check-site-metadata.ts` locks the icon ladder, maskable purpose, dark-theme color pair, and the new privacy / locale metas into the quality gate. Run `npm run generate:icons` to regenerate from source.
- **Privacy + locale metas (`index.html`):** `<meta name="referrer" content="strict-origin-when-cross-origin">` so clicking out to a citation URL doesn't leak the full query string (selected place id, ranking, filters) to third-party hosts; `<meta property="og:locale" content="en_US">` so share-card renderers pick the right localised chrome.
- **Web Share + shortlist export (`src/lib/share.ts` new, `src/lib/shortlist-export.ts` new):** `shareUrl` wraps `navigator.share` with a clipboard fallback (and treats a user-cancelled share as success, not failure). `App.tsx`'s Copy view button now routes through `shareUrl` so mobile and modern Safari get the OS share sheet. Four pure exporters for the shortlist — JSON / CSV (RFC 4180-quoted) / GeoJSON (RFC 7946 FeatureCollection) / ICS (RFC 5545 VCALENDAR with one VEVENT per place sized to its best-month window) — return `{ body, filename, mimeType }` so the caller owns the download mechanic.

### Mobile chrome touch targets (`src/styles.css`)
- **Hamburger header trigger, floating filter-sheet pill, and place-detail close icon (`src/styles.css`):** Three mobile-chrome controls previously rendered below 44 px on phones — the hamburger at 36 × 44, the floating filter-sheet trigger at 37 × 37 (its `(max-width: 480px)` icon-only mode collapsed it to a square), and the place-detail close button at 34 × 46 (the `btn-ghost` height rule won, but the `!p-2` icon padding kept the width thin). Under `@media (pointer: coarse)` the first two now hit a 44 × 44 px floor via `min-width` / `min-height`, and the close button picks up `min-width: 44px` so it widens to a thumb-friendly hit area without disturbing its desktop look. The text-bearing wider variants on desktop (e.g. the menu trigger above 560 px) are unaffected — those are hidden anyway.

### Map cluster picker focus & escape (`src/components/AtlasMap.tsx`, `src/styles.css`)
- **Escape now closes the cluster picker (`src/components/AtlasMap.tsx`):** When two or more atlas pins overlap, tapping the cluster opens a picker dialog listing the nearby microclimates. Previously, the only way to dismiss the picker without choosing a place was the small close button or panning the map — Escape did nothing because the global shortcut hook didn't know about the picker. The picker now installs a capture-phase Escape listener that closes it locally, leaving the rest of the Escape precedence chain (overlays → search-clear) untouched.
- **Keyboard focus moves into the picker on open and out again on close (`src/components/AtlasMap.tsx`):** The picker now uses `useFocusTrap` with `restoreFocus: true` and auto-focuses its close button on mount. Tab is trapped inside the dialog (close button → place options → back to close), and on dismissal — whether via Escape, the close button, or a place selection — focus returns to the cluster pin that opened it instead of dropping to `<body>`.
- **Cluster picker close button is now a 46×46 px tap target (`src/styles.css`):** Under `@media (pointer: coarse)`, the `.map-legend-close` icon button grows from its desktop 32×32 px to match the other coarse-pointer affordances added in the previous tap-target pass.
- **Bookmark pin chip joins the 46 px coarse-pointer family (`src/styles.css`):** The `.tc-bookmark-chip` round pin (pin/unpin a place on the card or in the dossier header) was 30×30 px on every device. A new `@media (pointer: coarse)` block placed *after* the base rule (so it wins on source order at the same specificity) brings it to 46×46 px on touch while leaving the compact desktop chip unchanged.

### Touch & state-update hygiene
- **44 px touch targets on coarse pointers (`src/styles.css`):** Live Finder chips, hero quick-picks, ghost buttons, and the temp/distance toggles are now ≥ 46 px tall under `@media (pointer: coarse)` — they previously rendered at 26–30 px on every device. The desktop dock keeps its compact size; only touch and stylus inputs see the larger hit area, joining the existing `.map-btn` rule that already met WCAG 2.5.5 AAA. The 46 px target leaves a 2 px safety margin so sub-pixel rounding on high-DPR phones (iPhone DPR 3, Android DPR 2.625) still clears 44 px.
- **Functional-updater hygiene in FilterBar (`src/components/FilterBar.tsx`):** Three lingering `setFilters({ ...filters, … })` closure-capture callbacks (the search input's onChange and the two "clear" buttons for Live Finder presets and archetypes) now use functional updaters (`setFilters(f => ({ ...f, … }))`), matching the rest of the file. Eliminates the latent risk that a fast concurrent update — search keystroke + filter chip click in the same tick — could base its merge on a stale captured `filters` and silently clobber the other change.

### Keyboard symbiosis & input polish
- **Cmd/Ctrl+K focuses Explorer search (`src/hooks/use-keyboard-shortcuts.ts`, `src/App.tsx`):** Modern command-palette convention added alongside the existing `/` shortcut. Cmd/Ctrl+K is deliberately global — it fires even when a text input has focus (matching GitHub / Linear / Notion / Slack), so a user already typing somewhere else can jump to Explorer search without first reaching for the mouse. Shift / Alt modifiers fall through (Ctrl+Shift+K is reserved for DevTools; Alt+K for OS accents). Suppressed while a place profile, compare panel, filter sheet, site menu, or shortcuts dialog owns the screen.
- **Select-on-focus for the Explorer search input (`src/App.tsx`):** When `/` or Cmd/Ctrl+K refocuses the input and there is already a query in the field, the existing text is pre-selected so the next keystroke replaces it cleanly. Matches the established command-palette / browser-omnibar pattern.
- **Escape clears a non-empty Explorer search (`src/hooks/use-keyboard-shortcuts.ts`):** When no overlay is in the way (no place profile, compare panel, filter sheet, site menu, or shortcuts dialog) and the search field is focused with a non-empty value, Escape clears the query and keeps focus on the input so a fresh search can be typed immediately. Overlay-close precedence is preserved — Escape still closes the topmost overlay first.
- **Stable global keydown listener (`src/hooks/use-keyboard-shortcuts.ts`):** The shortcut hook now reads its dependencies through a ref instead of subscribing them to the `useEffect` deps array, so the global `keydown` listener is installed exactly once per mount instead of churning on every view switch, overlay open/close, or selection change. Same behaviour, less per-render work.

### Major improvements
- **Shortlist decision matrix (`src/lib/decision-matrix.ts`, `src/lib/explorer-scout-brief.ts`):** Explorer scout briefs now translate the current top five into decision rows: live-here fit, felt comfort, easy months, risk load, land/garden signal, best-fit audience, and the first caveat to inspect. The desktop relocation workbench gets a compact top-three matrix, while the full scout brief exposes all five rows as open-profile controls.
- **Compare as a decision surface (`src/components/CompareView.tsx`):** Compare now promotes live-here fit and livability in the highlight strip and adds live-here fit, livability, felt comfort, easy months, and lived ease to each comparison column, so comparing leaders does not drop the comfort intelligence added by the ranking model.
- **Human comfort v3 (`src/lib/livability-score.ts`, `src/lib/scoring.ts`):** Adds an explicit atmospheric-ease component covering sky/fog, wind exposure, humidity or arid-air strain, smoke/air, and solar burden. Live-fit now weights felt comfort and atmosphere ahead of novelty, and the new **Most comfortable** ranking profile sorts by how a place is likely to feel on the ground. Calibration anchors now keep dry highland comfort places like Silver City and Saltillo ahead of fog-belt coasts, Death Valley heat, and Alaska cold. Each place also gets a deterministic plain-language comfort read so cards, map hovers, and dossiers explain the ranking in human terms instead of only exposing numbers.
- **Lived-friction signals (`liveSignals` on Place, `src/lib/livability-score.ts`):** Adds a 6th livability component covering cost pressure, social-fabric stress, and daily-services access. Climate-perfect fog-belt coasts (Monterey, Eureka, Point Reyes) and isolated outer-coast outposts (Tofino, Prince Rupert, Haida Gwaii, Valdez) used to monopolise Live-fit / remote-work / retirement rankings; the new axis pulls them back to where resident-review sentiment and cost-of-living data place them, while crediting easier-to-live highland and rain-shadow towns. Surfaces in the place dossier as a "Lived signals" section with cited sources, in PlaceCard as a friction chip-row, and in Live-fit cautions as targeted, single-line warnings.
- **Live-fit weight rebalance (`src/lib/live-fit.ts`):** Uniqueness contribution dropped from 0.13 → 0.04 (microclimate novelty is editorial, not a relocation signal); felt-comfort, seasonal runway, sunshine, hazard ease, and the new lived-friction axis absorb the freed weight. Live-fit cautions now show up to three drivers (was two) so affordability, social, and access reads land alongside hazard reads.
- **Felt-comfort rebalance (`src/lib/livability-score.ts`):** Sky-comfort weight inside felt comfort went 0.12 → 0.20 and curator comfort weight 0.24 → 0.16, so persistent summer-stratus marine layers are no longer masked by a curated "feels mild" anchor. Sky-comfort itself adds an explicit summer-sunshine-collapse penalty for measured-dim summers (Eureka, Fort Bragg, Point Reyes signature) and the dampness penalty rises modestly.
- **Profile-specific lived penalties (`src/lib/scoring.ts`):** `best-for-remote-work` deducts an access-friction penalty (remote workers need broadband + reliable air travel); `best-retirement` deducts both cost-pressure and access-friction penalties (retirees are highly sensitive to specialty-care distance and housing burden).
- **Livability lens v2 → v2.1 (`src/lib/livability-score.ts`):** Bidirectional thermal-comfort plateau (18..26 °C summer, −4..+12 °C winter) with humidity-aware summer tax and diurnal recovery credit. Tail-risk-aware hazard cushion (0.55 × mean-of-9 + 0.45 × max-of-9 with stronger max multiplier). U-shaped precipitation moderation. New 6-component blend weights that sum to 1.0 (resilience 0.22, thermal comfort 0.26, hazard cushion 0.20, growability 0.12, precip moderation 0.08, lived friction 0.12). Per-place `scoreLivability()` returns the breakdown so the UI can show drivers, drags, and a per-component rationale. Atlas-wide `livabilityPercentiles()` answers "is this place better than the median Terraclima entry?"
- **Persistent shortlist & recently-viewed:** Added `localStorage`-backed bookmarks and most-recent-first place history. Pin from any card or the place-detail header, jump back via two new Explorer hero rails, or press **B** to toggle the active profile.
- **Print-friendly place profiles:** New `@media print` stylesheet hides chrome and renders only the open profile as a clean one-page brief.
- **Reading progress + back-to-top in PlaceDetail:** Thin sticky progress bar tracks scroll inside the dossier; a circular back-to-top button appears after deep scrolling.

### Corpus accuracy & climate-class verification
- **Deterministic Köppen-Geiger classifier (`src/lib/koppen.ts`):** computes each place's Köppen class directly from its authored monthly temperature + precipitation normals (Peel et al. 2007 conventions; Northern-Hemisphere seasons), inventing no climate facts. The authored `koppen` string is now an independently verifiable, data-backed signal — the place "Climate class" at-a-glance tile shows whether the label is confirmed by the normals or sits on a documented Köppen boundary.
- **Climate-class + physical-plausibility audit (`scripts/sanity-check.ts`):** the corpus gate cross-checks every authored Köppen label against the computed class and errors only on a *gross* family mismatch with no nearby class threshold; near-threshold knife-edges (the inherent ambiguity of the system) are expected and only summarised. A full audit of all 226 places found **zero gross labelling errors** (170 exact matches, 41 sub-class and 15 boundary knife-edges). A new snow-plausibility check — snowfall recorded at a place whose coldest month never approaches freezing — caught and fixed a spurious snow normal at Port Orford / Cape Blanco, OR.
- **Robustified Köppen consumers (`src/lib/scoring.ts`, `src/lib/comfort-precision.ts`):** the `mediterranean-like` ranking bonus and the climate-analog humidity-family signal now read the computed/parsed class instead of a brittle `startsWith` prefix, so multi-zone labels like `"BSk (valley) / Csb analog (summit)"` are credited correctly.

### Bioclimatic indices
- **Five citable, deterministic indices (`src/lib/bioclim.ts`):** De Martonne aridity (1926), Conrad continentality (1946), Thornthwaite annual PET (1948) with the standard solar-declination daylength correction, Selianinov hydrothermal coefficient (1928) using days-in-month-weighted growing-season degree-days, and the UNEP P/PET aridity ratio (1992). Each index is a pure function of the authored monthly normals + latitude, returns `{ value, class, classLabel }` or a structured `{ value: null, reason }` for documented edges (MAT ≤ −10 °C, no growing-season month, all months frozen), and is locked by hand-traced exemplars (Sequim Csb → Mediterranean / Oceanic / arid HTC; Phoenix BWh → Arid / Sub-continental / dry HTC; Singapore Af → Extremely humid / Extreme oceanic / wet HTC).
- **Atlas-wide percentile context (`src/lib/atlas-corpus-stats.ts`):** new sorted distributions for every index, plus `getPlaceBioclimRanks(place)` exposing the per-place percentile share so the UI can show "higher than 78% of the corpus" alongside each index value. The corpus-health invariant validates sorted, finite distributions for all five indices.
- **"Bioclimatic indices" section in the place dossier (`src/components/place-detail/PlaceBioclimaticIndices.tsx`):** new section between Comfort precision and Practical read, rendering five compact cards — each with the numeric value, class label, corpus percentile, original citation, and a plain-language read of what the index means for this place.
- **CompareView indices row (`src/components/CompareView.tsx`):** the side-by-side comparison now exposes all five bioclimatic indices per place so leaders can be evaluated on standardised climate-science measures, not just authored Köppen.
- **Sanity guardrails (`scripts/sanity-check.ts`):** the audit fails on non-finite index values and warns on out-of-range numerics (De Martonne `[0, 500]`, Conrad `[−20, 130]`, PET `[0, 2500]` mm/yr with a low-PET warning for warm climates, Selianinov `≤ 50`, UNEP `[0, 8]`). The corpus passes with **0 errors / 0 warnings** and the run prints a `Bioclimatic indices: 226 classified · 3 Selianinov null (no growing season)` summary line.
- **Glossary entries (`src/data/glossary.ts`):** five new concept entries (De Martonne, Conrad, Thornthwaite PET, Selianinov, UNEP) with one-sentence definitions, two-to-four-sentence backgrounds, and mechanism notes citing the original sources.

### Reliability & a11y
- **Atlas map survives a topology-load failure (`src/components/AtlasMap.tsx`):** a failed border/country chunk no longer leaves the map silently incomplete forever. `loadTopo()` now clears its module cache on error (matching the existing PlaceDetail/Compare lazy-loader pattern) so a remount re-attempts the import, and a focusable **Retry loading map borders** control appears beside the zoom buttons while pins, ocean, graticule, and controls stay usable.

### UX & a11y
- Added the **B** keyboard shortcut to toggle the bookmark state of the open profile (ignores modifier keys and text-input focus to avoid hijacking ⌘+B).
- Added livability blend chip-row in the Explorer hero exposing v2 weights with tooltips that document the formula.
- Added a Livability breakdown panel to every place profile with per-component bars and driver/drag chips.

### Tests & guardrails
- Added `src/lib/__tests__/koppen.test.ts` (29 cases): the classifier locked to textbook exemplars (Af, BWh, BSk, Csa, Cfb, Cfc, Cfa, Dfb, Dfd, ET, EF), the corpus hand-traces (Sequim Csb, Osoyoos BSk, Oaxaca Cwa), the C/D 0 °C and B-priority boundaries, degenerate-input handling, and the parse/audit (match / sub-class / boundary / divergent) reconciliation — plus a `mediterranean-like` ranking test proving a Csb zone inside a multi-zone label is credited.
- Added unit coverage for previously-untested pure logic — map viewport-fit math (`atlas-map-fit`, 12 cases incl. empty/degenerate viewports, single-point collision, width/height-dominated fits, min/max-K clamping, and the non-positive-inset fallback), map label formatting (`atlas-map-label`), and dossier URL/hash sync (`dossier-url-hash`) — plus a DOM regression test asserting the map surfaces a retry control and keeps pins usable when topology fails to load.
- 60+ new unit + integration tests across bookmarks, recent history, livability v2 (component bounds, monotonicity, blend math), corpus-wide smoke tests, the keyboard-B shortcut, and the new hero rails.

### Earlier in the cycle
- Added a copy-current-view control for shareable Explorer URLs.
- Tightened the desktop current-rank rail so all five leaders fit cleanly at common atlas widths.
- Added corrected repository improvement context for future maintainers and agents.
- Centralized public app metadata in `src/lib/site-metadata.ts`.
- Added WebApplication JSON-LD to the static shell.
- Added `npm run check:metadata` to keep canonical, Open Graph, manifest, robots, sitemap, and 404 metadata aligned.
- Added a top-of-profile Practical read section for agriculture, spatial evidence, homes and land, and nearby trips.
- Added deterministic A/B corpus polish coverage for practical cards, activities, settlement/scouting anchors, nearby context, and richer dossier sections.
