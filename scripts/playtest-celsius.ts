/**
 * Rigorous Celsius play-test for Terraclima.
 *
 * Default mode is Fahrenheit; the user can opt into Celsius. Two
 * invariants must hold:
 *
 *   F-mode: every user-facing string — static corpus text AND
 *           runtime-generated notes from scoring, livability, place-feel,
 *           and the explorer scout brief — must convert away from °C.
 *           Any leftover °C in F mode is a leak.
 *
 *   C-mode: localizeProse must be a no-op for temperatures. The corpus
 *           °C count must round-trip unchanged.
 *
 * scripts/audit-corpus.ts only covers static corpus fields; this script
 * additionally exercises every ranking profile × every place, every
 * comfort read, every place-feel rationale, and every scout-brief
 * metric so the runtime surfaces stay leak-free as the codebase
 * evolves.
 */
import { localizeProse } from "../src/lib/units";
import { PLACES } from "../src/data/places";
import { CONCEPTS } from "../src/data/glossary";
import { ARCHETYPES } from "../src/data/archetypes";
import { COLLECTIONS } from "../src/data/collections";
import { ALL_RANKING_PROFILES } from "../src/lib/ranking-options";
import { rankPlaces } from "../src/lib/scoring";
import { describeHumanComfort, scoreLivability } from "../src/lib/livability-score";
import { scorePlaceFeel } from "../src/lib/place-feel";
import { composePlaceExperience } from "../src/lib/place-overview";
import { buildExplorerScoutBrief } from "../src/lib/explorer-scout-brief";

const RANKINGS = ALL_RANKING_PROFILES;

let leaks = 0;
let mismatches = 0;
let metricLeaks = 0;

function expectNoCelsiusInF(where: string, text: string | null | undefined): void {
  if (!text) return;
  const localized = localizeProse(text, "F", "imperial");
  if (/°C\b/.test(localized) || /\b\d+(?:\.\d+)?\s+Celsius\b/i.test(localized)) {
    leaks++;
    console.log(`F-LEAK ${where}: ${localized.substring(0, 220)}`);
  }
}

function expectNoMetricDistanceInImperial(where: string, text: string | null | undefined): void {
  if (!text) return;
  const localized = localizeProse(text, "F", "imperial");
  // Catch leftover bare metres / kilometres that should have converted for
  // editorial elevation and distance claims. Ignore scientific index codes.
  if (
    /\b\d[\d,]*(?:\.\d+)?\s*m\b(?![/a-zA-Z])/.test(localized) ||
    /\b\d[\d,]*(?:\.\d+)?\s*(?:meters?|metres?|kilometers?|kilometres?)\b/i.test(localized) ||
    /\b(?:thousands|hundreds)\s+of\s+(?:meters?|metres?|kilometers?|kilometres?)\b/i.test(localized) ||
    /\b(?:a\s+)?few\s+hundred\s+(?:meters?|metres?)\b/i.test(localized) ||
    /\b(?:meters?|metres?)\s+across\b/i.test(localized) ||
    /\b(?:kilometers?|kilometres?)\s+wide\b/i.test(localized)
  ) {
    metricLeaks++;
    console.log(`M-LEAK ${where}: ${localized.substring(0, 220)}`);
  }
}

function expectCelsiusPreservedInC(where: string, text: string | undefined): void {
  if (!text || !/°C/.test(text)) return;
  const out = localizeProse(text, "C", "metric");
  const before = (text.match(/°C/g) ?? []).length;
  const after = (out.match(/°C/g) ?? []).length;
  if (before !== after) {
    mismatches++;
    console.log(`C-MISMATCH ${where}: ${before} -> ${after}`);
    console.log("  before:", text.substring(0, 160));
    console.log("  after: ", out.substring(0, 160));
  }
}

