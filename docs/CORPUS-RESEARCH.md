# Corpus research, voice, and lived indicators

## Base SHA

This overhaul started from `origin/main` at
`4ac96e6654c4b9bc3f3654844c7c147538bca7c3`.

## Architecture

- **Climate Data V2** remains the runtime climate source (Daymet V4 R1;
  Now = 1996–2025; WMO comparison = 1991–2020). Projections stay unavailable
  where NASA/NEX-GDDP ingest is absent.
- **Research receipts** (`PlaceResearchReceipt`) live under
  `src/data/generated/research/receipts.json` and are lazy-loaded for the
  Evidence chapter. A compact `citations-overlay.json` projects deprecated
  `Citation[]` compatibility into runtime place records without shipping the
  full receipt graph on cold load.
- **Ledger** (`data/research/ledger.json`) tracks inventory → verified status
  for all 226 place IDs.
- **Voice guide**: `docs/VOICE-GUIDE.md`.

## Lived indicators

`socialStress` is removed from UI, ranking, and published data. Lived reality
uses housing pressure (within-country percentile) and access remoteness, with
optional dated fields for housing-cost burden, hospital/airport minutes,
service-hub class, and transport constraints. Missing data is not imputed.

## Verification scripts

| Script | Role |
|--------|------|
| `npm run corpus:research:verify` | Receipt/claim coverage (in `quality:check`) |
| `npm run corpus:voice:check` | Banned phrases, duplicates, authored experience |
| `npm run corpus:consistency:check` | Units, monthly arrays, precip totals, coords |
| `npm run corpus:links:check` | Live URL validation (release / scheduled) |
| `npm run corpus:research:report` | Human-readable coverage audit |

## Freshness

- Climate normals: Daymet through 2025 (V2 pipeline).
- Research receipts: `reviewedOn` per place; re-run
  `scripts/research/advance-ledger-batches.ts` after batch edits.
- Travel hours/prices/closures are not stored; link to official pages.
