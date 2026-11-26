# IMPROVE.md — Terraclima improvement memory

Read this first each session. Keep sections short; condense old rounds.

## The app
- **What:** static React/Vite SPA, a North American microclimate atlas: 226 places (USA/Canada/Mexico) with climate normals (Daymet 1996–2025, station-corrected where reviewed), rankings, profiles, compare, saved places, exports. Live at https://sauterreed24.github.io/terraclima/ (deploys from `main`).
- **Who:** people scouting where to relocate or travel by climate; curious readers of landscapes.
- **Main jobs:** (1) find a named place and read its profile; (2) narrow the atlas by goals / must-haves and trust the list; (3) save finalists and compare them; (4) set a home base and read differences; (5) take the list away (export, share link) and come back to it later, on any device, even offline.
- **Run:** `npm ci`, `npm run dev` (or `npm run build && npm run preview`).
- **Evaluate:** `npm run eval` (builds, ≈3 min; `--only=search,jobs,data,recover,speed,accuracy`) · `npm run eval -- --no-build` · `--full` adds the Vitest suite (≈2.5 min) · results in `eval/results/latest.json` (gitignored). Full repo gate: `npm run quality:check`.
- **Docs that matter:** `docs/IMPROVEMENT-CONTEXT.md` (architecture + manual QA), `docs/URL-INVARIANTS.md` (URL contract), `docs/CLIMATE-DATA-V2.md` (data pipeline), `CHANGELOG.md` (user-facing change log, plain language).

## Constraints (never break)
- Saved places (`terraclima.bookmarks.v1`), home base (`terraclima.home-base.v1`), recents, ranking pref: never lose or silently rewrite. Migrate if the format changes.
- URL contract in `docs/URL-INVARIANTS.md` (old links keep working; update doc + `app-url` tests together).
- Climate data: no invented figures; station corrections only through the reviewed pipeline (`scripts/climate-data`). Claims stay screening-grade and say their source.
- No tracking, no accounts, no new personal data, no external calls except the map/photo links already there. Offline-first PWA.
- Performance budgets in `scripts/check-performance-budget.ts` (initial JS ≤ 765 000 B gzip, CSS ≤ 62 000 B).
- Accessibility: focus traps, roving tabindex on the map, 44px touch targets, reduced motion.
- `npm run quality:check` must pass; CHANGELOG gets a plain-language entry for user-visible changes.

## Scorecard (measured by `npm run eval`; all rows measured)
| id | check | target | session-1 start | end of round 2 | end of round 3 |
|----|-------|--------|------|------|------|
| S1a | search: intended place on top, tuning set | ≥ 95% | 38/44 | 72/74 | 75/77 (3 review cases added) |
| S1b | same, **held-out** set 2 (misses not printed) | ≥ 90% | — | 28/29 | 28/29 |
| S2a–f | find (≤2), must-have list = reference, save+compare (≤5), home base (≤2), export (≤2), move saved places to another browser (≤4) | done, steps ≤ target | 2/exact/5/2/2/impossible | …/4 | same |
| S3a | saved items lost (reload, 61st save, two tabs) | 0 | 11 | 0 | 0 |
| S3c | second tab shows the first tab's saves | yes | no | yes | yes |
| S3d | offline cache drops an old build's file after a visit | dropped | — | kept | dropped |
| S4a | stays usable: bad link, corrupt storage, storage blocked, offline reload, offline profile reopen, failed code chunk, failed history file (no storm), history file fails once then loads, offline after a new deploy's file list | all | 4/6 | 7/7 | 9/9 (2 scenarios added from review, both failed first) |
| S5a | first ranked card, desktop, ms median | ≤ 1500 | ~650 | ~600 | 560–584 |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | ~6200 | ~6100 | 6004–6336 |
| S5c | first-load JS, KiB gzip | ≤ 747 | 740 | 742 | 742 |
| S5d | first profile open, slow phone, ms | ≤ 3000 | 4032 | ~1850 | 1844–1907 |
| S5e | first profile open, KB gzip downloaded | ≤ 250 | 676 | 125 | 125 |
| S6a | console/page errors across all tasks | 0 | 0 | 0 | 0 |
| S7a | figures on screen / in exports that differ from the climate records (conversion written in the evaluator): export of all 226 with a home base, cards + profiles + Compare for 8 seeded places | 0 | — | 96 of 1875 | 0 of 2048 |
| S7b | same, HELD-OUT seed | 0 | — | 5 of 71 | 0 of 114 |
| S8a | places badged "High confidence" whose climate data is not high | 0 | — | 133 | 0 |
| S8b | profiles that misstate how their figures were checked (seeded + held-out) | 0 + 0 | — | 13 + 14 | 0 + 0 |

