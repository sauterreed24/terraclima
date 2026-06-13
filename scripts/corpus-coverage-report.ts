/**
 * Corpus coverage summary: non-fatal editorial gap report.
 * Wired into quality:check for visibility only.
 */
import { PLACES } from "../src/data/places";
import { buildCorpusCoverageReport, COVERAGE_ISSUES, type CoverageIssueId } from "../src/lib/corpus-coverage";
import type { Tier } from "../src/types";

function row(label: string, counts: Record<Tier, number>, total: number): string {
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : "-");
  return [
    label.padEnd(28),
    `A:${String(counts.A).padStart(3)} (${pct(counts.A).padStart(5)})`,
    `B:${String(counts.B).padStart(3)} (${pct(counts.B).padStart(5)})`,
    `C:${String(counts.C).padStart(3)} (${pct(counts.C).padStart(5)})`,
    `all:${total}`,
  ].join("  ");
}

const report = buildCorpusCoverageReport(PLACES);
const tierCounts = Object.fromEntries(report.byTier.map(group => [group.tier, group.total])) as Record<Tier, number>;

function countsFor(issue: CoverageIssueId): Record<Tier, number> {
  const counts: Record<Tier, number> = { A: 0, B: 0, C: 0 };
  for (const group of report.byTier) {
    if (group.tier) counts[group.tier] = group.issueCounts[issue];
  }
  return counts;
}

console.log("corpus-coverage-report (non-fatal summary)\n");
for (const issue of COVERAGE_ISSUES) {
  console.log(row(issue.label, countsFor(issue.id), PLACES.length));
}
console.log("\nTier counts:", `A=${tierCounts.A ?? 0}`, `B=${tierCounts.B ?? 0}`, `C=${tierCounts.C ?? 0}`);

console.log("\nHighest-thinness countries:");
for (const group of report.byCountry.slice(0, 3)) {
  console.log(`  ${group.label}: ${group.thin}/${group.total} thin`);
}

console.log("\nHighest-thinness regions:");
for (const group of report.byRegion.slice(0, 6)) {
  console.log(`  ${group.label}: ${group.thin}/${group.total} thin`);
}

console.log("\nThinnest places:");
for (const place of report.thinPlaces.slice(0, 8)) {
  console.log(`  ${place.name} (${place.region}, ${place.country}, Tier ${place.tier}): ${place.missing.join(", ")}`);
}
