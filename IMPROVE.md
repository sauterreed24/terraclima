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
| id | check | target | session-1 start | end of round 3 | end of round 4 (merged) |
|----|-------|--------|------|------|------|
| S1a / S1b | search: intended place on top, tuning / **held-out** (misses not printed) | ≥ 95% / ≥ 90% | 38/44 / 24/30 | 75/77 / 28/29 | 75/77 / 28/29 |
| S2a–f | find (≤2), must-have list = reference, save+compare (≤5), home base (≤2), export (≤2), move saved places to another browser (≤4) | done, steps ≤ target | 2/exact/5/2/2/impossible | …/4 | same |
| S2g | profiles show their sources, 2050 outlook, first chapter (seeded, link + click, phone) | 0 missing | — | — | 0 |
| S2h | chapter-only search = before the split (typed now/2050; linked now/2050/save-data) | equal | — | — | 57/57/1/1/1 = 57,1 |
| S2i | send saved places by link: asked first, own saves kept, typing unaffected | done ≤ 4 | impossible | impossible | 4 steps |
| S2k | export-menu items covered by other panels | 0 | (1, unmeasured) | — | 0 |
| S3a / S3c / S3d | saved items lost / second tab in step / old build files dropped | 0 / yes / dropped | 11 / no / — | 0 / yes / dropped | same |
| S4a | stays usable in failure scenarios (now 10, incl. failed profile-field file: notice, no re-download) | all | 4/6 | 9/9 | 10/10 |
| S5a | first ranked card, desktop, ms median | ≤ 1500 | ~650 | ~570 | 558–588 |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | ~6200 | ~6000–6300 | **5550–5556** |
| S5c | first-load JS, KiB gzip | ≤ 650 (was 747) | 740 | 742 | **640** |
| S5d | first profile open, slow phone, ms | ≤ 3000 | 4032 | ~1850 | 1702–1764 |
| S5e | first profile open, KB gzip the profile itself needs | ≤ 250 | 676 | 125 | 139 (its field file used to ride in first load) |
| S6a | console/page errors across all tasks | 0 | 0 | 0 | 0 |
| S7a / S7b | figures differing from the climate records (export of all 226, cards incl. month line, profiles incl. Versus-your-home tiles, Compare; seeded / HELD-OUT) | 0 / 0 | — | 0 of 2048 / 0 of 114 | 0 of 2051 / 0 of 119; round 5 (wider): 0 of 2099 / 0 of 167 |
| S8a / S8b | "High confidence" over unchecked data / profiles misstating how figures were checked | 0 / 0+0 | — | 0 / 0+0 | same |
| S9a | one-click mistakes (remove saved place, clear home base, clear recents) undone in one click, exact state restored | all | — | — | round 5: 0/3 → 3/3 |
| S10a | keyboard only: find two places by name, add both to Compare, open Compare (keys) | done ≤ 14 | — | — | round 5: impossible → 14 keys |

Noise: non-timing rows identical across two runs; timing medians move ≈ ±50 ms desktop, ±250 ms throttled.
Next bar: S5b (5.5 s) is now mostly the remaining corpus prose (experience text, summaries) that search reads; a search-index split would be the next step. A held-out search set 3 once set 2 has been looked at.

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
- In keyboard scripts, wait ~300 ms after "/" (it focuses two frames later) before typing, or letters go to the page and can trigger shortcuts. (round 5)
- The entry-chunk budget is the binding one: put new features' logic and text in lazy modules; check `npm run check:performance-budget` before committing. (confirmed rounds 2–4)
- Break-test every new async loader with the file *blocked*, not only offline-after-caching: a resolved-null promise that is dropped makes React's `use` refetch forever. (round 2, from review; provisional)
- Gate commits on the test command's exit code: `vitest … | grep … && git commit` committed a failing test once. (round 2)
- Entry-chunk budget is tight (113.5 KB): put new feature logic and its messages in a module loaded on first use. (confirmed round 3: the climate-data-basis helper fit only because it lives with the profile)
- Read screen figures with `innerText` (keeps line breaks; labels come back uppercased by CSS) and Compare from table cells, never by splitting text: `textContent` glued "100/100" to "47%" and produced false failures twice. (round 3)
- Accuracy references are computed in the evaluator from `records.json`, never by importing the app's helpers; otherwise a shared bug passes both sides. (round 3)
- A cache-pruning or caching change needs an "update lands while the old page is cached" scenario: pruning against the new list blanked the next offline open. (round 3, from review)

