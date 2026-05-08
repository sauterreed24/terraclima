# URL and compare invariants (Terraclima)

Executable checks live in [`src/lib/app-url.ts`](../src/lib/app-url.ts), [`src/lib/__tests__/app-url.test.ts`](../src/lib/__tests__/app-url.test.ts), and `npm run quality:check`.

## Parameters

| Param | Meaning | Validation |
|-------|---------|------------|
| `v` | View: `explorer` (default), `collections`, `learn` | Unknown → `explorer` |
| `p` | Selected place id | Omitted if id ∉ corpus |
| `col` | Active collection id | Omitted if id ∉ collections |
| `c` | Countries, comma-separated (`USA`, `Canada`, `Mexico`) | Non-members stripped |
| `a` | Archetype ids, comma-separated | Filtered to known archetypes when validator provided |
| `q` | Search string | Trimmed for round-trip |
| `cmp` | Compare set, comma-separated place ids | Only known ids; **max 4** (`COMPARE_LIMIT`) |

## Formatting rules

- Default view (`explorer`) omits `v`.
- Countries and archetypes are sorted for stable URLs.
- History flag `tcPlace` on pushState indicates “opened place in-app” so **Back** closes the panel instead of leaving the site.

## Compare cap

- At most **4** ids in `cmp` and in memory (`Set` eviction drops oldest).

## Regression vectors

- Deep links after corpus edits: unknown ids disappear silently (no crash).
- Browser Back/Forward: `popstate` reapplies validated state only from the query string.
