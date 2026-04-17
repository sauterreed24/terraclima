/**
 * Smoke-test the prose localizer against every °C reference in the data.
 * Prints each remaining °C leftover after conversion for manual inspection.
 */
import { localizeProse } from "../src/lib/units";
import { PLACES } from "../src/data/places";
import { CONCEPTS } from "../src/data/glossary";
import { COLLECTIONS } from "../src/data/collections";

const fields = (p: any): Array<[string, string]> => [
  ["summaryShort", p.summaryShort],
  ["summaryImmersive", p.summaryImmersive],
  ["whyDistinct", p.whyDistinct],
  ["climate.notes", p.soil?.notes ?? ""],
  ["growability.homeGarden", p.growability?.homeGarden ?? ""],
  ["growability.orchard", p.growability?.orchard ?? ""],
  ["climateChange.outlook2050", p.climateChange?.outlook2050 ?? ""],
  ["climateChange.outlook2100", p.climateChange?.outlook2100 ?? ""],
  ["climateChange.resilienceNote", p.climateChange?.resilienceNote ?? ""],
  ["whoWouldLove", p.whoWouldLove ?? ""],
  ["whoMightNot", p.whoMightNot ?? ""],
];

let leftovers = 0;
let converted = 0;
let distLeftovers = 0;
// Tokens we want to see gone after an imperial localization pass. We scan
// for metric unit tokens with word boundaries so that compound tokens like
// "mm-level" or Köppen codes aren't false positives.
const METRIC_SCAN = /\b\d+(?:[,.]\d+)*\s*(mm|cm|km\/h|kph|km|m)\b/g;
for (const p of PLACES) {
  for (const [name, text] of fields(p)) {
    if (!text) continue;
    const out = localizeProse(text, "F", "imperial");
    if (/°C/.test(out)) {
      leftovers++;
      console.log(`LEFTOVER ${p.id} ${name}: ${out.substring(0, 200)}`);
    }
    // Report remaining metric distance tokens for manual review; we do NOT
    // fail the build on these because bare metres in non-elevation contexts
    // are intentionally left alone.
    const rem = out.match(METRIC_SCAN);
    if (rem) {
      distLeftovers += rem.length;
      if (process.env.SHOW_METRIC) {
        for (const r of rem) {
          const idx = out.indexOf(r);
          const ctx = out.substring(Math.max(0, idx - 40), Math.min(out.length, idx + r.length + 40));
          console.log(`METRIC ${p.id} ${name}: …${ctx}…`);
        }
      }
    }
    if (out !== text) converted++;
  }
  for (const nc of p.nearbyContrasts ?? []) {
    if (nc.note) {
      const out = localizeProse(nc.note, "F");
      if (/°C/.test(out)) {
        leftovers++;
        console.log(`LEFTOVER ${p.id} nearbyContrast: ${out}`);
      }
    }
  }
  for (const lc of p.localContrast ?? []) {
    if (lc.note) {
      const out = localizeProse(lc.note, "F");
      if (/°C/.test(out)) {
        leftovers++;
        console.log(`LEFTOVER ${p.id} localContrast: ${out}`);
      }
    }
  }
  const risks = p.risks ?? {};
  for (const k of Object.keys(risks)) {
    const note = risks[k]?.note;
    if (note) {
      const out = localizeProse(note, "F");
      if (/°C/.test(out)) {
        leftovers++;
        console.log(`LEFTOVER ${p.id} risks.${k}: ${out}`);
      }
    }
  }
}

for (const c of CONCEPTS) {
  for (const field of [c.short, c.long, c.mechanism] as (string | undefined)[]) {
    if (!field) continue;
    const out = localizeProse(field, "F");
    if (/°C/.test(out)) {
      leftovers++;
      console.log(`LEFTOVER concept ${c.id}: ${out.substring(0, 200)}`);
    }
  }
}

for (const c of COLLECTIONS) {
  const out = localizeProse(c.description, "F");
  if (/°C/.test(out)) {
    leftovers++;
    console.log(`LEFTOVER collection ${c.id}: ${out.substring(0, 200)}`);
  }
}

console.log(`\nConverted ${converted} strings. ${leftovers} leftover °C tokens remain.`);
console.log(`Metric distance tokens remaining after imperial pass: ${distLeftovers}`);
if (leftovers > 0) process.exit(1);
