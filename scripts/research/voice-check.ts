/**
 * corpus:voice:check — banned phrases, duplicate paragraphs, missing authored experience.
 */
import { PLACES } from "../../src/data/places";
import { BANNED_VOICE_PHRASES } from "../../src/lib/research/contracts";
import * as tierCPolish from "../../src/data/places.tier-c-polish";

const STRICT = process.argv.includes("--strict");

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function normalizePara(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function skeleton(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b[\d.]+\b/g, "#")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/g, "MON")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 12)
    .join(" ");
}

function main() {
  const errors: string[] = [];
  const warns: string[] = [];

  // TIER_C_POLISH_GENERATED has been retired; guard against it silently
  // coming back (e.g. a bad merge) without requiring the export to exist.
  const generatedExport = (tierCPolish as Record<string, unknown>).TIER_C_POLISH_GENERATED;
  const generatedKeys = generatedExport ? Object.keys(generatedExport as Record<string, unknown>) : [];
  if (generatedKeys.length > 0) {
    errors.push(`TIER_C_POLISH_GENERATED still ships ${generatedKeys.length} entries — must be retired`);
  }

  const paraSeen = new Map<string, string[]>();
  const skeletonSeen = new Map<string, string[]>();

  for (const place of PLACES) {
    const texts: { path: string; text: string }[] = [
      { path: "summaryShort", text: place.summaryShort },
      { path: "summaryImmersive", text: place.summaryImmersive },
      { path: "whyDistinct", text: place.whyDistinct },
      { path: "whoWouldLove", text: place.whoWouldLove },
      { path: "whoMightNot", text: place.whoMightNot },
    ];
    if (place.experience) {
      texts.push(
        { path: "experience.feel", text: place.experience.feel ?? "" },
        { path: "experience.travelerFit", text: place.experience.travelerFit ?? "" },
        { path: "experience.residentFit", text: place.experience.residentFit ?? "" },
        { path: "experience.texture", text: place.experience.texture ?? "" },
      );
      for (const season of ["winter", "spring", "summer", "autumn"] as const) {
        texts.push({ path: `experience.seasons.${season}`, text: place.experience.seasons?.[season] ?? "" });
      }
    }
    for (const section of place.deepSections ?? []) {
      section.paragraphs.forEach((p, i) => texts.push({ path: `deep.${section.id}.${i}`, text: p }));
    }

    const exp = place.experience;
    const complete = Boolean(
      exp?.feel &&
        exp.seasons?.winter &&
        exp.seasons?.spring &&
        exp.seasons?.summer &&
        exp.seasons?.autumn &&
        exp.travelerFit &&
        exp.residentFit &&
        exp.texture,
    );
    if (!complete) {
      (STRICT ? errors : warns).push(`${place.id}: incomplete authored experience`);
    }

    const shortWords = wordCount(place.summaryShort);
    if (shortWords < 12 || shortWords > 36) {
      (STRICT ? errors : warns).push(`${place.id}: summaryShort word count ${shortWords} outside 16–30 (±tolerance)`);
    }
    const immersiveWords = wordCount(place.summaryImmersive);
    if (immersiveWords < 60 || immersiveWords > 200) {
      (STRICT ? errors : warns).push(`${place.id}: summaryImmersive word count ${immersiveWords} outside 80–150 (±tolerance)`);
    }

    for (const { path, text } of texts) {
      if (!text?.trim()) continue;
      const lower = text.toLowerCase();
      for (const banned of BANNED_VOICE_PHRASES) {
        if (lower.includes(banned)) {
          errors.push(`${place.id} ${path}: banned phrase "${banned}"`);
        }
      }
      if (/\bi (visited|lived|stayed|felt)\b/i.test(text) || /\bin my experience\b/i.test(text)) {
        errors.push(`${place.id} ${path}: first-person lived-experience claim`);
      }

      const norm = normalizePara(text);
      if (norm.length > 80) {
        const list = paraSeen.get(norm) ?? [];
        list.push(`${place.id}:${path}`);
        paraSeen.set(norm, list);
      }
      const sk = skeleton(text);
      if (sk.split(" ").length >= 8) {
        const list = skeletonSeen.get(sk) ?? [];
        list.push(`${place.id}:${path}`);
        skeletonSeen.set(sk, list);
      }
    }
  }

  for (const [para, locs] of paraSeen) {
    if (locs.length >= 2) {
      errors.push(`Duplicate paragraph (${locs.length}×): ${locs.slice(0, 4).join(", ")} :: ${para.slice(0, 100)}…`);
    }
  }
  for (const [sk, locs] of skeletonSeen) {
    if (locs.length >= 6) {
      (STRICT ? errors : warns).push(`Repeated sentence skeleton (${locs.length}×): ${sk} @ ${locs.slice(0, 5).join(", ")}`);
    }
  }

  console.log(`corpus:voice:check — places=${PLACES.length} mode=${STRICT ? "strict" : "bootstrap"}`);
  console.log(`errors=${errors.length} warnings=${warns.length}`);
  for (const e of errors.slice(0, 60)) console.log(`[error] ${e}`);
  for (const w of warns.slice(0, 40)) console.log(`[warn] ${w}`);
  if (errors.length + warns.length > 100) console.log(`… truncated`);
  if (errors.length) process.exit(1);
}

main();
