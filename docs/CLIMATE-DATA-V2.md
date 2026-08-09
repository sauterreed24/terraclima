# Climate Data V2 — methodology

Terraclima’s default “Now” layer is a **rolling 1996–2025 climatology** derived from Daymet V4 R1 daily 1 km data. It is **not** a WMO standard normal. The official **1991–2020** WMO normal is retained as the same-source comparison/reference period.

## Sources and roles

| Role | Source | Policy |
|------|--------|--------|
| Canonical cross-border climate | Daymet V4 R1 (ORNL DAAC) | Single Pixel API; record software version, grid elevation, response hashes |
| Official validation | NOAA/GHCN-D & normals (USA); ECCC (Canada); SMN/WMO (Mexico) | Validate the grid — do not silently replace it |
| Fallback / QA | ERA5-Land | Only for Daymet failure, offshore/land-mask exceptions, or independent QA |
| US diagnostic | PRISM | May validate difficult US terrain; not cross-border truth |
| Historical comparator | WorldClim 2.1 (1970–2000) | Not used as “current” provenance |
| Future scenarios | NASA NEX-GDDP-CMIP6 | Ensemble median + P10/P90; research/screening only |

## Aggregation formulas

- **Monthly high/low:** mean of daily `tmax` / `tmin`
- **Monthly precipitation:** each year’s monthly total, then average yearly totals
- **`annualPrecipMm`:** always equals the sum of the twelve monthly normals
- **Relative humidity:** estimated from Daymet vapor pressure + daily mean temperature (Magnus); clamp only after flagging impossible inputs; labeled “estimated from vapor pressure”
- **Solar resource:** `srad × dayl ÷ 1_000_000` → MJ/m²/day (not observed sunshine hours)
- **Snowpack:** Daymet `swe` → snowpack days / mean / max SWE — **never** relabeled as snowfall cm
- **Chill hours:** not generated from daily data; keep hourly-source values or mark unavailable
- Daymet years always have **365** days (leap day kept; Dec 31 dropped in leap years)

## Periods

- `rolling-1996-2025` — default Now / Recent
- `wmo-1991-2020` — comparison receipt (JJA high, January low, annual precip change)

## Validation

Station candidates: ≤75 km, ≤300 m elevation delta, ≥24 usable years, ≥80% valid days for included months. Prefer ≤25 km / ≤150 m. Validated when annual temperature MAE ≤2°C and precip bias ≤30%; otherwise `reviewed-exception` or `grid-only` (Tier C).

## Pipeline commands

```bash
npm run climate:data:update -- --through=2025   # fetch + generate + verify + audit
npm run climate:data:verify                     # offline hash/manifest checks
npm run climate:data:audit                      # shadow-diff + human audit report
```

Raw Daymet CSVs live in `.cache/daymet/` (gitignored). Committed artifacts: `data/climate-v2/manifest.json`, `src/data/generated/climate-v2/records.json`, and audit reports under `data/climate-v2/audit/`.

## Freshness

A monthly read-only workflow checks whether Daymet’s latest complete calendar year advanced. When it advances, regenerate a candidate rolling window and open a PR only if checks pass. Never auto-merge.

## Known limitations

- 1 km Daymet pixels can misrepresent steep terrain, gorge floors, and coastal exposure
- Humidity is estimated, not station RH
- Solar resource is not observed sunshine hours
- NEX-GDDP ensemble deltas require authenticated/open ingest; places may show `projection.status = unavailable` until ensemble assets are committed
- Risk fields (flood, coastal, wildfire, smoke, landslide) remain editorially sourced in this program
