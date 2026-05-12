import { localizeProse } from "../src/lib/units";

interface Case { input: string; expect: string[]; reject?: string[]; unit?: "F" | "C"; dist?: "imperial" | "metric" }

const cases: Case[] = [
  // Temperature (existing corpus)
  { input: "summer highs near 23°C, winter lows near \u221227°C", expect: ["73\u00b0F", "\u221217\u00b0F"] },
  { input: "warming (+3 to +5\u00b0C) likely fastest on Earth", expect: ["+5 to +9\u00b0F"] },
  { input: "cold pools sit 5\u201315\u00b0C colder than ridges", expect: ["9\u201327", "colder"] },
  { input: "can lift January temperatures to +15\u00b0C", expect: ["+27\u00b0F"] },
  { input: "valley 18\u201320\u00b0C while inland roasts past 35\u00b0C", expect: ["64\u201368\u00b0F", "95\u00b0F"] },
  { input: "summer highs 30\u201333\u00b0C, lows 17\u201323\u00b0C", expect: ["86\u201391\u00b0F", "63\u201373\u00b0F"] },
  { input: "spike 10\u00b0C in hours", expect: ["18\u00b0F"] },
  { input: "50\u00b0C annual range", expect: ["90\u00b0F"] },
  { input: "annual swing near 9\u00b0C apart", expect: ["16\u00b0F"] },
  { input: "drives highs into the low 70s \u00b0F", expect: ["low 70s \u00b0F"] },
  { input: "windchills near \u221260\u00b0C are normal", expect: ["\u221276\u00b0F"] },
  { input: "25\u201330\u00b0C while Monterey holds at 18\u201320\u00b0C", expect: ["77\u201386\u00b0F", "64\u201368\u00b0F"] },
  { input: "15 \u00b0C warmer in 10 minutes", expect: ["27\u00b0F warmer"] },
  { input: "Afternoons rarely exceed 23\u00b0C even at peak sun", expect: ["73\u00b0F"] },
  { input: "2\u20133\u00b0C cooler year-round", expect: ["4\u20135\u00b0F cooler"] },

  // --- Distance / elevation / precip / snow / wind (NEW) ---
  { input: "Xalapa sits at 1,427 m on the eastern slope", expect: ["4,682 ft"] },
  { input: "Rainfall is heavy and persistent (1,500 mm annually)", expect: ["59 in"] },
  { input: "gets 420 cm of snow in a normal winter", expect: ["165 in"] },
  { input: "10 km west of the escarpment", expect: ["6.2 mi"] },
  { input: "peak of 3,850 m elevation", expect: ["12,631 ft"] },
  { input: "winds of 25 km/h are routine", expect: ["16 mph"] },
  { input: "storm gusts up to 100 kph", expect: ["62 mph"] },
  { input: "elevation 800 m, with 600 mm of annual precip and 80 cm of snow",
    expect: ["2,625 ft", "24 in", "31 in"] },
  // Reject cases: things that MUST NOT be touched. Use whole-token checks.
  { input: "held within 10 minutes of the coast", expect: ["10 minutes"], reject: [" ft ", " mi ", " mph "] },
  { input: "Köppen class BSk dominates", expect: ["BSk"], reject: [" ft ", " mi "] },
  { input: "the mm-level precision radar sees it", expect: ["mm-level"], reject: [" in "] },

  // Decade shorthand (°C → °F)
  { input: "highs rarely leave the 20s °C.", expect: ["68\u201384\u00b0F"] },
  { input: "afternoons in the 20s Celsius.", expect: ["68\u201384\u00b0F"] },

  // Celsius mode (keep metric untouched when dist=metric)
  { input: "Xalapa sits at 1,427 m on the eastern slope",
    expect: ["1,427 m"], reject: ["ft"], unit: "C", dist: "metric" },
  { input: "summer highs near 23°C",
    expect: ["23°C"], reject: ["73°F"], unit: "C", dist: "metric" },

  // --- Regression: clause-boundary delta detection ---
  // Previously: "exceed 23°C ... fall below −25°C" caused `23°C` to pick up
  // "below" from the other clause and convert as a delta (→ 41°F). With
  // clause-bounded windows it must stay absolute (→ 73°F).
  { input: "Summer afternoons rarely exceed 23°C; winter nights can fall below \u221225°C in cold pools",
    expect: ["73\u00b0F", "\u221213\u00b0F"], reject: ["41\u00b0F"] },
  { input: "Days peak at 28°C. Temperatures fall 5°C lower at night",
    expect: ["82\u00b0F", "9\u00b0F lower"] },
  { input: "afternoon peaks 26°C, morning drops of 8°C are common",
    expect: ["79\u00b0F", "14\u00b0F"] },

  // --- Regression: hyphenated metric adjectival forms ---
  { input: "a 980-meter-high ridge funnels the fog",
    expect: ["3,215-foot-high"], reject: ["980-meter", " 980 m"] },
  { input: "the 4,200-meter summit catches the first light",
    expect: ["13,780-foot"], reject: ["4,200-meter"] },
  { input: "a 12-kilometer corridor of dunes",
    expect: ["7.5-mile corridor"], reject: ["12-kilometer", "12-km"] },
  { input: "a 15-km escarpment rises sharply",
    expect: ["9.3-mile escarpment"], reject: ["15-km", "15 km"] },
  { input: "a 20-centimeter snowpack lingers into April",
    expect: ["7.9-inch"], reject: ["20-centimeter", "20 cm"] },
  { input: "a 200-millimeter flood event",
    expect: ["7.9-inch"], reject: ["200-millimeter", "200 mm"] },

  // --- Spelled-out metric units (non-hyphenated) ---
  { input: "the tower stands at 980 meters above the valley",
    expect: ["3,215 feet"], reject: ["980 m ", "980 meters"] },
  { input: "the pass is 12 kilometers long",
    expect: ["7.5 miles long"], reject: ["12 kilometers", "12 km "] },
  { input: "20 centimeters of fresh powder",
    expect: ["7.9 inches"], reject: ["20 centimeters"] },
  { input: "200 millimeters fell in one afternoon",
    expect: ["7.9 inches"], reject: ["200 millimeters"] },

  // --- Regression: "lows/highs of N\u00b0C" must stay ABSOLUTE (bare "of" used to
  // false-trigger delta detection and convert \u221230\u00b0C to \u221254\u00b0F instead of \u221222\u00b0F).
  { input: "January lows of \u221230\u00b0C are routine",
    expect: ["\u221222\u00b0F"], reject: ["\u221254\u00b0F"] },
  { input: "Winter lows of \u221240\u00b0C and summer highs of 28\u00b0C",
    expect: ["\u221240\u00b0F", "82\u00b0F"], reject: ["\u221272\u00b0F", "50\u00b0F"] },
  { input: "Summer highs of 21\u00b0C are exceptional",
    expect: ["70\u00b0F"], reject: ["38\u00b0F"] },
  { input: "annual range of 7\u00b0C and a real dry/wet seasonality",
    expect: ["13\u00b0F"], reject: ["45\u00b0F"] },
  // --- Regression: explicit delta phrasings used by computed score notes ---
  { input: "Annual range 25\u00b0C",
    expect: ["45\u00b0F"], reject: ["77\u00b0F"] },
  { input: "Night recovery is strong: summer diurnal swing of 14\u00b0C lifts sleep quality.",
    expect: ["25\u00b0F"], reject: ["57\u00b0F"] },
  // --- Regression: chinook "raised temperatures by N\u00b0C" must be DELTA ---
  { input: "Chinooks have raised winter temperatures by 20\u201330\u00b0C in hours",
    expect: ["36\u201354\u00b0F"], reject: ["68\u201386\u00b0F"] },

  // --- Regression: thermal/seasonal/annual-amplitude variants must be DELTA ---
  // (Found post-PR-#59: geospatial-analysis emits "thermal span N\u00b0C" through
  // useProse, and pre-fix it converted as absolute. Joint pattern now covers
  // every thermal/seasonal/annual/diurnal/day-night \u00d7 span/range/amplitude/
  // swing/spread/gap combination.)
  { input: "thermal span 25\u00b0C", expect: ["45\u00b0F"], reject: ["77\u00b0F"] },
  { input: "thermal amplitude 30\u00b0C", expect: ["54\u00b0F"], reject: ["86\u00b0F"] },
  { input: "seasonal swing 18\u00b0C", expect: ["32\u00b0F"], reject: ["64\u00b0F"] },
  { input: "annual amplitude 32\u00b0C", expect: ["58\u00b0F"], reject: ["90\u00b0F"] },
  { input: "day-night spread 12\u00b0C", expect: ["22\u00b0F"], reject: ["54\u00b0F"] },
  { input: "day/night swing 14\u00b0C", expect: ["25\u00b0F"], reject: ["57\u00b0F"] },

  // --- Regression: actual geospatial contextLine that PlaceDetail renders ---
  { input: "Relief energy ~120 m/km, hydro seasonality 1.2x, thermal span 25\u00b0C, structure texture 60/100, EO observability 70/100.",
    expect: ["thermal span 45\u00b0F"], reject: ["thermal span 77\u00b0F"] },

  // --- Regression: delta-noun immediately after a temperature ---
  // ("13\u00b0C swing", "21\u00b0C annual swing")
  { input: "only about a 13\u00b0C swing between coolest and warmest months",
    expect: ["23\u00b0F swing"], reject: ["55\u00b0F"] },
  { input: "versus a 21\u00b0C annual swing inland in San Antonio",
    expect: ["38\u00b0F annual swing"], reject: ["70\u00b0F"] },
  { input: "Sitka's annual range averages just 17\u00b0C.",
    expect: ["31\u00b0F"], reject: ["63\u00b0F"] },
  // Critically, "X\u00b0C range" must NOT be force-converted to delta because
  // "in the 10\u201315\u00b0C range" means an absolute interval. Only swing/
  // spread/amplitude/gap/differential are safe immediate-after cues.
  { input: "afternoon dew points in the 10\u201315\u00b0C range",
    expect: ["50\u201359\u00b0F"], reject: ["18\u201327\u00b0F"] },
  { input: "summer afternoons push into the 33\u201336\u00b0C range",
    expect: ["91\u201397\u00b0F"], reject: ["59\u201365\u00b0F"] },
  { input: "kept in the 10\u201312\u00b0C range",
    expect: ["50\u201354\u00b0F"], reject: ["18\u201322\u00b0F"] },

  // --- Editorial Celsius word forms (defense in depth for ${x}C bug class) ---
  { input: "25 Celsius", expect: ["77\u00b0F"], reject: ["Celsius"] },
  { input: "20 degrees Celsius", expect: ["68\u00b0F"], reject: ["Celsius"] },
  { input: "20 degree Celsius", expect: ["68\u00b0F"], reject: ["Celsius"] },
  { input: "20 \u00b0Celsius", expect: ["68\u00b0F"], reject: ["Celsius"] },
  { input: "20\u00b0 Celsius", expect: ["68\u00b0F"], reject: ["Celsius"] },
  { input: "20 degrees C", expect: ["68\u00b0F"], reject: [" degrees C"] },
  { input: "summer highs near 25 Celsius",
    expect: ["77\u00b0F"], reject: ["Celsius"] },
  // Delta context applies to Celsius word forms too.
  { input: "warmer by 5 Celsius in two hours",
    expect: ["9\u00b0F"], reject: ["41\u00b0F", "Celsius"] },
  // Celsius mode: editorial word forms are left intact byte-for-byte.
  { input: "summer highs near 25 Celsius",
    expect: ["25 Celsius"], reject: ["77\u00b0F", "\u00b0C"], unit: "C", dist: "metric" },

  // --- Regression: landform-context "N m" conversions (Sandhills / Loess Hills / Eureka) ---
  { input: "rolling dunes 40\u201390 m tall",
    expect: ["131\u2013295 ft"], reject: ["40\u201390 m"] },
  { input: "loess up to 60 m thick rising 90 m above the floodplain",
    expect: ["197 ft thick", "295 ft"], reject: [" 60 m", " 90 m"] },
  { input: "three steeply dissected ridges with 90 m of relief in less than 500 m of horizontal distance",
    expect: ["295 ft of relief", "1,640 ft of horizontal"], reject: [" 90 m", " 500 m"] },
  { input: "At more than 2,200 m, Los Alamos keeps strong night cooling.",
    expect: ["7,218 ft"], reject: ["2,200 m"] },
  { input: "Sentinel-2 MSI emphasizes 10 m VNIR/SWIR for texture; Landsat OLI-TIRS pairs 30 m multispectral with thermal history.",
    expect: ["33 ft VNIR/SWIR", "98 ft multispectral"], reject: ["10 m", "30 m"] },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const out = localizeProse(c.input, c.unit ?? "F", c.dist ?? "imperial");
  const hasAll = c.expect.every(e => out.includes(e));
  const hasForbidden = (c.reject ?? []).some(r => out.includes(r));
  const ok = hasAll && !hasForbidden;
  if (ok) {
    pass++;
    console.log("OK  ", c.input, " -> ", out);
  } else {
    fail++;
    console.log("FAIL", c.input);
    console.log("    got:        ", out);
    if (!hasAll)       console.log("    want parts: ", c.expect);
    if (hasForbidden)  console.log("    forbidden:  ", c.reject);
  }
}
console.log(`\n${pass}/${pass + fail} tests passed`);
if (fail > 0) process.exit(1);
