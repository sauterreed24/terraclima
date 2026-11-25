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
| `m` | Month for the **Best in <Month>** ranking, `1`..`12` | Integers 1-12 only; read and written only with `r=best-this-month`; omitted when it equals the current calendar month (so a bare `r=best-this-month` link always means "this month") |
| `cmp` | Compare set, comma-separated place ids | Only known ids; **max 4** (`COMPARE_LIMIT`) |
| `theme` | Color theme override: `light`, `dark` | `auto` (the implicit default) is never written; unknown values dropped |
| `scn` | Climate-scenario layer: `ssp245`, `ssp585` | `now` (the implicit default) is never written; unknown values dropped |
| `clens` | Compare priority lens: `travel`, `move`, `remote`, `garden`, `risk` | `balanced` (the implicit default) is never written; unknown values dropped |
| `hb` | Home-base place id (cards, profiles, and Compare read climate deltas against it) | Only known ids (alias-canonicalized); omitted when unset; written last |

## Goals and Must-haves parameters (Explorer filters)

The interface calls the presets **Goals** and the numeric and risk limits **Must-haves**. The code and the URL keep the older names: “Live Finder”, `live-fit`, `fit=`.

Hydration uses [`filterStateFromValidated()`](../src/lib/scoring.ts) from validated URL fields. Numeric/risk params and active `fit` presets narrow the place pool via [`liveFitFilterPass()`](../src/lib/live-fit.ts); each active preset requires `presetScore` ≥ 50.

| Param | Meaning | Validation |
|-------|---------|------------|
| `fit` | Goal (Live Finder preset) ids, comma-separated | Allowlisted in `LIVE_FIT_PRESET_BY_ID`; unknown ids dropped |
| `sh` | **Max summer high** (°C, encoded; shown in °F) | Allowlisted in `app-url.ts` (`LIVE_FIT_SUMMER_CAPS_C`) |
| `wl` | **Min winter low** (°C, encoded; shown in °F) | Allowlisted (`LIVE_FIT_WINTER_FLOORS_C`) |
| `grow` | Growability floor (0–100) | Allowlisted (`LIVE_FIT_GROWABILITY_FLOORS`) |
| `fire` | **Max fire risk** | Allowlisted in `LIVE_FIT_RISK_CEILINGS`: `low`, `moderate`, `elevated` (matches FilterBar selects; unknown tokens like `high` / `extreme` are dropped) |
| `risk` | Overall risk ceiling | Same allowlist as `fire` |

Omitted when unset (clear-all / empty state): `fit`, `sh`, `wl`, `grow`, `fire`, `risk`, and `q`.

## Lifestyle bundles (FilterBar dock)

Six curated bundles live in [`src/lib/lifestyle-bundles.ts`](../src/lib/lifestyle-bundles.ts). Applying a bundle from the **Goals** dock in the FilterBar sets **`r`** (ranking profile) and the Goals and Must-haves fields above (`fit`, `sh`, `wl`, `grow`, `fire`, `risk`) in one shot. Explorer hero quick-picks are discovery lenses (Most unique, Hidden gems, Cool summers, Fog & marine, Another country, Visit now) and do **not** auto-apply lifestyle bundles.

**Auto live-fit sort:** When Goals or Must-haves are active (any preset or numeric/risk cap) but no lifestyle bundle is fully active and **`r`** is not `live-fit`, Explorer switches ranking to **`live-fit`** so the list sorts with `rankLiveFit()`. That auto-switch is **transient**: it does not overwrite the persisted ranking preference. On apply, App snapshots the prior ranking + whether it was URL-explicit; when the last Goal or Must-have clears via chip dismiss, that snapshot is restored (so a shared `?r=most-comfortable` returns after the constraint, instead of only `localStorage`). Explicit Rank-by / lifestyle-bundle choices still persist and cancel the snapshot. The switch is announced beside **Rank by** ("Ranking switched to Live-here fit because a must-have is on") with an **Undo** that restores the snapshot and keeps the must-haves; after Undo the auto-switch stays off until the last Goal or Must-have clears (in-memory only, not in the URL). Lens Receipt may note when display ranking and live-fit sort diverge.

**Clear all / Reset the atlas:** Lens Receipt / FilterBar Clear all and empty-state **Reset the atlas** share App’s `clearAllFilters` — empty `FilterState`, clear curated `col`, and leave auto-applied `live-fit` for the pre-constraint snapshot when one exists (otherwise the discovery default / stored non-live-fit preference). A full Explorer reset always exits a stuck live-fit lens (auto, URL, or menu) so the atlas returns to discovery; chip-by-chip dismiss keeps an explicitly chosen live-fit ranking.

**Lens Receipt chips:** Each active explorer signal renders as a dismissible chip; removing one field uses a functional `setFilters` update (search, country, archetype, presets, and caps are independent).

## Climate scenario layer (`scn`)

The "2050 time machine" ([`src/lib/climate-projection.ts`](../src/lib/climate-projection.ts)) reshapes the whole Explorer — ranking, map, cards, compass, analogs — by morphing the atlas's present-day normals with a mid-century CMIP6 anomaly (2050 growing degree days scale with the projected temperatures).

