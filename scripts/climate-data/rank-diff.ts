/**
 * Write current ranking orders + a human review report for Climate V2.
 * Compares against a pre-V2 baseline (`ranks-baseline.json`) when present.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PLACES } from "../../src/data/places";
import { rankPlaces, type RankingProfile } from "../../src/lib/scoring";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT_DIR = join(ROOT, "data/climate-v2/audit");
const BASELINE_PATH = join(OUT_DIR, "ranks-baseline.json");

const LENSES: RankingProfile[] = [
  "hidden-gems",
  "live-fit",
  "coolest-summers",
  "mildest-winters",
  "best-growability",
  "climate-resilient",
  "most-comfortable",
  "sunniest-winters",
];

function rankIndex(order: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  order.forEach((id, i) => m.set(id, i));
  return m;
}

function summarizeLensDiff(
  lens: string,
  baseline: readonly string[],
  current: readonly string[],
): string {
  const baseIdx = rankIndex(baseline);
  const curIdx = rankIndex(current);
  const baseTop = new Set(baseline.slice(0, 25));
  const curTop = new Set(current.slice(0, 25));

  const entries = current.slice(0, 25).filter((id) => !baseTop.has(id));
  const exits = baseline.slice(0, 25).filter((id) => !curTop.has(id));

  const bigMoves: { id: string; from: number; to: number; delta: number }[] = [];
  for (const id of new Set([...baseline, ...current])) {
    const from = baseIdx.get(id);
    const to = curIdx.get(id);
    if (from == null || to == null) continue;
    const delta = from - to; // positive = improved (lower index)
    if (Math.abs(from - to) > 25) {
      bigMoves.push({ id, from: from + 1, to: to + 1, delta });
    }
  }
  bigMoves.sort((a, b) => Math.abs(b.from - b.to) - Math.abs(a.from - a.to));

  let md = `## ${lens}\n`;
  md += `Top 25: ${current.slice(0, 25).map((id, i) => `${i + 1}. ${id}`).join("; ")}\n\n`;
  if (entries.length) {
    md += `Top-25 entries: ${entries.map((id) => `${id} (#${(curIdx.get(id) ?? 0) + 1})`).join("; ")}\n\n`;
  } else {
    md += `Top-25 entries: none\n\n`;
  }
  if (exits.length) {
    md += `Top-25 exits: ${exits.map((id) => `${id} (was #${(baseIdx.get(id) ?? 0) + 1})`).join("; ")}\n\n`;
  } else {
    md += `Top-25 exits: none\n\n`;
  }
  if (bigMoves.length) {
    md += `Moves >25 positions (showing up to 40):\n`;
    for (const m of bigMoves.slice(0, 40)) {
      const dir = m.to < m.from ? "↑" : "↓";
      md += `- ${m.id}: #${m.from} → #${m.to} (${dir}${Math.abs(m.from - m.to)})\n`;
    }
    md += `\n`;
  } else {
    md += `Moves >25 positions: none\n\n`;
  }
  return md;
}

function main(): void {
  const current: Record<string, string[]> = {};
  for (const lens of LENSES) {
    current[lens] = rankPlaces(lens, PLACES).map((r) => r.place.id);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "ranks-current.json"), JSON.stringify(current, null, 2) + "\n");

  let baseline: Record<string, string[]> | null = null;
  if (existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, string[]>;
  }

  let md = `# Climate Data V2 Rank Diff\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Rankings recomputed from Daymet 1996–2025 V2 normals. Prior positions are **not** preserved artificially.\n\n`;
  if (baseline) {
    md += `Compared against pre-V2 baseline in \`ranks-baseline.json\` (origin/main @ 4e0e0ef).\n\n`;
  } else {
    md += `No \`ranks-baseline.json\` found — listing current top-25 only. Generate baseline from pre-overlay corpus before review.\n\n`;
  }

  for (const lens of LENSES) {
    if (baseline?.[lens]) {
      md += summarizeLensDiff(lens, baseline[lens]!, current[lens]!);
    } else {
      md += `## ${lens}\n`;
      md += `Top 25: ${current[lens]!.slice(0, 25).map((id, i) => `${i + 1}. ${id}`).join("; ")}\n\n`;
    }
  }

  writeFileSync(join(OUT_DIR, "RANK-DIFF.md"), md);
  console.log(md);
  console.log(`Wrote ${join(OUT_DIR, "RANK-DIFF.md")}`);
}

main();
