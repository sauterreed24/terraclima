import { localizeProse } from "../src/lib/units";

const cases: Array<{ input: string; expect: string[] }> = [
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
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const out = localizeProse(c.input, "F");
  const ok = c.expect.every(e => out.includes(e));
  if (ok) {
    pass++;
    console.log("OK  ", c.input);
  } else {
    fail++;
    console.log("FAIL", c.input);
    console.log("    got:", out);
    console.log("    want parts:", c.expect);
  }
}
console.log(`\n${pass}/${pass + fail} tests passed`);
if (fail > 0) process.exit(1);