Noise: non-timing rows identical across two runs; timing medians move ≈ ±50 ms desktop, ±250 ms throttled.
Proven to fail on a broken build: S7 (summer months shifted → 458 of 1920); S2b (filter loosened 1 °C → 105 vs 91). Every other row failed on the code before its fix.
Next bar: S5b (first card on a slow phone, 6.0 s) needs Decision 1; a held-out search set 3; S7 sample could grow (16 profiles per run now).

## Checks for a human (cannot be scripted here)
- Look and layout on a real phone (iOS Safari, Android Chrome), both themes.
- Screen reader pass (VoiceOver / TalkBack) on search → profile → save → compare.
- Offline: install to home screen, airplane mode next day, open the app.

## Backlog (top first)
1. Corpus split (Decision 1).
2. Search misses still open: "big island" (Hilo 3rd), "smoky mountains" (AND rule drops Gatlinburg on the common word "mountains"). "mt" alone puts Mount Washington first (its locality really says "Mt Washington"); Montana places follow.
3. Evidence "Reviewed" date shows only once the panel opens (Decision 3).
4. Hop to a place in another site-history file shows the loading fallback for one ~50 KB download; prefetch on card hover/focus.
5. Data the app cannot check from here: Creel and other grid-only places (station services unreachable from this environment). Now labelled "grid estimate" on the profile.

## Alternatives (strong ideas not taken yet)
- Corpus split (numbers first, prose lazily per profile) to cut first-load JS by roughly half. Large refactor touching search (prose tiers) and the budget script. Round 1's site-history split shows the pattern works (registry + id index + `use`).
- Site history per place (226 tiny files) instead of per file of ~23 places: ~5 KB instead of ~50 KB per open; not worth the churn while S5e is at 125 KB.
- Typo budget 2 for every 7-letter token: same tuning gain as the kept "two dropped letters" rule but "houston" → Houghton, "sequoia" → Sequim. Rejected.
- Plural/"-ies" search variants: no measured gain; "smoky mountains" went from no result to three wrong ones. Revisit together with relaxing the AND rule for common words.
- Share saved places by link (`?saved=`) instead of / besides file import: one tap for a partner, but adds a URL param and a "these are someone else's places" flow (Decision 2).

## Strategy (kinds of change → kept / tried, sessions 1–2)
- Data-safety fixes: 4/4 (cap, two tabs, full-list message, alias duplicate on import).
- Error recovery / offline: 5/5, but 2 of them were fixes to my own round-1/3 changes found by review. New async/caching code needs a failure scenario *and* a review before it counts.
- Accuracy of shown figures (new in round 3): 4/4 (export rounding ×2, chip label, confidence claims). The S7/S8 checks found 230+ wrong or overstated figures that 1,400 unit tests missed. Highest yield per hour this session.
- Performance on the action path: 2/2 (profile 4.0 → 1.8 s).
- Search: 4/6 versions kept; broad rules keep losing to narrow ones.
- Workflow / portability: 1/1 (import).
- Independent review: 3 runs, 14 real defects, all in my own changes (5 in the decisions round). It pays every time; run it before any merge, on the diff only.
- Next session: weight toward accuracy/trust checks (extend S7 to Best-this-month, climate twins, scenario 2050 numbers) and failure scenarios; search is near its ceiling.

