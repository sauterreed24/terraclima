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
for (const p of PLACES) {
  for (const [name, text] of fields(p)) {
    if (!text) continue;
    const out = localizeProse(text, "F");
    if (/°C/.test(out)) {
      leftovers++;
      console.log(`LEFTOVER ${p.id} ${name}: ${out.substring(0, 200)}`);
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
if (leftovers > 0) process.exit(1);