## Log
- 2026-11-26 · round 5 · raised the bar with three new checks: S9 (undo a one-click mistake), S10 (keyboard-only job), wider S7 (card month line, profile home-base tiles). Kept: Undo for removing a saved place / clearing home base / clearing recents (S9 0/3→3/3, invariant test over 200 lists); keyboard fixes — query selected when a profile closes back to search, Esc in an empty search leaves it (S10 impossible→14 keys). S7 extension found no new errors (proven to catch a shifted month and a flipped winter difference). Investigated and dismissed: "query cleared after Esc" (my script typed before "/" moved focus); "about the same" on small home-base differences (deliberate similarity bands, now encoded in the check). Round gain: two new capabilities users notice (undo, keyboard path), no speed change.
- 2026-11-26 · round 4 (your decisions) · profile-only fields split out of first load (first-load JS 742→639 KiB; first card on a slow phone ~6.1→~5.5 s; first profile 1.85→~1.75 s after moving to 10 group files — the per-country version made it 2.2 s, rejected); rankings, fit, feel, livability, tourism, exports identical (test). Link to saved places (S2i, 4 steps, asks first). Compare sunshine estimate marked "est." Reviewed date from stats. Found while building: export menu's last item covered by the scenario panel since before this session (S2k). Sabotage note: a sabotage edit that does not compile leaves the old dist in place — check the build succeeded before reading the result. Independent review (3rd run) found 5 defects in this round's code, all fixed with a failing check first: link prompt stole focus on every render; chapter-only search stale for deep links, under the 2050 layer (cache cleared only for base objects) and on save-data; failed profile-field retry re-downloaded on re-render and showed no notice; link copy awaited two chunk loads (Safari gesture); "Link copied" after a native share. I also found the scenario worker never got chapter text. Repo entry ceiling 113.5 → 114 KB for the review fixes (total ceiling 765 → 670 KB).
- 2026-11-25 · round 3 · new focus: are the numbers people read right. Added S7 (figures vs records, independent conversion, seeded + held-out) and S8 (confidence claims). Kept: export humidity/sunshine differences from unrounded values (S7a 96→5; review then caught station sunshine still rounded → 0); card chip "Summer humidity" (S7a 5→0, S7b 5→0); figures basis on profiles + two ratings + badge needs both (S8a 133→0, S8b 27→0); offline-cache pruning (S3d kept→dropped). From the independent review of rounds 2–3, all fixed with a failing check first: pruning blanked the next offline open after a deploy (now keeps previous build + cached page's files); history retry not shown; "qro"/"grand marais mi" search; alias duplicate on import. Rejected/deferred: showing the sunshine estimate in Compare (conflicts with a documented rule → Decision 4); switching the chip to annual humidity (would change what home-base compares). Round gain: large on trust (230+ wrong or overstated figures removed), none on speed.
- Rounds 1–2 (condensed): saved-place cap and two-tab sync; offline first visit; search abbreviations, state codes, dropped-letter typos; per-file site history and lazy receipts (profile 4.0→1.8 s); import saved places; review fix for a history retry storm. Rejected: 7-letter typo budget 2, plural variants, CACHE_URLS at SW ready, registry in entry chunk.
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Decisions for me
- Answered 2026-11-26 ("go with your recommendations and merge"): 1 corpus split — done; 2 share saved places by link — done (asks before adding); 3 Reviewed date — shown up front from stats.json; 4 sunshine estimate in Compare — shown as "~NN% est.".
- (none open)
