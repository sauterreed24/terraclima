# Climate Data V2 Audit Report

Generated: 2026-08-09T16:57:22.941Z

## Coverage
- Authored places: 226
- Generated V2 records: 226
- Missing: none

## Validation status
- validated: 0
- grid-only: 163
- reviewed-exception: 63

## Shadow diff (authored vs Daymet 1996–2025)
- Temperature outliers (|Δ| > 2°C annual high or low): **66**
- Precipitation outliers (|bias| > 30%): **20**
- Elevation outliers (|Δ| > 250 m): **2**

Large differences are a **review queue**, not automatic proof either value is wrong.

## Template retirement
- Exact duplicate humidity array groups: 0
- Exact duplicate solar array groups: 0

## Unexplained items
- none (elevation mismatches have documented climate-anchor overrides; temp/precip deltas are the reviewed queue below)

## Review queue policy
Authored-vs-Daymet outliers are **not** auto-corrected. Runtime uses Daymet 1996–2025. See `stations/reviewed-exceptions.json` for named causes (terrain, coastal-exposure, zone-vs-town, elevation-mismatch, authored-blend-divergence, station-mapping-pending).

## Priority review IDs
- hood-river-gorge
- redfield-ny
- honolulu-hi
- mount-charleston-nv
- lone-pine-ca
- real-catorce-mx
- ensenada-mx
- iqaluit-nu
- prince-rupert-bc
- santa-barbara-ca
- driggs-id
- traverse-city-mi
- ithaca-ny
- grand-marais-mn
- boulder-co
- grand-marais-mi
- santa-cruz-felton-ca
- eureka-ca
- point-reyes-ca
- truckee-ca
- mammoth-lakes-ca
- fort-davis-tx
- marfa-tx
- prescott-az
- bishop-ca
- joseph-or
- leavenworth-wa
- port-orford-cape-blanco-or
- klamath-falls-upper-klamath-basin-or
- tucson-az

See `shadow-diff.json` for full outlier tables and `RANK-DIFF.md` for lens movement >25 places.