// 1. Static corpus fields × both modes.
for (const p of PLACES) {
  const fields: Array<[string, string | undefined]> = [
    [`${p.id}.summaryShort`, p.summaryShort],
    [`${p.id}.summaryImmersive`, p.summaryImmersive],
    [`${p.id}.whyDistinct`, p.whyDistinct],
    [`${p.id}.whoWouldLove`, p.whoWouldLove],
    [`${p.id}.whoMightNot`, p.whoMightNot],
    [`${p.id}.outlook2050`, p.climateChange?.outlook2050],
    [`${p.id}.outlook2100`, p.climateChange?.outlook2100],
    [`${p.id}.resilienceNote`, p.climateChange?.resilienceNote],
    [`${p.id}.liveSignals.note`, p.liveSignals?.note],
  ];
  for (const [where, text] of fields) {
    expectNoCelsiusInF(where, text);
    expectNoMetricDistanceInImperial(where, text);
    expectCelsiusPreservedInC(where, text);
  }
  for (const k of Object.keys(p.risks) as Array<keyof typeof p.risks>) {
    expectNoCelsiusInF(`${p.id}.risks.${k}.note`, p.risks[k]?.note);
    expectNoMetricDistanceInImperial(`${p.id}.risks.${k}.note`, p.risks[k]?.note);
    expectCelsiusPreservedInC(`${p.id}.risks.${k}.note`, p.risks[k]?.note);
  }
  for (const nc of p.nearbyContrasts ?? []) {
    expectNoCelsiusInF(`${p.id}.nearbyContrast.note`, nc.note);
    expectNoMetricDistanceInImperial(`${p.id}.nearbyContrast.note`, nc.note);
    expectCelsiusPreservedInC(`${p.id}.nearbyContrast.note`, nc.note);
  }
  for (const lc of p.localContrast ?? []) {
    expectNoCelsiusInF(`${p.id}.localContrast.note`, lc.note);
    expectNoMetricDistanceInImperial(`${p.id}.localContrast.note`, lc.note);
    expectCelsiusPreservedInC(`${p.id}.localContrast.note`, lc.note);
  }
}

for (const c of CONCEPTS) {
  for (const field of [c.short, c.long, c.mechanism] as Array<string | undefined>) {
    expectNoCelsiusInF(`concept.${c.id}`, field);
    expectNoMetricDistanceInImperial(`concept.${c.id}`, field);
    expectCelsiusPreservedInC(`concept.${c.id}`, field);
  }
}

for (const a of ARCHETYPES) {
  expectNoCelsiusInF(`archetype.${a.id}.blurb`, a.blurb);
  expectNoCelsiusInF(`archetype.${a.id}.guide`, a.guide);
  expectNoMetricDistanceInImperial(`archetype.${a.id}.blurb`, a.blurb);
  expectNoMetricDistanceInImperial(`archetype.${a.id}.guide`, a.guide);
  expectCelsiusPreservedInC(`archetype.${a.id}.blurb`, a.blurb);
  expectCelsiusPreservedInC(`archetype.${a.id}.guide`, a.guide);
}

for (const c of COLLECTIONS) {
  expectNoCelsiusInF(`collection.${c.id}.subtitle`, c.subtitle);
  expectNoCelsiusInF(`collection.${c.id}.description`, c.description);
  expectNoMetricDistanceInImperial(`collection.${c.id}.subtitle`, c.subtitle);
  expectNoMetricDistanceInImperial(`collection.${c.id}.description`, c.description);
  expectCelsiusPreservedInC(`collection.${c.id}.subtitle`, c.subtitle);
  expectCelsiusPreservedInC(`collection.${c.id}.description`, c.description);
}

