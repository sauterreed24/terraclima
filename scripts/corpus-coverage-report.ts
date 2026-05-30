/**
 * Corpus coverage summary — per-tier counts for editorial gaps.
 * Non-fatal: exit 0 always (wired into quality:check as visibility only).
 */
import { PLACES } from "../src/data/places";
import type { Place } from "../src/types";

type Tier = "A" | "B" | "C";

function tierOf(p: Place): Tier {
  return p.tier;
}

function row(label: string, counts: Record<Tier, number>, total: number): string {
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : "—");
  return [
    label.padEnd(28),
    `A:${String(counts.A).padStart(3)} (${pct(counts.A).padStart(5)})`,
    `B:${String(counts.B).padStart(3)} (${pct(counts.B).padStart(5)})`,
    `C:${String(counts.C).padStart(3)} (${pct(counts.C).padStart(5)})`,
    `all:${total}`,
  ].join("  ");
}

function bump(map: Record<Tier, number>, tier: Tier) {
  map[tier] += 1;
}

const byTier: Record<Tier, Place[]> = { A: [], B: [], C: [] };
for (const p of PLACES) byTier[tierOf(p)].push(p);

const missingLive: Record<Tier, number> = { A: 0, B: 0, C: 0 };
const missingHumidity: Record<Tier, number> = { A: 0, B: 0, C: 0 };
const missingSunshine: Record<Tier, number> = { A: 0, B: 0, C: 0 };
const missingDeep: Record<Tier, number> = { A: 0, B: 0, C: 0 };
const missingAuthoredExperience: Record<Tier, number> = { A: 0, B: 0, C: 0 };
const singleCitation: Record<Tier, number> = { A: 0, B: 0, C: 0 };

for (const p of PLACES) {
  const t = tierOf(p);
  if (!p.liveSignals) bump(missingLive, t);
  if (p.climate.humidity == null) bump(missingHumidity, t);
  if (p.climate.sunshinePct == null) bump(missingSunshine, t);
  if (!p.deepSections?.length) bump(missingDeep, t);
  if (!p.experience?.feel) bump(missingAuthoredExperience, t);
  const urlCites = (p.citations ?? []).filter(c => c.url?.startsWith("https://")).length;
  if (urlCites === 1) bump(singleCitation, t);
}

console.log("corpus-coverage-report (non-fatal summary)\n");
console.log(row("missing liveSignals", missingLive, PLACES.length));
console.log(row("missing humidity", missingHumidity, PLACES.length));
console.log(row("missing sunshinePct", missingSunshine, PLACES.length));
console.log(row("missing deepSections", missingDeep, PLACES.length));
console.log(row("missing authored experience", missingAuthoredExperience, PLACES.length));
console.log(row("single HTTPS citation", singleCitation, PLACES.length));
console.log("\nTier counts:", `A=${byTier.A.length}`, `B=${byTier.B.length}`, `C=${byTier.C.length}`);