- `scn=ssp245` (SSP2-4.5 "middle of the road") and `scn=ssp585` (SSP5-8.5 "high emissions"); `now` is the default and is never written.
- The projection is an **illustrative coarse regional anomaly** (sourced country + latitude-band table; IPCC AR6 Atlas / NASA NEX-GDDP-CMIP6), not a downscaled per-site forecast. A place may carry an authored, cited `Place.projection` override.
- The place **profile still shows present-day normals**; only the Explorer aggregate views project.
- **Compare** uses the same projected normals as the active Explorer layer when `scn≠now` (charts, ribbons, and screening scores). Opening a place profile from Compare still loads present-day data.
- Ranking under a scenario flows through the climate-processor worker subsystem ([`src/hooks/use-climate-processor.ts`](../src/hooks/use-climate-processor.ts)); a synchronous fallback keeps the result identical when no worker is available.

## Home-base anchor (`hb`)

The home base ([`src/lib/home-base.ts`](../src/lib/home-base.ts)) is a sticky preference with theme-style precedence: an explicit `?hb=` wins on first paint and on `popstate` **and is written through to storage** so sticky restore matches the shared link; otherwise the persisted `localStorage` choice is re-validated against the corpus, and unresolved orphans are purged from storage. Setting or clearing the anchor (the profile header toggle, **H** shortcut, or the count-strip clear control) writes both the URL and storage. Deltas are derived in `src/lib/home-base.ts` from authored normals only; under `scn≠now` the Explorer grid and Compare diff projected place vs projected home, while the profile's **Versus your home base** section stays present-day.

## Formatting rules

- Default view (`explorer`) omits `v`.
- Retired view links, including `?v=pro`, canonicalize back to Explorer instead of rendering a dead route.
- Bare profile links stay bare: opening `?p=<place>` does not inject a locally persisted ranking lens, and closing that profile returns to a clean Explorer URL instead of reintroducing the stored lens. Ranking params are written when they came from the URL, the reader changes the lens in-session, or active Goals / Must-haves state needs the lens to travel with the link.
- Deep profile links (`?p=<place>#deep-...`) preserve the profile query, scroll the drawer to the chapter, and move focus to that chapter heading so copied section links are keyboard-readable.
- Countries and archetypes are sorted for stable URLs.
- The interface shows US units only. `temp=` and `dist=` from older links are ignored and dropped from the address bar.
- History flag `tcPlace` on pushState indicates "opened place in-app" so **Back** closes the panel instead of leaving the site.

## History: which actions push an entry

The URL-sync effect in `App.tsx` decides between `pushState` and `replaceState`.

| Action | History | Entry flags |
|--------|---------|-------------|
| Open a profile (card, map, list, search Enter, Surprise me) | **push** | `tcPlace`, `tcDepth: 1` |
| Hop from one open profile to another (climate twins, nearby) | **push** | `tcPlace`, `tcDepth` + 1 |
| Open Compare | **push** | `tcCompare` (plus `tcPlace`/`tcDepth` + 1 over an in-app profile) |
| Switch top-level view (Atlas / Trips / Collections / Learn) | **push** | none |
| Search text, filters, Goals / Must-haves, ranking, month, climate layer, theme, compare picks, compare lens, home base | **replace** | keeps the entry's flags |

- **Browser Back/Forward** restores state from the target entry's query string. One exception keeps a selection from being lost: when Back/Forward leaves an open profile or an open Compare, the **compare set as it is now** is carried onto the target entry (phones close overlays with Back, and picks made inside must survive).
- **Closing a profile in-app** (X, Esc, scrim) goes back `tcDepth` entries to the page the profile chain was opened from and removes **only `p`**: compare picks, home base, and anything else changed while the profile was open are written onto that entry. A deep-linked or reloaded profile (no `tcPlace`) closes in place with `replaceState`.
- **Closing Compare in-app** goes back one entry when the current entry has `tcCompare`, again keeping every other piece of state; otherwise it closes in place (`cmpopen=0` for a 2+ set). Opening a profile from inside Compare pushes the profile over the Compare entry, so Back from that profile returns to Compare.
- Reload always restores from the URL; the first sync after load uses `replaceState` and clears the in-app flags.

## Compare cap

- At most **4** ids in `cmp` and in memory (`Set` eviction drops oldest).
- A shared URL with two or more valid `cmp` ids opens Compare immediately.
- A shared URL with one valid `cmp` id saves that place to compare but does not auto-open Compare.
- `clens` changes only the Compare decision/read lens and grouped score row; it does not transmit shortlist data.
- Shortlist Workbench candidates stay local (bookmarks, recent places, current ranked leaders). Export still reads the full shortlist, not only the four active `cmp` slots.

## Regression vectors

- Deep links after corpus edits: unknown ids disappear silently (no crash).
- Browser Back/Forward: `popstate` reapplies validated state only from the query string.
