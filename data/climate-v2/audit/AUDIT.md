# Climate Data V2 Audit Report

Generated: 2026-10-17T16:45:41.720Z

## Coverage
- Authored places: 226
- Generated V2 records: 226
- Missing: none

## Validation status
- validated: 53
- grid-only: 126
- reviewed-exception: 47

## Shadow diff (authored vs Daymet 1996–2025)
- Temperature outliers (|Δ| > 2°C annual high or low): **66**
- Precipitation outliers (|bias| > 30%): **16**
- Elevation outliers (|Δ| > 250 m): **2**

Large differences are a **review queue**, not automatic proof either value is wrong.

## Template retirement
- Exact duplicate humidity array groups: 0
- Exact duplicate solar array groups: 0

## Unexplained items
- none (elevation mismatches have documented climate-anchor overrides; temp/precip deltas are the reviewed queue below)

## Review queue policy
Authored-vs-Daymet outliers are **not** auto-corrected. Runtime uses Daymet 1996–2025, except where a reviewed GHCN-Daily station beside the place shows the grid missing a local effect (cold-air pool, fog coast, lake shore, rain shadow): those places use Daymet bias-corrected month by month to that station (`stations/station-bias.json`, status "validated"). See `stations/reviewed-exceptions.json` for named causes (terrain, coastal-exposure, zone-vs-town, elevation-mismatch, authored-blend-divergence, station-mapping-pending).

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
- bishop-ca
- silver-city-nm
- driggs-id
- traverse-city-mi
- ithaca-ny
- boulder-co
- grand-marais-mi
- santa-cruz-felton-ca
- point-reyes-ca
- truckee-ca
- mammoth-lakes-ca
- fort-davis-tx
- marfa-tx
- prescott-az
- cloudcroft-nm
- stanley-id
- friday-harbor-wa
- leavenworth-wa
- tucson-az
- fernie-elk-valley-bc
- salt-spring-bc
- whitehorse-yt

See `shadow-diff.json` for full outlier tables and `RANK-DIFF.md` for lens movement >25 places.
