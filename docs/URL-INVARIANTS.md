# URL and compare invariants (Terraclima)

Executable checks live in [`src/lib/app-url.ts`](../src/lib/app-url.ts), [`src/lib/__tests__/app-url.test.ts`](../src/lib/__tests__/app-url.test.ts), and `npm run quality:check`.

## Parameters

| Param | Meaning | Validation |
|-------|---------|------------|
| `v` | View: `explorer` (default), `trips`, `collections`, `learn` | Unknown or retired values -> `explorer` |
| `p` | Selected place id | Omitted if id is not in corpus |
| `col` | Active collection id or climate-trip theme id | Omitted if id is not in curated sets |
| `c` | Countries, comma-separated (`USA`, `Canada`, `Mexico`) | Non-members stripped |
| `a` | Archetype ids, comma-separated | Filtered to known archetypes when validator provided |
| `q` | Search string | Trimmed for round-trip |
| `cmp` | Compare set, comma-separated place ids | Only known ids; **max 4** (`COMPARE_LIMIT`) |
| `theme` | Color theme override: `light`, `dark` | `auto` (the implicit default) is never written; unknown values dropped |
| `scn` | Climate-scenario layer: `ssp245`, `ssp585` | `now` (the implicit default) is never written; unknown values dropped |

## Live Finder parameters (Explorer filters)

Hydration uses [`filterStateFromValidated()`](../src/lib/scoring.ts) from validated URL fields. Numeric/risk params and active `fit` presets narrow the place pool via [`liveFitFilterPass()`](../src/lib/live-fit.ts); each active preset requires `presetScore` ≥ 50.

| Param | Meaning | Validation |
|-------|---------|------------|
| `fit` | Live Finder preset ids, comma-separated | Allowlisted in `LIVE_FIT_PRESET_BY_ID`; unknown ids dropped |
| `sh` | Summer high cap (°C, encoded) | Allowlisted in `app-url.ts` (`LIVE_FIT_SUMMER_CAPS_C`) |
| `wl` | Winter low floor (°C, encoded) | Allowlisted (`LIVE_FIT_WINTER_FLOORS_C`) |
| `grow` | Growability floor (0–100) | Allowlisted (`LIVE_FIT_GROWABILITY_FLOORS`) |
| `fire` | Wildfire risk ceiling | `low`, `moderate`, `high`, `extreme` |
| `risk` | Overall risk ceiling | Same risk tokens |

Omitted when unset (clear-all / empty state): `fit`, `sh`, `wl`, `grow`, `fire`, `risk`, and `q`.

## Lifestyle bundles (hero + FilterBar dock)

Six curated bundles live in [`src/lib/lifestyle-bundles.ts`](../src/lib/lifestyle-bundles.ts). Applying a bundle sets **`r`** (ranking profile) and the Live Finder fields above (`fit`, `sh`, `wl`, `grow`, `fire`, `risk`) in one shot. Hero quick-picks that overlap a bundle (remote work, retirement, garden, snow, fire-safe) call the same `applyLifestyleBundle()` path as the dock chips.

**Auto live-fit sort:** When Live Finder constraints are active (any preset or numeric/risk cap) but no lifestyle bundle is fully active and **`r`** is not `live-fit`, Explorer switches ranking to **`live-fit`** so the list sorts with `rankLiveFit()`. Lens Receipt may note when display ranking and live-fit sort diverge.

**Lens Receipt chips:** Each active explorer signal renders as a dismissible chip; removing one field uses a functional `setFilters` update (search, country, archetype, presets, and caps are independent).

## Climate scenario layer (`scn`)

The "2050 time machine" ([`src/lib/climate-projection.ts`](../src/lib/climate-projection.ts)) reshapes the whole Explorer — ranking, map, cards, compass, analogs — by morphing the authored 1991–2020 normals with a mid-century CMIP6 anomaly.

- `scn=ssp245` (SSP2-4.5 "middle of the road") and `scn=ssp585` (SSP5-8.5 "high emissions"); `now` is the default and is never written.
- The projection is an **illustrative coarse regional anomaly** (sourced country + latitude-band table; IPCC AR6 Atlas / NASA NEX-GDDP-CMIP6), not a downscaled per-site forecast. A place may carry an authored, cited `Place.projection` override.
- The place **dossier still shows present-day normals**; only the Explorer aggregate views project.
- **Compare** uses the same projected normals as the active Explorer layer when `scn≠now` (charts, ribbons, and screening scores). Opening a place profile from Compare still loads present-day dossier data.
- Ranking under a scenario flows through the climate-processor worker subsystem ([`src/hooks/use-climate-processor.ts`](../src/hooks/use-climate-processor.ts)); a synchronous fallback keeps the result identical when no worker is available.

## Formatting rules

- Default view (`explorer`) omits `v`.
- Retired view links, including `?v=pro`, canonicalize back to Explorer instead of rendering a dead route.
- Countries and archetypes are sorted for stable URLs.
- History flag `tcPlace` on pushState indicates "opened place in-app" so **Back** closes the panel instead of leaving the site.

## Compare cap

- At most **4** ids in `cmp` and in memory (`Set` eviction drops oldest).
- A shared URL with two or more valid `cmp` ids opens Compare immediately.
- A shared URL with one valid `cmp` id saves that place to compare but does not auto-open Compare.

## Regression vectors

- Deep links after corpus edits: unknown ids disappear silently (no crash).
- Browser Back/Forward: `popstate` reapplies validated state only from the query string.
