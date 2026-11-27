# IMPROVE.md — Terraclima improvement memory

Read this first each session. Keep sections short; condense old rounds.

## The app
- **What:** static React/Vite SPA, a North American microclimate atlas: 226 places (USA/Canada/Mexico) with climate normals (Daymet 1996–2025, station-corrected where reviewed), rankings, profiles, compare, saved places, exports. Live at https://sauterreed24.github.io/terraclima/ (deploys from `main`).
- **Who:** people scouting where to relocate or travel by climate; curious readers of landscapes.
- **Main jobs:** (1) find a named place and read its profile; (2) narrow the atlas by goals / must-haves and trust the list; (3) save finalists and compare them; (4) set a home base and read differences; (5) take the list away (export, share link) and come back to it later, on any device, even offline.
- **Run:** `npm ci`, `npm run dev` (or `npm run build && npm run preview`).
- **Evaluate:** `npm run eval` (builds, ≈5 min; `--only=search,notes,jobs,data,recover,speed,accuracy`; `--only=search,notes` runs in seconds without a browser) · `npm run eval -- --no-build` · `--full` adds the Vitest suite (≈2.5 min) · results in `eval/results/latest.json` (gitignored). Full repo gate: `npm run quality:check`.
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
| id | check | target | session-1 start | end of round 4 (merged) | round 5 |
|----|-------|--------|------|------|------|
| S1a / S1b | search: intended place on top, tuning / **held-out** (misses not printed) | ≥ 95% / ≥ 90% | 38/44 / 24/30 | 75/77 / 28/29 | **77/77** / 28/29 |
| S2a–f | find (≤2), must-have list = reference, save+compare (≤5), home base (≤2), export (≤2), move saved places to another browser (≤4) | done, steps ≤ target | 2/exact/5/2/2/impossible | same | same |
| S2g | profiles show their sources, 2050 outlook, first chapter (seeded, link + click, phone) | 0 missing | — | 0 | 0 |
| S2h | chapter-only search = before the split (typed now/2050; linked now/2050/save-data) | equal | — | 57/57/1/1/1 = 57,1 | same |
| S2i | send saved places by link: asked first, own saves kept, typing unaffected | done ≤ 4 | impossible | 4 steps | 4 steps |
| S2k | export-menu items covered by other panels | 0 | (1, unmeasured) | 0 | 0 |
| S3a / S3c / S3d | saved items lost / second tab in step / old build files dropped | 0 / yes / dropped | 11 / no / — | same | same |
| S4a | stays usable in failure scenarios (now 10, incl. failed profile-field file: notice, no re-download) | all | 4/6 | 10/10 | 10/10 |
| S5a | first ranked card, desktop, ms median | ≤ 1500 | ~650 | 558–588 | 727–777 |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | ~6200 | **5550–5556** | 6120–6421 |
| S5c | first-load JS, KiB gzip | ≤ 650 (was 747) | 740 | **640** | 640 |
| S5d | first profile open, slow phone, ms | ≤ 3000 | 4032 | 1702–1764 | 2258–2335 |
| S5e | first profile open, KB gzip the profile itself needs | ≤ 250 | 676 | 139 (its field file used to ride in first load) | 139 |
| S6a | console/page errors across all tasks | 0 | 0 | 0 | 0 |
| S7a / S7b | figures differing from the climate records (export of all 226, cards, profiles, Compare; seeded / HELD-OUT) | 0 / 0 | — | 0 of 2051 / 0 of 119 | 0 of 2071 / 0 of 119 |
| S7c / S7d | figures in ranking notes ("Why this rank") vs records: 11 rankings × all places, Best this month × 12 months; tuning half / **HELD-OUT** half of places (+ card notes read in the browser, in S7a) | 0 / 0 | — | 1700 of 5763 / 1754 of 5763 | **0 / 0** |
| S2l | phone first screen: search field covered by another control / Filters off screen (5 phone viewports, empty + typed) | 0 / 0 | — | 2 / 0 | **0 / 0** |
| S7e | 2050 figures vs records + documented projection (all places' projected climate, both scenarios; cards and 2050 summary chips) | 0 | — | — | 0 of 1452 (round 6; one-cell table sabotage → 82) |
| S8c | 2050 layer misdescribes its baseline or source | 0 | — | — | 2 → **0** (round 6) |
| S2m | Compare on a phone (390×664): px to the summary / first figure | summary < 664 | — | — | 1516 / 4170 (trial: 415 / 2576) |
| S8a / S8b | "High confidence" over unchecked data / profiles misstating how figures were checked | 0 / 0+0 | — | same | same |

Noise: non-timing rows identical across two runs (round 5 too); timing medians move ≈ ±50 ms desktop, ±250 ms throttled.
Next bar: S1a is at 77/77 — write held-out search set 3 (landscape names: "big sur", "outer banks"…) before tuning search again. S5b (5.5 s) is now mostly the remaining corpus prose (experience text, summaries) that search reads; a search-index split would be the next step.

## Checks for a human (cannot be scripted here)
- Look and layout on a real phone (iOS Safari, Android Chrome), both themes.
- Screen reader pass (VoiceOver / TalkBack) on search → profile → save → compare.
- Offline: install to home screen, airplane mode next day, open the app.
- Docked Filters on a real phone: does the jump between the search row and the floating spot feel jarring while scrolling (iOS Safari toolbar collapsing changes the viewport)? VoiceOver: Filters announced once, after the search field.

## Backlog (top first)
1. Compare on a phone is long: even with the trial the first figure is ~4 screens down (the Summary is ~2,000 px). A compact summary on phones, or a figures table first, after the trial verdict.
2. 2050 layer: the anomaly table is "vs 1991–2020" but applied to 1996–2025 averages (counts ~0.2°C of warming twice). Needs a decision on method, not a label (S8c covers the wording).
3. Other text built in metric (round 6 fixed the whole-°C swing in livability and geospatial notes; the rest use one decimal, error ≤ 0.1°F) and converted later by the prose localizer: 15 sites build `…toFixed(n)}°C` / `} mm` text (livability-score 7, compare-workbench-coach 2, home-base, geospatial-analysis, PlaceBioclimaticIndices, PrecipBars, CompareView). Each is a double-rounding risk like the ranking notes; write an S7c-style check per surface first.
4. Best this month cards say the month twice ("Why this rank Nov: 82°F day…" and the chip "Nov 82°F highs · 2.0 in"); trial a leaner card.
5. Hop to a place in another site-history file shows the loading fallback for one ~50 KB download; prefetch on card hover/focus.
6. "sonoran desert" put Tucson 4th after the phrase rule (was 2nd); "pacific northwest" still leads with Geneva-on-the-Lake (its prose compares itself to the PNW). "mt" alone puts Mount Washington first.
7. Data the app cannot check from here: Creel and other grid-only places (station services unreachable from this environment). Now labelled "grid estimate" on the profile.

## Alternatives (strong ideas not taken yet)
- Phone Filters: hide the floating button while it overlaps the search field (no docking). Less code, but Filters is then off the first screen on two of five phone sizes.
- Corpus split (numbers first, prose lazily per profile) to cut first-load JS by roughly half. Large refactor touching search (prose tiers) and the budget script. Round 1's site-history split shows the pattern works (registry + id index + `use`).
- Site history per place (226 tiny files) instead of per file of ~23 places: ~5 KB instead of ~50 KB per open; not worth the churn while S5e is at 125 KB.
- Typo budget 2 for every 7-letter token: same tuning gain as the kept "two dropped letters" rule but "houston" → Houghton, "sequoia" → Sequim. Rejected.
- Plural/"-ies" search variants: no measured gain; "smoky mountains" went from no result to three wrong ones. Revisit together with relaxing the AND rule for common words.
- Share saved places by link (`?saved=`) instead of / besides file import: one tap for a partner, but adds a URL param and a "these are someone else's places" flow (Decision 2).

## Strategy (kinds of change → kept / tried, sessions 1–3)
- Round 6: accuracy checks 2/2 built (2050 figures all right, 0 of 1452; wording wrong, 2 → 0); double-rounding fix 1/1 (swing, 103 places); phone walk 1/1 (see-through Compare buttons) + 1 trial (Compare order).
- Round 5: accuracy check 1/1 (ranking notes, 3,454 wrong figures → 0); layout found by a phone walk 1/1 (search covered); search 1/2 versions (phrase band rejected, phrase-as-tier kept).
- Data-safety fixes: 4/4 (cap, two tabs, full-list message, alias duplicate on import).
- Error recovery / offline: 5/5, but 2 of them were fixes to my own round-1/3 changes found by review. New async/caching code needs a failure scenario *and* a review before it counts.
- Accuracy of shown figures (new in round 3): 4/4 (export rounding ×2, chip label, confidence claims). The S7/S8 checks found 230+ wrong or overstated figures that 1,400 unit tests missed. Highest yield per hour this session.
- Performance on the action path: 2/2 (profile 4.0 → 1.8 s).
- Search: 4/6 versions kept; broad rules keep losing to narrow ones.
- Workflow / portability: 1/1 (import).
- Independent review: 5 runs, 22 real defects, all in my own changes (5 in round 5, mostly in the new UI code). It pays every time; run it before any merge, on the diff only.
- Accuracy checks keep paying (rounds 3 and 5: every new S7-style check found hundreds of wrong figures). Next: 2050 figures, then metric-built prose (backlog 1–2).
- A phone-size screenshot walk found a defect no scripted job had (S2l). Do one per session before choosing candidates. (provisional)

## Playbook
- Browser snippets in `page.evaluate` must not define named functions (`const f = () => …`): the tsx runner wraps them in `__name`, which the page lacks. (round 6)
- Trials: `?try=name` is captured by the inline script in index.html (the app drops unknown URL params on load) into localStorage `tc.trials` and `<html data-trials>`; read it in lazy modules, never in the entry chunk. (round 6)
- A wording fix must sweep every surface that states the same fact (grep the claim: "NEX", "1991–2020", "ensemble"): round 6 fixed the buttons and summary but left Learn and Evidence. (round 6, from review)
- A focus-guard that skips a UI update must re-apply it later: "skip while focused" stranded the Filters button, because a closing dialog returns focus there. Prefer doing the update and restoring focus. (round 5, from review)
- Entry chunk has 16 B of headroom: any App.tsx addition needs a matching cut or a lazy module. (round 5)
- Never build user text in metric and let `localizeProse` convert it: it re-rounds already-rounded figures (off by up to 1–2°F) and treats round figures as approximations ("10 mm" → "0 in"). Format with `fmtTemp`/`fmtPrecip`/`fmtDelta` from the unrounded value. (round 5)
- Two places share a name ("Durango" CO / MX): match cards by name + region in browser checks. (round 5)
- Overlap checks: `elementFromPoint` across the control at real phone browser viewports (375×548, 390×664, 412×839, 360×640), not device screen sizes; 390×844 hid the defect. (round 5, provisional)
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
- 2026-11-27 · round 6 (after "continue and merge") · New checks: S7e 2050 figures (Node over all places × 2 scenarios + cards and 2050 summary chips; independent copy of the band table and cosine rule; sabotage of one table cell → 82 errors) passed 0 of 1452 — the 2050 numbers were right; S8c 2050 wording 2 → 0 (summary said "change from 1991–2020 normals", buttons said "ensemble median" with no ensemble loaded); S2m Compare-on-phone distances. Kept: 2050 wording; one-decimal swing/thermal span before conversion (103/226 places' swing off by ≥1°F → 0, new test fails on old code); opaque Compare section buttons (phone walk: page text read through them; judged by screenshot, both themes). Trial: compare-figures-first. Entry chunk 113,983 / 114,000 B (trial switch lives in index.html). Independent review (5th run, separate agent, diff only): 2 real defects + 1 likely, all fixed — the Learn page and Evidence panel still said 2050 outlooks come from NASA NEX (S8c extended to Learn first, failed, now 0); with the trial on, the section buttons kept the old order; with one place the trial would push 'add places' below everything (trial now needs 2+ places); an invalid `?try` cleared saved trials. Trial off verified identical (section ids, nav, focus, jumps).
- 2026-11-27 · round 5 · no test notes. New checks: S7c/S7d ranking-note figures (tuning/held-out halves of places; plus card notes in the browser inside S7a) and S2l phone search covered. Kept: (1) ranking notes formatted in °F/in from unrounded values + round small rain figures keep a decimal — predicted S7c/S7d → 0, got 1700→0 / 1754→0, card notes 10→0 (sabotage: old code fails all three); (2) phone Filters button docks in the search row while the row is on screen — predicted S2l 2→0, got 0/0; (3) search phrase-as-tier + Hilo "Big Island" alias — predicted S1a +2, got 75→77/77, held-out 28/29 unchanged; top-5 diff on 35 landscape queries: 2 newly found (big sur, big bend), PNW/white mountains better, Tucson 2nd→4th for "sonoran desert". Rejected: phrase hits in their own rank band (broke "flagstaff az" and one held-out query). Independent review (4th run, separate agent, diff only) found 5 real defects, all in my code: the docked Filters button stuck where it was after the sheet closed (focus lands on it, and the dock update skipped focused buttons) → S2l extended first, fails on the old code, fixed; button lost its isolation if moved while the sheet was open (now waits for close); ASCII hyphen in negative notes; uneven range precision ("30–60 mm" → "1.2–2 in"); misplaced doc comment. Also the label's focus ring lit when only Filters had focus, and the dark theme kept the floating shadow when docked. Check fix: S2b read the list after a fixed 400 ms and failed once under load; it now waits for the list to settle. Entry chunk 113,984 / 114,000 B after the fixes (was 10 B over before a simpler refocus). Bolder idea this round (2050 figures check) not reached; top of backlog. Timing: this session's machine is slower than round 4's (same-day baseline, run while tests were running: 823 / 6246 / 2714 ms; final quiet runs 727–777 / 6120–6421 / 2258–2335 ms). No A/B against the old build was run, so "no speed regression" is estimated, not measured; first-load JS unchanged at 640 KiB. Final: 30/30 checks at target, Vitest 1,435 pass.
- 2026-11-26 · round 4 (your decisions) · profile-only fields split out of first load (first-load JS 742→639 KiB; first card on a slow phone ~6.1→~5.5 s; first profile 1.85→~1.75 s after moving to 10 group files — the per-country version made it 2.2 s, rejected); rankings, fit, feel, livability, tourism, exports identical (test). Link to saved places (S2i, 4 steps, asks first). Compare sunshine estimate marked "est." Reviewed date from stats. Found while building: export menu's last item covered by the scenario panel since before this session (S2k). Sabotage note: a sabotage edit that does not compile leaves the old dist in place — check the build succeeded before reading the result. Independent review (3rd run) found 5 defects in this round's code, all fixed with a failing check first: link prompt stole focus on every render; chapter-only search stale for deep links, under the 2050 layer (cache cleared only for base objects) and on save-data; failed profile-field retry re-downloaded on re-render and showed no notice; link copy awaited two chunk loads (Safari gesture); "Link copied" after a native share. I also found the scenario worker never got chapter text. Repo entry ceiling 113.5 → 114 KB for the review fixes (total ceiling 765 → 670 KB).
- 2026-11-25 · round 3 · new focus: are the numbers people read right. Added S7 (figures vs records, independent conversion, seeded + held-out) and S8 (confidence claims). Kept: export humidity/sunshine differences from unrounded values (S7a 96→5; review then caught station sunshine still rounded → 0); card chip "Summer humidity" (S7a 5→0, S7b 5→0); figures basis on profiles + two ratings + badge needs both (S8a 133→0, S8b 27→0); offline-cache pruning (S3d kept→dropped). From the independent review of rounds 2–3, all fixed with a failing check first: pruning blanked the next offline open after a deploy (now keeps previous build + cached page's files); history retry not shown; "qro"/"grand marais mi" search; alias duplicate on import. Rejected/deferred: showing the sunshine estimate in Compare (conflicts with a documented rule → Decision 4); switching the chip to annual humidity (would change what home-base compares). Round gain: large on trust (230+ wrong or overstated figures removed), none on speed.
- Rounds 1–2 (condensed): saved-place cap and two-tab sync; offline first visit; search abbreviations, state codes, dropped-letter typos; per-file site history and lazy receipts (profile 4.0→1.8 s); import saved places; review fix for a history retry storm. Rejected: 7-letter typo budget 2, plural variants, CACHE_URLS at SW ready, registry in entry chunk.
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Test notes (from you, dated)
- 2026-11-27: "Continue and merge when finished" (after round 5's report). No verdicts on items yet.

## Trials (off by default; switch on with the link, `?try=off` clears all)
- **compare-figures-first** (round 6) · `…/terraclima/?try=compare-figures-first` then open Compare on a phone. Summary and the figures table come before the lens picker, add places and sources. Off: summary 1516 px / first figure 4170 px down; on: 415 / 2576. Everything else identical (tests, S7a Compare figures run with it off). Compare: does the comparison read better starting from the summary, or do you miss "Compare for" at the top?

## Decisions for me
- Answered 2026-11-26 ("go with your recommendations and merge"): 1 corpus split — done; 2 share saved places by link — done (asks before adding); 3 Reviewed date — shown up front from stats.json; 4 sunshine estimate in Compare — shown as "~NN% est.".
- (none open)
