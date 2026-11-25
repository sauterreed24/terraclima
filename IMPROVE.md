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
| id | check | target | baseline 2026-11-25 | now |
|----|-------|--------|---------------------|-----|
| S1a | search: intended place on top, tuning set (44 realistic queries) | ≥ 95% | 38/44 | 43/44 |
| S1b | same, **held-out** set (30) — never tune on it | ≥ 90% | 24/30 | 27/30 |
| S2a–e | main jobs done, steps: find (≤2), must-have list = independent reference (exact), save+compare (≤5), home base (≤2), export JSON (≤2) | all done, steps ≤ target | all done: 2/2/5/2/2 | same |
| S3a | saved items lost (reload, 61st save, two tabs) | 0 | 11 (cap of 50 drops oldest) | 0 |
| S3c | a second open tab shows saves made in the first | yes | no | yes |
| S4a | failure scenarios where app stays usable (bad link, corrupt storage, storage blocked, offline reload, offline profile reopen, failed code chunk) | all | 4/6 (offline: blank page) | 6/6 |
| S5a | first ranked card, desktop, ms (median [min–max], 5 runs) | ≤ 1500 | 626–674 [579–728] | 591–638 [576–676] |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | 6169–6227 [6012–6523] | 6078–6194 [6024–6419] |
| S5c | first-load JS, KiB gzip | ≤ 747 | 740 | 740 |
| S5d | first profile open, phone 1.6 Mbps + 4× CPU, ms until its climate figures show | ≤ 3000 | 4032 [4027–4045] (added mid-round) | 1837–1927 [1533–1936] |
| S5e | first profile open, KB gzip downloaded | ≤ 250 | 676 (added mid-round) | 125 |
| S6a | console/page errors across all tasks | 0 | 0 | 0 |

Noise: non-timing rows identical across two runs. Timing medians move ≈ ±50 ms (desktop) and ±150 ms (throttled) between runs; smaller changes are noise.
Proven to fail on a broken build: S2b (filter loosened by 1 °C → "shown 105 vs ref 91"). S1/S3/S4/S5d/S5e failed on the baseline itself. S3c regression test fails without the storage listener.
All targets are now met: next round should raise the bar (see Backlog 1).

## Checks for a human (cannot be scripted here)
- Look and layout on a real phone (iOS Safari, Android Chrome), both themes.
- Screen reader pass (VoiceOver / TalkBack) on search → profile → save → compare.
- Offline: install to home screen, airplane mode next day, open the app.

## Backlog (top first)
1. Raise the bar: new held-out search set (the current one has been looked at: its 3 misses were seen); harder S5b target (first card on a slow phone is 6.1 s, almost all of it the 740 KiB corpus).
2. Saved places only live in one browser: share link / import for another device or a partner (data portability). Needs a URL param → Decisions for me.
3. First load is 740 KiB gzip of JS because the whole corpus prose loads up front; split numeric atlas data from profile prose (see Alternatives).
4. Search misses still open: "big island" (Hilo 3rd), "sante fe" (Santa Cruz first), "smoky mountains" (no stem match for Smokies), "la paz bcs" (no Mexican state abbreviations). Seen on held-out, so a fix must be general and re-checked on a fresh held-out set.
5. Profile hop to a place in another site-history file shows the loading fallback for one small download; could prefetch on card hover.
6. Creel and other Tier C grid-only places: station data unreachable from this environment.

## Alternatives (strong ideas not taken yet)
- Corpus split (numbers first, prose lazily per profile) to cut first-load JS by roughly half. Large refactor touching search (prose tiers) and the budget script. Round 1's site-history split shows the pattern works (registry + id index + `use`).
- Site history per place (226 tiny files) instead of per file of ~23 places: ~5 KB instead of ~50 KB per open; not worth the churn while S5e is at 125 KB.
- Typo budget 2 for every 7-letter token: same tuning gain as the kept "two dropped letters" rule but "houston" → Houghton, "sequoia" → Sequim. Rejected.

## Strategy (kinds of change → hit rate)
- Data-safety bug fixes: 2/2 kept (saved-place cap, two-tab sync). Cheap, clear wins; look for more silent caps/overwrites.
- Error recovery / offline: 1/1 kept (+ found a latent unhandled rejection). Testing failure modes in a real browser found what unit tests could not.
- Search accuracy: 1/2 versions kept (simplest broad version had false positives; narrower rule won).
- Performance (lazy data on the profile path): 2/2 kept, largest measured gain of the round (4.0 s → 1.8 s). Measure *what is downloaded per action*, not only first load.
- Workflow / new features: 0 tried (portability idea needs a decision).

## Playbook
- Chromium: `/opt/pw-browsers/chromium` with `playwright-core` (do not `playwright install`).
- Route every non-local request to abort in browser tests; external hero photos otherwise log `ERR_TUNNEL` errors.
- The service worker only caches what is fetched after it controls the page; test offline with a reload after `navigator.serviceWorker.ready`.
- `searchPlaces` + `runScenarioRanking` give the exact app order in Node — test search there, not in the browser.
- Throttled timing must block the service worker (`serviceWorkers: "block"`), or its fetches skip the throttle. Scope text waits to the dialog. (provisional)
- `vite.config.ts` `manualChunks` groups by path: a new small module in a data folder can drag a whole data chunk into first load. Check `npm run check:performance-budget` after moving imports. (provisional)
- A/B timing: build both versions into separate dist copies and alternate runs (`--only=speed`), 3 pairs; single runs mislead. (provisional)
- Before trusting a new check, sabotage the code it guards and see it fail.

## Log
- 2026-11-25 · round 1 · kept: saved-place cap → no eviction (S3a 11→0); offline first-visit caching + ignoreVary (S4a 4/6→6/6); search abbreviations + dropped-letter rule (S1a 38→43, held-out 24→27); two-tab sync (S3c no→yes); per-file site history (S5d 4.0→1.8 s, S5e 676→241 KB); receipts on panel open (S5e 241→125 KB). Rejected: typo budget 2 for all 7-letter tokens (2/23 new false positives); posting CACHE_URLS at SW ready (+50–70 ms desktop first card in 2/3 A/B pairs → deferred to idle, now within noise); site-history registry in the entry chunk (+4 KiB first load, entry over budget → own lazy chunk). Round gain: every scorecard row at target; largest user-visible gain is profile open on slow phones.
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Decisions for me
- (none yet)
