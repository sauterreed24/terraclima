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
