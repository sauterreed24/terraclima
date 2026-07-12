# Terraclima consolidation audit

Last updated: 2026-07-12. Baseline: `main` @ `5e6221a` (clean tree). Quality gate green before edits.

## 1. Current product thesis

Terraclima is a static North American microclimate atlas. The core question is why a place feels climatically different from its region, and what that difference means for visiting, living, growing, or investigating there. Discovery leads; relocation, ranking, tourism, and screening tools are progressive disclosure.

## 2. Current architecture

- Vite + React 19 + TypeScript SPA; GitHub Pages canonical deploy.
- `App.tsx` (~4.4k LOC) owns URL sync, filters, ranking, scenario, home base, compare, overlays, and Explorer composition.
- Custom SVG Albers atlas (`AtlasMap.tsx` ~3.4k LOC) with `atlas-map-*` pure geometry libs and `use-atlas-map-view`.
- Place dossiers (`PlaceDetail.tsx` + `place-detail/*`) are long-form field guides with deep-link hashes.
- Corpus: 226 places across USA / Canada / Mexico; typed schema in `types.ts`.
- Deterministic scoring, projection, analogs, and geospatial screening live under `src/lib/`.

## 3. Strong systems that must be preserved

- URL invariants (`app-url.ts`, `docs/URL-INVARIANTS.md`) and Back-to-close.
- Discovery-first cold start (Most unique; Scout tools deferred).
- Mechanism-first cards when not on an explicit fit path (`place-card-screening.ts`).
- Map gestures: one-finger pan, pinch, scroll escape, hybrid handoff, clusters, keyboard roving tabindex, chrome-aware framing.
- Scenario honesty: dossier stays present-day; Explorer/Compare project; home deltas never mix timelines when wired correctly.
- Static deploy, no backend, no opaque AI output.
- Corpus audits: sanity, prose, gold ranks, citation HTTPS, tier A/B source floors.

## 4. Highest-risk concentration points

- `App.tsx` state ownership density (URL, persistence, focus restore, Explorer).
- `AtlasMap.tsx` interaction surface (regression risk if split carelessly).
- Compare under `scn≠now` with slots outside the filtered pool (present-day fallback labeled as projection).
- Evidence communication: measured normals, derived bioclim, screening scores, and regional projections share visual weight in the dossier.
- Initial modulepreload payload (~650 KB gzip JS+CSS including country corpora).

## 5. User-journey problems

- Reader-path / quick picks / lens receipt / Scout tools / home-base cue can still feel like several simultaneous next actions on desktop after Scout tools open.
- Journey bridge copy used em dashes and stacked CTAs before home was set.
- Evidence and citations sit at the end of a long dossier; readers meet scores earlier without a compact “how to read this profile” frame.

## 6. Evidence and trust problems

- Citations and confidence exist, but there is no shared evidence-class vocabulary for UI sections.
- Bioclim indices, livability, geospatial screens, and climate outlook can be misread as measured station products.
- Projection banner exists, but score sections lack a consistent screening-grade label.
- Authored `Place.projection` overrides need citation support enforced in audits.

## 7. Accessibility risks

- Baseline axe playtest reports zero serious/critical on major routes (post map `role="application"` fix).
- Residual risk: focus restore races, modal close to body, map nested-interactive regressions if chrome is moved carelessly.
- Touch targets and reduced-motion paths are covered by CSS/DOM tests; browser matrix still needed for hybrid touch.

## 8. Performance risks

- Budget only guards cold chunks from becoming modulepreloads; no byte ceilings on entry JS/CSS.
- Country place chunks preload with the app (product requirement); growth must be watched.
- `playtest:map` exists but is optional, undocumented as a CI job, and not a full product smoke suite.

## 9. Repository and test gaps

- 1037 Vitest tests pass at baseline; prose/celsius/polish/corpus gates pass.
- No pinned Playwright dependency or `test:browser` / `playtest:browser` npm script.
- No reproducible browser smoke covering Explorer/dossier/Compare/a11y matrix beyond map-focused playtest.
- Open draft PRs repeatedly target Compare out-of-pool scenario projection; fix not yet on `main`.

## 10. Selected release scope

1. **Evidence hierarchy** — `evidence-summary` module, dossier Evidence disclosure, section labels, corpus validation extensions.
2. **Discovery clarity** — tighten continuation cues; keep atlas-first; no new modes.
3. **Orchestration decomposition** — extract coherent App helpers/hooks and AtlasMap subcomponents without behavior change; wire Compare slot projection helper.
4. **Verification** — extend performance byte budgets; add Playwright browser smoke command + CI job; document gates.

## 11. Explicit non-goals

- No Mapbox/Leaflet/Next.js/Redux.
- No URL semantic changes.
- No corpus place deletion or fabricated citations.
- No marketing hero, onboarding carousel, or AI chatbot.
- No wholesale visual redesign.
- No merging of this PR by the agent.

## 12. Before-and-after verification results

### Before (baseline)

| Check | Result |
|-------|--------|
| `npm run quality:check` | Pass |
| Vitest | 1037 passed |
| Corpus | 226 places; 0 audit errors/warnings |
| Cold preload budget | Pass (15 modulepreloads) |
| Entry CSS raw / gzip | ~322 KB / ~56 KB |
| Entry `index-*.js` raw / gzip | ~349 KB / ~100 KB |
| `playtest:map` | Not run at baseline (optional; Chrome present) |

### After

Filled in at release finalization (see Verification section of the PR report).
