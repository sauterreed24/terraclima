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
| `r` | Ranking profile | Default **`most-unique`** is never written; other profiles (including `live-fit`) are written when active |
| `cmp` | Compare set, comma-separated place ids | Only known ids; **max 4** (`COMPARE_LIMIT`) |
| `theme` | Color theme override: `light`, `dark` | `auto` (the implicit default) is never written; unknown values dropped |
| `scn` | Climate-scenario layer: `ssp245`, `ssp585` | `now` (the implicit default) is never written; unknown values dropped |
| `clens` | Compare priority lens: `travel`, `move`, `remote`, `garden`, `risk` | `balanced` (the implicit default) is never written; unknown values dropped |
| `hb` | Home-base place id (cards, dossiers, and Compare read climate deltas against it) | Only known ids (alias-canonicalized); omitted when unset; written last |

## Live Finder parameters (Explorer filters)

Hydration uses [`filterStateFromValidated()`](../src/lib/scoring.ts) from validated URL fields. Numeric/risk params and active `fit` presets narrow the place pool via [`liveFitFilterPass()`](../src/lib/live-fit.ts); each active preset requires `presetScore` ≥ 50.

| Param | Meaning | Validation |
|-------|---------|------------|
| `fit` | Live Finder preset ids, comma-separated | Allowlisted in `LIVE_FIT_PRESET_BY_ID`; unknown ids dropped |
| `sh` | Summer high cap (°C, encoded) | Allowlisted in `app-url.ts` (`LIVE_FIT_SUMMER_CAPS_C`) |
| `wl` | Winter low floor (°C, encoded) | Allowlisted (`LIVE_FIT_WINTER_FLOORS_C`) |
| `grow` | Growability floor (0–100) | Allowlisted (`LIVE_FIT_GROWABILITY_FLOORS`) |
| `fire` | Wildfire risk ceiling | Allowlisted in `LIVE_FIT_RISK_CEILINGS`: `low`, `moderate`, `elevated` (matches FilterBar selects; unknown tokens like `high` / `extreme` are dropped) |
| `risk` | Overall risk ceiling | Same allowlist as `fire` |

Omitted when unset (clear-all / empty state): `fit`, `sh`, `wl`, `grow`, `fire`, `risk`, and `q`.

## Lifestyle bundles (FilterBar dock)

Six curated bundles live in [`src/lib/lifestyle-bundles.ts`](../src/lib/lifestyle-bundles.ts). Applying a bundle from the FilterBar Fit Finder dock sets **`r`** (ranking profile) and the Live Finder fields above (`fit`, `sh`, `wl`, `grow`, `fire`, `risk`) in one shot. Explorer hero quick-picks are discovery lenses (Most unique, Hidden gems, Cool summers, Fog & marine, Another country, Visit now) and do **not** auto-apply lifestyle bundles.

**Auto live-fit sort:** When Live Finder constraints are active (any preset or numeric/risk cap) but no lifestyle bundle is fully active and **`r`** is not `live-fit`, Explorer switches ranking to **`live-fit`** so the list sorts with `rankLiveFit()`. That auto-switch is **transient**: it does not overwrite the persisted ranking preference, and when the last Live Finder constraint clears (or the reader uses Clear all / Reset Explorer), ranking restores to the stored preference (or `most-unique` if storage held `live-fit`). Explicit Rank-by / lifestyle-bundle choices still persist. Lens Receipt may note when display ranking and live-fit sort diverge.

**Clear all:** Lens Receipt / FilterBar Clear all should call the same App reset as Reset Explorer — empty `FilterState`, clear curated `col`, and (via the auto live-fit rule above) restore ranking when the live-fit lens was only auto-applied.

**Lens Receipt chips:** Each active explorer signal renders as a dismissible chip; removing one field uses a functional `setFilters` update (search, country, archetype, presets, and caps are independent).

## Climate scenario layer (`scn`)

The "2050 time machine" ([`src/lib/climate-projection.ts`](../src/lib/climate-projection.ts)) reshapes the whole Explorer — ranking, map, cards, compass, analogs — by morphing the authored 1991–2020 normals with a mid-century CMIP6 anomaly.

- `scn=ssp245` (SSP2-4.5 "middle of the road") and `scn=ssp585` (SSP5-8.5 "high emissions"); `now` is the default and is never written.
- The projection is an **illustrative coarse regional anomaly** (sourced country + latitude-band table; IPCC AR6 Atlas / NASA NEX-GDDP-CMIP6), not a downscaled per-site forecast. A place may carry an authored, cited `Place.projection` override.
- The place **dossier still shows present-day normals**; only the Explorer aggregate views project.
- **Compare** uses the same projected normals as the active Explorer layer when `scn≠now` (charts, ribbons, and screening scores). Opening a place profile from Compare still loads present-day dossier data.
- Ranking under a scenario flows through the climate-processor worker subsystem ([`src/hooks/use-climate-processor.ts`](../src/hooks/use-climate-processor.ts)); a synchronous fallback keeps the result identical when no worker is available.

## Home-base anchor (`hb`)

The home base ([`src/lib/home-base.ts`](../src/lib/home-base.ts)) is a sticky preference with theme-style precedence: an explicit `?hb=` wins on first paint and on `popstate`; otherwise the persisted `localStorage` choice is re-validated against the corpus. Setting or clearing the anchor (dossier header toggle, **H** shortcut, or the count-strip clear control) writes both the URL and storage. Deltas are derived in `src/lib/home-base.ts` from authored normals only; under `scn≠now` the Explorer grid and Compare diff projected place vs projected home, while the dossier section stays present-day.

## Formatting rules

- Default view (`explorer`) omits `v`.
- Retired view links, including `?v=pro`, canonicalize back to Explorer instead of rendering a dead route.
- Bare profile links stay bare: opening `?p=<place>` does not inject a locally persisted ranking lens, and closing that profile returns to a clean Explorer URL instead of reintroducing the stored lens. Ranking params are written when they came from the URL, the reader changes the lens in-session, or active Live Finder state needs the lens to travel with the link.
- Deep dossier links (`?p=<place>#deep-...`) preserve the profile query, scroll the drawer to the chapter, and move focus to that chapter heading so copied section links are keyboard-readable.
- Countries and archetypes are sorted for stable URLs.
- History flag `tcPlace` on pushState indicates "opened place in-app" so **Back** closes the panel instead of leaving the site.

## Compare cap

- At most **4** ids in `cmp` and in memory (`Set` eviction drops oldest).
- A shared URL with two or more valid `cmp` ids opens Compare immediately.
- A shared URL with one valid `cmp` id saves that place to compare but does not auto-open Compare.
- `clens` changes only the Compare decision/read lens and grouped score row; it does not transmit shortlist data.
- Shortlist Workbench candidates stay local (bookmarks, recent places, current ranked leaders). Export still reads the full shortlist, not only the four active `cmp` slots.

## Regression vectors

- Deep links after corpus edits: unknown ids disappear silently (no crash).
- Browser Back/Forward: `popstate` reapplies validated state only from the query string.
