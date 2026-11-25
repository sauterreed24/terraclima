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
| S1a | search: intended place on top, tuning set (44 realistic queries) | ≥ 95% | 38/44 | |
| S1b | same, **held-out** set (30) — never tune on it | ≥ 90% | 24/30 | |
| S2a–e | main jobs done, steps: find (≤2), must-have list = independent reference (exact), save+compare (≤5), home base (≤2), export JSON (≤2) | all done, steps ≤ target | all done: 2/2/5/2/2 | |
| S3a | saved items lost (reload, 61st save, two tabs) | 0 | 11 (cap of 50 drops oldest) | |
| S3c | a second open tab shows saves made in the first | yes | no | |
| S4a | failure scenarios where app stays usable (bad link, corrupt storage, storage blocked, offline reload, offline profile reopen, failed code chunk) | all | 4/6 (offline: blank page) | |
| S5a | first ranked card, desktop, ms (median [min–max], 5 runs) | ≤ 1500 | 626–674 [579–728] | |
| S5b | first ranked card, phone 1.6 Mbps + 4× CPU, ms | ≤ 8000 | 6169–6227 [6012–6523] | |
| S5c | first-load JS, KiB gzip | ≤ 747 | 740 | |
| S5d | first profile open, phone 1.6 Mbps + 4× CPU, ms until its climate figures show | ≤ 3000 | 4032 [4027–4045] (added mid-round) | |
| S5e | first profile open, KB gzip downloaded | ≤ 250 | 676 (added mid-round) | |
| S6a | console/page errors across all tasks | 0 | 0 | |

Noise: non-timing rows identical across two runs. Timing medians move ≈ ±50 ms (desktop) and ±150 ms (throttled) between runs; smaller changes are noise.
Proven to fail on a broken build: S2b (filter loosened by 1 °C → "shown 105 vs ref 91"). S1/S3/S4 failed on the baseline itself.

## Checks for a human (cannot be scripted here)
- Look and layout on a real phone (iOS Safari, Android Chrome), both themes.
- Screen reader pass (VoiceOver / TalkBack) on search → profile → save → compare.
- Offline: install to home screen, airplane mode next day, open the app.

## Backlog (top first)
1. Search: abbreviations (mt/ft/pt/st/saint), two-letter typos in 7-letter names ("ashvile"), plural/stem ("smoky" vs "Smokies").
2. Saved places only live in one browser: share link / import for another device or a partner (data portability).
3. First load is 740 KiB gzip of JS because the whole corpus prose loads up front; split numeric atlas data from profile prose (big; see Alternatives).
4. Creel and other Tier C grid-only places: station data unreachable from this environment.

## Alternatives (strong ideas not taken yet)
- Corpus split (numbers first, prose lazily per profile) to cut first-load JS by roughly half. Large refactor touching search (prose tiers) and the budget script.

## Strategy (kinds of change → hit rate)
- (new) Data-safety bug fixes · Error recovery / offline · Search accuracy · Workflow · Performance — no rounds scored yet.

## Playbook
- Chromium: `/opt/pw-browsers/chromium` with `playwright-core` (do not `playwright install`).
- Route every non-local request to abort in browser tests; external hero photos otherwise log `ERR_TUNNEL` errors.
- The service worker only caches what is fetched after it controls the page; test offline with a reload after `navigator.serviceWorker.ready`.
- `searchPlaces` + `runScenarioRanking` give the exact app order in Node — test search there, not in the browser.

## Log
- 2026-11-25 · check fix · throttled runs (S5b, S5d) now block the service worker: its own fetches bypass page-level throttling, which made a profile open look like 1.8 s instead of 4.0 s. S5d's first selector also matched "climate normals" outside the profile.
- 2026-11-25 · session 1 · created IMPROVE.md and `eval/` (search query sets, browser jobs, data safety, recovery, speed).

## Decisions for me
- (none yet)
