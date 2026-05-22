# Changelog

All notable changes to Terraclima are tracked here.

## Unreleased

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

### Reliability & a11y
- **Atlas map survives a topology-load failure (`src/components/AtlasMap.tsx`):** a failed border/country chunk no longer leaves the map silently incomplete forever. `loadTopo()` now clears its module cache on error (matching the existing PlaceDetail/Compare lazy-loader pattern) so a remount re-attempts the import, and a focusable **Retry loading map borders** control appears beside the zoom buttons while pins, ocean, graticule, and controls stay usable.

### UX & a11y
- Added the **B** keyboard shortcut to toggle the bookmark state of the open profile (ignores modifier keys and text-input focus to avoid hijacking ⌘+B).
- Added livability blend chip-row in the Explorer hero exposing v2 weights with tooltips that document the formula.
- Added a Livability breakdown panel to every place profile with per-component bars and driver/drag chips.

### Tests & guardrails
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
