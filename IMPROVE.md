# IMPROVE.md — Terraclima improvement memory

Read this first each session. Keep sections short; condense old rounds.

## The app
- **What:** static React/Vite SPA, a North American microclimate atlas: 226 places (USA/Canada/Mexico) with climate normals (Daymet 1996–2025, station-corrected where reviewed), rankings, profiles, compare, saved places, exports. Live at https://sauterreed24.github.io/terraclima/ (deploys from `main`).
- **Who:** people scouting where to relocate or travel by climate; curious readers of landscapes.
- **Main jobs:** (1) find a named place and read its profile; (2) narrow the atlas by goals / must-haves and trust the list; (3) save finalists and compare them; (4) set a home base and read differences; (5) take the list away (export, share link) and come back to it later, on any device, even offline.
- **Run:** `npm ci`, `npm run dev` (or `npm run build && npm run preview`).
- **Evaluate:** `npm run eval` (builds, ≈1 min) · `npm run eval -- --no-build` · `--full` adds the Vitest suite (≈2.5 min) · results in `eval/results/latest.json` (gitignored). Full repo gate: `npm run quality:check`.
- **Docs that matter:** `docs/IMPROVEMENT-CONTEXT.md` (architecture + manual QA), `docs/URL-INVARIANTS.md` (URL contract), `docs/CLIMATE-DATA-V2.md` (data pipeline), `CHANGELOG.md` (user-facing change log, plain language).

## Constraints (never break)
- Saved places (`terraclima.bookmarks.v1`), home base (`terraclima.home-base.v1`), recents, ranking pref: never lose or silently rewrite. Migrate if the format changes.
- URL contract in `docs/URL-INVARIANTS.md` (old links keep working; update doc + `app-url` tests together).
- Climate data: no invented figures; station corrections only through the reviewed pipeline (`scripts/climate-data`). Claims stay screening-grade and say their source.
- No tracking, no accounts, no new personal data, no external calls except the map/photo links already there. Offline-first PWA.
- Performance budgets in `scripts/check-performance-budget.ts` (initial JS ≤ 765 000 B gzip, CSS ≤ 62 000 B).
- Accessibility: focus traps, roving tabindex on the map, 44px touch targets, reduced motion.
- `npm run quality:check` must pass; CHANGELOG gets a plain-language entry for user-visible changes.

## Scorecard (measured by `npm run eval`)
| id | check | target | baseline (start of session 1) | after round 1 | after round 2 |
|----|-------|--------|------|------|------|
| S1a | search: intended place on top, tuning set | ≥ 95% | 38/44 | 43/44 | 72/74 (set grew: old held-out joined it) |
| S1b | same, **held-out** set — never tune on it; misses not printed | ≥ 90% | 24/30 (set 1) | 27/30 (set 1, now retired) | 28/29 (set 2; 26/29 before round 2) |
| S2a–e | find (≤2), must-have list = independent reference, save+compare (≤5), home base (≤2), export JSON (≤2) | done, steps ≤ target | 2/exact/5/2/2 | same | same |
| S2f | carry saved places to another browser (export there, import here; its own saves kept) | done ≤ 4 | impossible | impossible | 4 steps |
| S3a | saved items lost (reload, 61st save, two tabs) | 0 | 11 | 0 | 0 |
| S3c | a second open tab shows saves made in the first | yes | no | yes | yes |
| S4a | stays usable: bad link, corrupt storage, storage blocked, offline reload, offline profile reopen, failed code chunk, failed site-history file (no retry storm) | all | 4/6 | 6/6 | 7/7 (7th added from review: failed on round-1 code) |
| S5a | first ranked card, desktop, ms median [min–max] | ≤ 1500 | 626–674 | 591–638 | 566–603 [556–641] |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | 6169–6227 | 6078–6194 | 6054–6477 [6034–6689] |
| S5c | first-load JS, KiB gzip | ≤ 747 | 740 | 740 | 742 |
| S5d | first profile open, slow phone, ms to its climate figures | ≤ 3000 | 4032 | 1837–1927 | 1801–2087 |
| S5e | first profile open, KB gzip downloaded | ≤ 250 | 676 | 125 | 125 |
| S6a | console/page errors across all tasks | 0 | 0 | 0 | 0 |

All numbers measured by the evaluator. Noise: non-timing rows identical across two runs; timing medians move ≈ ±50 ms desktop, ±200 ms throttled.
Proven to fail on a broken build: S2b (filter loosened 1 °C → "shown 105 vs ref 91"); S4a's 7th scenario and its unit test fail on round-1 code; S3c's DOM test fails without the storage listener. The rest failed on the baseline itself.
Next bar to raise: S5b (6.1 s on a slow phone is almost all the 740 KiB corpus; needs the corpus split — Decisions for me) and a held-out set 3 once set 2 has been seen.

## Checks for a human (cannot be scripted here)
- Look and layout on a real phone (iOS Safari, Android Chrome), both themes.
- Screen reader pass (VoiceOver / TalkBack) on search → profile → save → compare.
- Offline: install to home screen, airplane mode next day, open the app.

## Backlog (top first)
1. Corpus split (Decision 1): first load is 742 KiB gzip; profile-only fields (citations, deep sections, confidence and climate-change notes) are ~30 % of the corpus.
2. Service-worker runtime cache never prunes old deploys' hashed files (pre-existing; round 1 adds first-visit files). Prune entries absent from the current build that are older than N days; must not drop current lazy chunks cached for offline.
3. Evidence panel: the "Reviewed" date now shows only once the panel is opened (all 226 receipts share one date, 2026-08-10); could ship that one date in the profile chunk.
4. Search misses still open: "big island" (Hilo 3rd), "smoky mountains" (AND rule drops Gatlinburg on the common word "mountains"; a plural rule alone made it worse).
5. Hop to a place in another site-history file shows the loading fallback for one ~50 KB download; could prefetch on card hover.
6. Creel and other Tier C grid-only places: station data unreachable from this environment.

