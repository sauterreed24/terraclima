# Atlas reading and evidence review

Review date: September 5, 2026. Base: `563bc6f`.

## What changed

- Mobile profiles expose every section through a sticky, chapter-grouped native picker, with previous/next buttons. Desktop chapter links have larger text and targets. Profile return-to-top has a visible label and cancels pending animation frames on unmount.
- Explorer offers a direct jump to ranked places and a return-to-map control after scrolling past the map. Both move keyboard focus along with the viewport and respect reduced motion.
- The map explains cluster counts versus gold ranks, labels Fit, and removes decorative rank rings from crowded, inactive markers while preserving badges, geographic anchors, leader lines, and hit targets.
- Every profile's four seasonal cards now show precipitation totals calculated from its monthly record. The explanation distinguishes averages from extremes and water-equivalent precipitation from snowfall depth.
- Generated seasonal prose no longer infers humidity, sunshine, rain frequency, persistent snow cover, or tropical storms from unrelated aggregate fields. Comfort language explicitly refers to the atlas screen.
- Missing snowfall data no longer leads to a rain-only label. Gardening windows no longer promise freedom from frost. Comfort-card cautions use practical fit or location text instead of an internal writing score.
- Pátzcuaro's seasonal narrative now describes its wet/dry rhythm without repeating temperatures from an older record. Its profile includes direct INAH history references. Oaxaca's summary no longer contradicts its current climate figures. Driggs no longer describes −30°C mornings as routine or presents its valley as a closed basin in a Teton rain shadow.

## Evidence and scope

The climate arrays, scoring formulas, and scenario transformations are preserved. Structural and arithmetic checks cover all 226 locations; new tests reconcile seasonal precipitation with every monthly record. These checks do **not** establish that every historical, cultural, ecological, or parcel-level statement has been independently verified.

| Source | Relevance |
| --- | --- |
| [Daymet variable definitions](https://daymet.ornl.gov/overview) | Precipitation is the water-equivalent sum of all forms. Vapor pressure, radiation, and snow water equivalent are distinct variables. Monthly totals alone cannot establish event frequency. |
| [NOAA climate normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) | Normals summarize conditions over a specified period; they are not extreme-temperature limits or forecasts. |
| [NWS humidity explanation](https://www.weather.gov/lmk/humidity) | Humidity requires moisture and temperature context, rather than a precipitation-total shortcut. |
| [INAH: Pátzcuaro](https://lugares.inah.gob.mx/es/node/4803) | Episcopal, civic, and urban history. |
| [INAH: Tzintzuntzan](https://lugares.inah.gob.mx/es/node/5548) | The linked Purépecha centers and Tzintzuntzan's role as the final capital. |

## Review and verification

The starting revision passed 1,148 Vitest tests. The corpus, coverage, climate-data, research, voice, consistency, metadata, Celsius, and polish audits passed. The Driggs temperature warning identified by the corpus audit was corrected. Existing sanity warnings compare snowfall or hardiness to monthly average lows; those are different statistics and were not used as justification to rewrite sourced data.

Run `npm run quality:check` and the documented browser/map suites before release. In this environment, the `tsx` CLI could not create its IPC socket; the same audit entry points can be executed with `node --import tsx scripts/<script>.ts` without changing application code or dependencies.

The published Most comfortable view was inspected in light and dark themes. Map-to-profile opening, section jumps, return-to-top, empty search, recovery, and Celsius switching were exercised on that published baseline. This is not a visual test of the patch.

The cloud browser explicitly blocked the local preview URL by security policy. No alternate local browser route was used. Responsive rendering, touch gestures, and visual verification of the changed build remain release requirements; do not describe them as passed on the strength of DOM tests alone.