## Playbook
- Chromium: `/opt/pw-browsers/chromium` with `playwright-core` (do not `playwright install`).
- Route every non-local request to abort in browser tests; external hero photos otherwise log `ERR_TUNNEL` errors.
- The service worker only caches what is fetched after it controls the page; test offline with a reload after `navigator.serviceWorker.ready`.
- `searchPlaces` + `runScenarioRanking` give the exact app order in Node — test search there, not in the browser.
- Throttled timing must block the service worker (`serviceWorkers: "block"`), or its fetches skip the throttle. Scope text waits to the dialog. (provisional)
- `vite.config.ts` `manualChunks` groups by path: a new small module in a data folder can drag a whole data chunk into first load. Check `npm run check:performance-budget` after moving imports. (provisional)
- A/B timing: build both versions into separate dist copies and alternate runs (`--only=speed`), 3 pairs; single runs mislead. (provisional)
- Before trusting a new check, sabotage the code it guards and see it fail — and confirm the sabotaged build compiled (a TypeScript error leaves the previous dist, so the check "passes"). (round 4)
- Profile-only fields: edit `src/data/profile-extras/*`, then `npm run corpus:profile-stats`; never read `place.citations` etc. on an atlas place — use `src/lib/profile-stats.ts`. (round 4)
- Anything that arrives after first render (chapter text, profile fields) must reach every consumer: memoised filters, the scenario worker (its own module copy), projected place copies, deep links and save-data. List those five when adding deferred data. (round 4, from review)
- Effects in components that receive callbacks from App must not depend on them unless App memoises them (App re-renders constantly). (round 4, from review)
- The entry-chunk budget is the binding one: put new features' logic and text in lazy modules; check `npm run check:performance-budget` before committing. (confirmed rounds 2–4)
- Break-test every new async loader with the file *blocked*, not only offline-after-caching: a resolved-null promise that is dropped makes React's `use` refetch forever. (round 2, from review; provisional)
- Gate commits on the test command's exit code: `vitest … | grep … && git commit` committed a failing test once. (round 2)
- Entry-chunk budget is tight (113.5 KB): put new feature logic and its messages in a module loaded on first use. (confirmed round 3: the climate-data-basis helper fit only because it lives with the profile)
- Read screen figures with `innerText` (keeps line breaks; labels come back uppercased by CSS) and Compare from table cells, never by splitting text: `textContent` glued "100/100" to "47%" and produced false failures twice. (round 3)
- Accuracy references are computed in the evaluator from `records.json`, never by importing the app's helpers; otherwise a shared bug passes both sides. (round 3)
- A cache-pruning or caching change needs an "update lands while the old page is cached" scenario: pruning against the new list blanked the next offline open. (round 3, from review)

## Log
- 2026-11-26 · round 4 (your decisions) · profile-only fields split out of first load (first-load JS 742→639 KiB; first card on a slow phone ~6.1→~5.5 s; first profile 1.85→~1.75 s after moving to 10 group files — the per-country version made it 2.2 s, rejected); rankings, fit, feel, livability, tourism, exports identical (test). Link to saved places (S2i, 4 steps, asks first). Compare sunshine estimate marked "est." Reviewed date from stats. Found while building: export menu's last item covered by the scenario panel since before this session (S2k). Sabotage note: a sabotage edit that does not compile leaves the old dist in place — check the build succeeded before reading the result. Independent review (3rd run) found 5 defects in this round's code, all fixed with a failing check first: link prompt stole focus on every render; chapter-only search stale for deep links, under the 2050 layer (cache cleared only for base objects) and on save-data; failed profile-field retry re-downloaded on re-render and showed no notice; link copy awaited two chunk loads (Safari gesture); "Link copied" after a native share. I also found the scenario worker never got chapter text. Repo entry ceiling 113.5 → 114 KB for the review fixes (total ceiling 765 → 670 KB).
- 2026-11-25 · round 3 · new focus: are the numbers people read right. Added S7 (figures vs records, independent conversion, seeded + held-out) and S8 (confidence claims). Kept: export humidity/sunshine differences from unrounded values (S7a 96→5; review then caught station sunshine still rounded → 0); card chip "Summer humidity" (S7a 5→0, S7b 5→0); figures basis on profiles + two ratings + badge needs both (S8a 133→0, S8b 27→0); offline-cache pruning (S3d kept→dropped). From the independent review of rounds 2–3, all fixed with a failing check first: pruning blanked the next offline open after a deploy (now keeps previous build + cached page's files); history retry not shown; "qro"/"grand marais mi" search; alias duplicate on import. Rejected/deferred: showing the sunshine estimate in Compare (conflicts with a documented rule → Decision 4); switching the chip to annual humidity (would change what home-base compares). Round gain: large on trust (230+ wrong or overstated figures removed), none on speed.
- Rounds 1–2 (condensed): saved-place cap and two-tab sync; offline first visit; search abbreviations, state codes, dropped-letter typos; per-file site history and lazy receipts (profile 4.0→1.8 s); import saved places; review fix for a history retry storm. Rejected: 7-letter typo budget 2, plural variants, CACHE_URLS at SW ready, registry in entry chunk.
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Decisions for me
- Answered 2026-11-26 ("go with your recommendations and merge"): 1 corpus split — done; 2 share saved places by link — done (asks before adding); 3 Reviewed date — shown up front from stats.json; 4 sunshine estimate in Compare — shown as "~NN% est.".
- (none open)