## Alternatives (strong ideas not taken yet)
- Corpus split (numbers first, prose lazily per profile) to cut first-load JS by roughly half. Large refactor touching search (prose tiers) and the budget script. Round 1's site-history split shows the pattern works (registry + id index + `use`).
- Site history per place (226 tiny files) instead of per file of ~23 places: ~5 KB instead of ~50 KB per open; not worth the churn while S5e is at 125 KB.
- Typo budget 2 for every 7-letter token: same tuning gain as the kept "two dropped letters" rule but "houston" → Houghton, "sequoia" → Sequim. Rejected.
- Plural/"-ies" search variants: no measured gain; "smoky mountains" went from no result to three wrong ones. Revisit together with relaxing the AND rule for common words.
- Share saved places by link (`?saved=`) instead of / besides file import: one tap for a partner, but adds a URL param and a "these are someone else's places" flow (Decision 2).

## Strategy (kinds of change → kept / tried, both rounds)
- Data-safety bug fixes: 3/3 (cap, two tabs, full-list message). Cheap, clear wins.
- Error recovery / offline: 2/2 (+ a latent unhandled rejection). Real-browser failure tests found what unit tests could not.
- Performance on the action path (lazy profile data): 2/2, biggest user-visible gain (4.0 → 1.8 s). Measure bytes per action, not only first load.
- Search accuracy: 2/4 versions kept (broad rules lost to narrow ones each time: 7-letter budget, plurals).
- Workflow / portability (import): 1/1.
- Independent review: found 1 crash-class bug and 3 search regressions my own break-tests missed. Keep it every round; give the reviewer the diff, not the reasoning.
- Candidate choice: weight toward action-path performance and failure-mode testing next; search is at target and its gains are now small.

## Playbook
- Chromium: `/opt/pw-browsers/chromium` with `playwright-core` (do not `playwright install`).
- Route every non-local request to abort in browser tests; external hero photos otherwise log `ERR_TUNNEL` errors.
- The service worker only caches what is fetched after it controls the page; test offline with a reload after `navigator.serviceWorker.ready`.
- `searchPlaces` + `runScenarioRanking` give the exact app order in Node — test search there, not in the browser.
- Throttled timing must block the service worker (`serviceWorkers: "block"`), or its fetches skip the throttle. Scope text waits to the dialog. (provisional)
- `vite.config.ts` `manualChunks` groups by path: a new small module in a data folder can drag a whole data chunk into first load. Check `npm run check:performance-budget` after moving imports. (provisional)
- A/B timing: build both versions into separate dist copies and alternate runs (`--only=speed`), 3 pairs; single runs mislead. (provisional)
- Before trusting a new check, sabotage the code it guards and see it fail.
- Break-test every new async loader with the file *blocked*, not only offline-after-caching: a resolved-null promise that is dropped makes React's `use` refetch forever. (round 2, from review; provisional)
- Gate commits on the test command's exit code: `vitest … | grep … && git commit` committed a failing test once. (round 2)
- Entry-chunk budget is tight (113.5 KB): put new feature logic and its messages in a module loaded on first use. (provisional)

## Log
- 2026-11-25 · round 2 · kept: fresh held-out search set (bar raised); state/province/Mexican-state abbreviations + whole-word tie-break for typo matches (tuning 70→72/74, held-out 26→28/29); import saved places from an export (S2f impossible→4 steps); fixes from independent review: failed site-history load looped forever (S4a 6/7→7/7), abbreviations only next to another word ("mt" = Montana again), full-list message. Rejected: plural variants (worse on "smoky mountains"). Repo entry-chunk ceiling raised 113.0→113.5 KB for the import menu item after moving its logic to a lazy module (total first-load budget unchanged). Round gain: smaller than round 1 (one new capability, +2 held-out queries, one serious bug removed); next gains need the corpus split.
- 2026-11-25 · round 1 · kept: saved-place cap → no eviction (S3a 11→0); offline first-visit caching + ignoreVary (S4a 4/6→6/6); search abbreviations + dropped-letter rule (S1a 38→43, held-out 24→27); two-tab sync (S3c no→yes); per-file site history (S5d 4.0→1.8 s, S5e 676→241 KB); receipts on panel open (S5e 241→125 KB). Rejected: typo budget 2 for all 7-letter tokens (2/23 new false positives); posting CACHE_URLS at SW ready (+50–70 ms desktop first card in 2/3 A/B pairs → deferred to idle, now within noise); site-history registry in the entry chunk (+4 KiB first load, entry over budget → own lazy chunk). Round gain: every scorecard row at target; largest user-visible gain is profile open on slow phones.
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Decisions for me
1. **Split the corpus so first load carries only what the list and map need** (recommended). ~30 % of the 742 KiB is profile-only text (citations, deep sections, confidence and climate-change notes). Expected: first ranked card on a slow phone from ~6.1 s toward ~4.5 s. Cost: the authored place files or a build step change shape; search over those fields would load lazily. Round 1's site-history split is the proven pattern.
2. **Share saved places by link** (`?saved=a,b,c` → "Add these 5 places to your saved places?"). Import from a file is done; a link is one tap for a partner but adds a URL parameter to the documented contract.
3. **Evidence "Reviewed" date**: accept that it shows only after opening the panel (saves 120 KB per first profile), or ship the single review date with the profile.