// 2. Runtime-generated strings — the recent leak surface.
for (const r of RANKINGS) {
  const ranked = rankPlaces(r);
  for (const row of ranked) {
    expectNoCelsiusInF(`ranking[${r}].note for ${row.place.id}`, row.note);
  }
  const brief = buildExplorerScoutBrief(ranked, `Test ${r}`);
  if (brief) {
    expectNoCelsiusInF(`brief.summary[${r}]`, brief.summary);
    expectNoCelsiusInF(`brief.fitLine[${r}]`, brief.fitLine);
    expectNoCelsiusInF(`brief.decisionLine[${r}]`, brief.decisionLine);
    expectNoCelsiusInF(`brief.cautionLine[${r}]`, brief.cautionLine);
    expectNoCelsiusInF(`brief.nextStep.action[${r}]`, brief.nextStep.action);
    expectNoCelsiusInF(`brief.nextStep.detail[${r}]`, brief.nextStep.detail);
    expectNoCelsiusInF(`brief.fieldCheck.action[${r}]`, brief.fieldCheck.action);
    expectNoCelsiusInF(`brief.fieldCheck.detail[${r}]`, brief.fieldCheck.detail);
    for (const step of brief.scoutPlan) {
      expectNoCelsiusInF(`brief.scoutPlan.action[${r}|${step.label}]`, step.action);
      expectNoCelsiusInF(`brief.scoutPlan.detail[${r}|${step.label}]`, step.detail);
    }
    for (const m of brief.metrics) {
      expectNoCelsiusInF(`brief.metric.value[${r}|${m.label}]`, m.value);
      expectNoCelsiusInF(`brief.metric.detail[${r}|${m.label}]`, m.detail);
    }
    for (const sig of brief.decisionSignals) {
      expectNoCelsiusInF(`brief.signal.value[${r}|${sig.label}]`, sig.value);
      expectNoCelsiusInF(`brief.signal.detail[${r}|${sig.label}]`, sig.detail);
    }
    for (const row of brief.decisionRows ?? []) {
      expectNoCelsiusInF(`brief.row.bestFor[${r}]`, row.bestFor);
      expectNoCelsiusInF(`brief.row.watch[${r}]`, row.watch);
      expectNoCelsiusInF(`brief.row.decisionCue[${r}]`, row.decisionCue);
    }
  }
}

for (const p of PLACES) {
  const cr = describeHumanComfort(p);
  expectNoCelsiusInF(`comfortRead.headline ${p.id}`, cr.headline);
  expectNoCelsiusInF(`comfortRead.summary ${p.id}`, cr.summary);
  for (const s of cr.strengths) expectNoCelsiusInF(`comfortRead.strength ${p.id}`, s);
  for (const f of cr.frictions) expectNoCelsiusInF(`comfortRead.friction ${p.id}`, f);

  const liv = scoreLivability(p);
  for (const c of liv.components) {
    expectNoCelsiusInF(`livability.rationale[${c.key}] ${p.id}`, c.rationale);
  }

  const feel = scorePlaceFeel(p);
  expectNoCelsiusInF(`feel.headline ${p.id}`, feel.headline);
  expectNoCelsiusInF(`feel.summary ${p.id}`, feel.summary);
  for (const c of feel.components) expectNoCelsiusInF(`feel.rationale[${c.key}] ${p.id}`, c.rationale);
  for (const s of feel.strengths) expectNoCelsiusInF(`feel.strength ${p.id}`, s);
  for (const f of feel.frictions) expectNoCelsiusInF(`feel.friction ${p.id}`, f);

  // Overview spotlight engine — feel line, season detail, fit, texture.
  const exp = composePlaceExperience(p);
  expectNoCelsiusInF(`experience.feelLine ${p.id}`, exp.feelLine);
  expectNoCelsiusInF(`experience.travelerFit ${p.id}`, exp.travelerFit);
  expectNoCelsiusInF(`experience.residentFit ${p.id}`, exp.residentFit);
  expectNoCelsiusInF(`experience.wouldNotFit ${p.id}`, exp.wouldNotFit);
  expectNoCelsiusInF(`experience.texture ${p.id}`, exp.texture);
  expectCelsiusPreservedInC(`experience.feelLine ${p.id}`, exp.feelLine);
  for (const s of exp.seasons) {
    expectNoCelsiusInF(`experience.season[${s.key}].detail ${p.id}`, s.detail);
    expectNoCelsiusInF(`experience.season[${s.key}].headline ${p.id}`, s.headline);
    expectCelsiusPreservedInC(`experience.season[${s.key}].detail ${p.id}`, s.detail);
  }
}

console.log(
  `\nF-mode: ${leaks === 0 ? "OK" : "FAIL"} ${leaks} leak${leaks === 1 ? "" : "s"} · ` +
    `imperial-distance: ${metricLeaks === 0 ? "OK" : "FAIL"} ${metricLeaks} leak${metricLeaks === 1 ? "" : "s"} · ` +
    `C-mode: ${mismatches === 0 ? "OK" : "FAIL"} ${mismatches} mismatch${mismatches === 1 ? "" : "es"}`,
);
process.exit(leaks > 0 || metricLeaks > 0 || mismatches > 0 ? 1 : 0);
