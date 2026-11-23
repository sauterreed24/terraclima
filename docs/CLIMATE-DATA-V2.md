# Climate Data V2 — methodology

Terraclima’s default “Now” layer is a **rolling 1996–2025 climatology** derived from Daymet V4 R1 daily 1 km data. It is **not** a WMO standard normal. The official **1991–2020** WMO normal is retained as the same-source comparison/reference period.

## Sources and roles

| Role | Source | Policy |
|------|--------|--------|
| Canonical cross-border climate | Daymet V4 R1 (ORNL DAAC) | Single Pixel API; record software version, grid elevation, response hashes |
| Official validation | NOAA/GHCN-D & normals (USA); ECCC (Canada); SMN/WMO (Mexico) | Validate the grid. A reviewed station correction (below) is the only way a station changes it, and the profile names the station |
| Humidity reference | NOAA ISD hourly dew points | Scale Daymet vapour pressure month by month (below) |
| Fallback / QA | ERA5-Land | Only for Daymet failure, offshore/land-mask exceptions, or independent QA |
| US diagnostic | PRISM | May validate difficult US terrain; not cross-border truth |
| Historical comparator | WorldClim 2.1 (1970–2000) | Not used as “current” provenance |
| Future scenarios | NASA NEX-GDDP-CMIP6 | Ensemble median + P10/P90; research/screening only |

## Aggregation formulas

- **Monthly high/low:** mean of daily `tmax` / `tmin`
- **Monthly precipitation:** each year’s monthly total, then average yearly totals
- **`annualPrecipMm`:** always equals the sum of the twelve monthly normals
- **Relative humidity:** from Daymet vapor pressure + daily mean temperature (Magnus); clamp only after flagging impossible inputs. Daymet's vapour pressure runs too dry wherever moist air outlasts the rain, so it is first scaled month by month to hourly dew points from a representative ISD station (`scripts/climate-data/station-humidity.ts`, `data/climate-v2/stations/humidity-bias.json`): within 40 km for 183 places, a reviewed regional station for 17 more
- **Heat index and wet-bulb** (the profile's **Heat and humidity** section; `src/lib/comfort-precision.ts`): the afternoon high paired with the humidity of the afternoon, found by holding the dew point constant, not with the daily-mean humidity. The heat index is the NWS formula and is not floored at the air temperature, so in very dry air it reads a little below the thermometer
- **Solar resource:** `srad × dayl ÷ 1_000_000` → MJ/m²/day (not observed sunshine hours)
- **Sunshine share:** station sunshine records where a place has one. Elsewhere the share of possible sunshine is estimated from the clearness index (solar energy at the ground ÷ top-of-atmosphere radiation), with a line fitted to the 1,542 place-months that have both (`estimatedSunshinePct` in `src/lib/climate-metrics.ts`); mean error against station records is 8.7 points. The “Sunniest winters” ranking says which basis each figure rests on
- **Frost-free season:** the median, over the years, of the season between the last spring freeze and the first autumn freeze (not 365 minus a count of frosty days)
- **Growing degree days:** base 10°C in source, shown as base 50°F
- **Snowpack:** Daymet `swe` → snowpack days / mean / max SWE — **never** relabeled as snowfall cm
- **Chill hours:** not generated from daily data; keep hourly-source values or mark unavailable
- Daymet years always have **365** days (leap day kept; Dec 31 dropped in leap years)

## Periods

- `rolling-1996-2025` — default Now / Recent
- `wmo-1991-2020` — comparison receipt (JJA high, winter low, annual precip change). The winter figure is the December–February mean low and is labelled **Winter low** in the interface; the field keeps its older name, `janLowDeltaC`

## Validation

Station candidates: ≤75 km, ≤300 m elevation delta, ≥24 usable years, ≥80% valid days for included months. Prefer ≤25 km / ≤150 m. Validated when annual temperature MAE ≤2°C and precip bias ≤30%; otherwise `reviewed-exception` or `grid-only` (Tier C).

## Station corrections

The 1 km grid smooths away the local effects the atlas is about: cold-air pools, fog coasts, lake shores, rain shadows. A place is corrected only where a representative GHCN-Daily station sits beside it: within 15 km and 100 m of elevation, with 15 or more overlapping years and no disagreeing neighbour. The station-minus-grid difference for each calendar month is added to the grid's daily Tmax/Tmin, and precipitation is scaled by the station/grid ratio, before normals are aggregated, so frost days, growing degree days and the rest follow (`scripts/climate-data/lib/station-correction.ts`, `data/climate-v2/stations/station-bias.json`). `precipFromYear` limits a precipitation ratio to the years after a grid drifted from its station (Whitehorse). 53 places carry a correction and show “validated” with the station named. A station outside the tolerances does not correct the grid, even when it disagrees (Lone Pine against Independence, 25 km away).

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
- Humidity is grid vapour pressure scaled to a station's dew points, not a station RH record at the place itself
- Solar resource is not observed sunshine hours; the sunshine share estimated from it carries a mean error of about 9 points
- NEX-GDDP ensemble deltas require authenticated/open ingest; places may show `projection.status = unavailable` until ensemble assets are committed
- Risk fields (flood, coastal, wildfire, smoke, landslide) remain editorially sourced in this program
