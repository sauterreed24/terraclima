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
