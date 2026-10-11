// ============================================================
// Terraclima — Derived deep-dive copy from structured place data
// Keeps long “encyclopedia” prose auditable: every sentence ties back
// to fields already edited in the corpus (no LLM ghost-writing).
// ============================================================

import type { Place, PlaceDeepSection, RiskLevel } from "../types";
import { DRIVER_LABELS } from "../types";
import { getBestMonths } from "./best-months";

const RISK_KEYS = [
  "wildfire",
  "flood",
  "drought",
  "extremeHeat",
  "extremeCold",
  "smoke",
  "storm",
  "landslide",
  "coastal",
] as const;

const RISK_LABEL: Record<(typeof RISK_KEYS)[number], string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke / air quality",
  storm: "Severe storms",
  landslide: "Landslide / debris",
  coastal: "Coastal surge / SLR",
};

const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function listJoin(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Driver chip labels are title-cased; mid-sentence they read lower-case except proper names. */
function inlineDriverLabel(label: string): string {
  return /^(?:Santa Ana|Chinook)/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

function stripPeriod(text: string): string {
  return text.replace(/\.+$/, "");
}

function withPeriod(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function fmtC(c: number): string {
  return `${c < 0 ? "−" : ""}${Math.abs(c)}°C`;
}

function wetDryIndices(precip: readonly number[]): { wet: number; dry: number } {
  let wet = 0;
  let dry = 0;
  for (let i = 0; i < precip.length; i++) {
    if (precip[i]! > precip[wet]!) wet = i;
    if (precip[i]! < precip[dry]!) dry = i;
  }
  return { wet, dry };
}

/** (max − min) / max; 0 when max ≤ 0. */
function precipRelativeSpan(precip: readonly number[]): number {
  let minP = Infinity;
  let maxP = 0;
  for (const v of precip) {
    if (v < minP) minP = v;
    if (v > maxP) maxP = v;
  }
  if (maxP <= 0) return 0;
  return (maxP - minP) / maxP;
}

function precipAllEqual(precip: readonly number[]): boolean {
  if (precip.length === 0) return true;
  const first = precip[0]!;
  return precip.every(v => v === first);
}

const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
  "very-high": 0,
  high: 1,
  elevated: 2,
  moderate: 3,
  low: 4,
  "very-low": 5,
};

const MAX_SOIL_NOTE_CHARS = 340;

function trimProse(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** The season chapter's snow paragraph, and whether it describes a snow season. */
function snowLine(place: Place, flatPrecip: boolean): { text: string; snowy: boolean } {
  const snow = place.climate.snowCm;
  if (snow && snow.some(s => s > 1)) {
    const snowMonths = snow.map((cm, i) => (cm > 1 ? MO[i] : null)).filter(Boolean) as string[];
    return {
      text: `Snow turns up in the normals in ${listJoin(snowMonths.slice(0, 6))}${snowMonths.length > 6 ? " and beyond" : ""}, so winter brings its own planning season on top of the rain.`,
      snowy: true,
    };
  }
  if (!snow) {
    const coldestHigh = Math.round(Math.min(...place.climate.tempHighC));
    const coldestLow = Math.round(Math.min(...place.climate.tempLowC));
    if (coldestHigh <= 3) {
      return {
        text: `This entry has no monthly snowfall series, but with midwinter highs near ${fmtC(coldestHigh)} expect a real snow season: check local snowfall records before planning winter access or roof loads.`,
        snowy: true,
      };
    }
    if (coldestLow <= 0) {
      return {
        text: `This entry has no monthly snowfall series. With the coldest nights near ${fmtC(coldestLow)}, occasional snow or ice is possible, but the normals can't say how often.`,
        snowy: false,
      };
    }
    return { text: "Snow is minor or absent here; winter is mostly temperature, wind, and rain.", snowy: false };
  }
  return {
    text: flatPrecip
      ? "Snow is minor or absent in these normals; winter is mostly temperature, wind, and rain."
      : "Snow plays little or no part in the monthly normals; winter here is about temperature, wind, and rain rather than ploughing.",
    snowy: false,
  };
}

/**
 * The fill-only overlay in `places.deep-sections-authored.ts` restates the
 * record's numbers in a fixed template (and misreads missing snow series as
 * "no snow"). Every place now has a researched site-history chapter, and the
 * chapters derived below cover the same ground from the same fields, so the
 * template chapters stay on the record (evidence counts read them) but are
 * left out of the reading.
 */
export function isTemplateDeepSection(section: PlaceDeepSection): boolean {
  return /-(?:terrain-mechanism|risk-and-ground-truth)$/.test(section.id);
}

/**
 * Extra `PlaceDeepSection`s synthesized from structured fields so every place
 * gains the same **scaffold** of organized reading, after any hand-authored
 * `deepSections` in the corpus.
 */
export function mergeDeepSections(place: Place): PlaceDeepSection[] {
  const base = (place.deepSections ?? []).filter(s => !isTemplateDeepSection(s));
  const append = buildDerivedDeepSections(place);
  const ids = new Set(base.map(s => s.id));
  return [...base, ...append.filter(a => !ids.has(a.id))];
}

export function buildDerivedDeepSections(place: Place): PlaceDeepSection[] {
  const existing = new Set((place.deepSections ?? []).map(s => s.id));
  const out: PlaceDeepSection[] = [];

  // --- Season rhythm (month names only; avoids duplicate numeric charts) ---
  if (!existing.has("appendix-season-pocket")) {
    const precip = place.climate.precipMm;
    const relSpan = precipRelativeSpan(precip);
    const flat = precipAllEqual(precip) || relSpan < 0.2;
    const mild = !flat && relSpan < 0.48;
    const { wet, dry } = wetDryIndices(precip);
    const wetM = MO[wet] ?? "—";
    const dryM = MO[dry] ?? "—";
    // Decide the snow line first: it sets the chapter title and the hint
    // wording, so the title can never say "rain" over a snow paragraph.
    const { text: snowPara, snowy } = snowLine(place, flat);
    const hasCalendarWindows = getBestMonths(place).length > 0;
    const chartHint = hasCalendarWindows
      ? `The month-by-month bars sit under Seasonal rhythm further down, and Best months for… turns the same normals into garden, outdoor, dry-travel and snow windows; this chapter sticks to how the ${snowy ? "rain and snow stack" : "rain stacks"} up through the year.`
      : "The month-by-month bars sit under Seasonal rhythm further down, if you want to line this up against the numbers.";

    let lead: string;
    if (precipAllEqual(precip) || Math.max(...precip) <= 0) {
      lead =
        `Rain is spread almost evenly across the year, so seasonal planning leans more on temperature, humidity and wind than on a rainy season. ${chartHint}`;
    } else if (flat) {
      const mid = hasCalendarWindows
        ? "Irrigation, drainage, and storm cadence still move month to month, but the calendar is gentler than in strongly seasonal climates."
        : "Irrigation, drainage, and travel timing still move month to month, but the calendar is gentler than in strongly seasonal climates.";
      lead = `Rain stays in a fairly tight band from month to month, with no sharp wet-season/dry-season split. ${mid} ${chartHint}`;
    } else if (mild) {
      const mid = hasCalendarWindows
        ? "Roof work, irrigation, and canopy management still track that rhythm."
        : "Roof work, travel windows, and how hard you lean on irrigation still track that rhythm.";
      lead = `The wettest month is ${wetM} and the driest is ${dryM}, but the swing between them is moderate. ${mid} ${chartHint}`;
    } else {
      const mid = hasCalendarWindows
        ? "That rhythm shapes roof work, stormwater design, and how aggressively you need irrigation or drainage on a parcel."
        : "That rhythm shapes roof work, travel timing, and how aggressively you need irrigation or drainage on a parcel.";
      lead = `Rain peaks sharply around ${wetM} and bottoms out around ${dryM}. ${mid} ${chartHint}`;
    }

    const paras: string[] = [lead, snowPara];
    if (place.climate.frostFreeDays != null) {
      paras.push(
        `Expect about ${place.climate.frostFreeDays} frost-free days a year, the window tender plants have to work with (more under Agriculture, soils, and garden fit).`,
      );
    }
    out.push({
      id: "appendix-season-pocket",
      title: snowy ? "How rain and snow fall through the year" : "How the rain falls through the year",
      paragraphs: paras.slice(0, 3),
    });
  }

  // --- Mechanisms (cross-links the driver chips section) ---
  if (!existing.has("appendix-forces-atlas") && place.drivers.length > 0) {
    const labels = place.drivers.map(d => inlineDriverLabel(DRIVER_LABELS[d] ?? d));
    const maxShow = 7;
    const head = labels.slice(0, maxShow);
    const more = labels.length - head.length;
    const list = more > 0 ? `${head.join(", ")}, plus ${more} more` : listJoin(head);
    const lead = labels.length === 1 ? `The main driver at work here is ${list}.` : `The main drivers at work here are ${list}.`;
    out.push({
      id: "appendix-forces-atlas",
      title: "How the terrain shapes the climate",
      paragraphs: [
        `${lead} Slope and exposure, nearby water, elevation, and the paths air masses take are why one spot on the map can feel so unlike the country around it. Tap the matching chips under "What shapes the climate here" for a plain-language explanation of each.`,
      ],
    });
  }

  // --- Soil & growability (single dense card; avoids repeating whole grid) ---
  if (!existing.has("appendix-ground-garden")) {
    const g = place.growability;
    const s = place.soil;
    const grows = g.growsWell.length ? g.growsWell.slice(0, 5).join(", ") : "—";
    const tricky = g.tricky.length ? g.tricky.slice(0, 4).join(", ") : "—";
    const ph = `${s.phRange[0]}–${s.phRange[1]}`;
    const groundParas = [
      `${withPeriod(s.texture)} Drainage is ${s.drainage} and soil pH runs about ${ph}. The garden score is ${g.score}/100. Grows well: ${grows}. Needs extra care: ${tricky}.`,
    ];
    if (s.notes) groundParas.push(trimProse(s.notes, MAX_SOIL_NOTE_CHARS));
    if (g.homeGarden) groundParas.push(`Home garden angle: ${trimProse(g.homeGarden, 240)}`);
    if (g.orchard) groundParas.push(`Orchard / perennial note: ${trimProse(g.orchard, 240)}`);
    out.push({
      id: "appendix-ground-garden",
      title: "Agriculture, soils, and garden fit",
      paragraphs: groundParas.slice(0, 4),
    });
  }

  // Nearby contrasts are not repeated here: the Overview's nearby cards and
  // the Local contrast section already show the same curated notes.

  // --- Scouting / diligence (last in this bundle; relocation voice) ---
  if (!existing.has("appendix-scouting-diligence")) {
    const trade = place.scores.tradeoff >= 55
      ? `A tradeoff score of ${place.scores.tradeoff}/100 means real compromises: read the risks and seasonal limits before committing money or a move.`
      : place.scores.tradeoff >= 35
        ? `A tradeoff score of ${place.scores.tradeoff}/100 means the compromises are manageable for many households that plan around the hard season.`
        : `A tradeoff score of ${place.scores.tradeoff}/100 is light next to other places in the atlas; still check it against your own health and insurance needs.`;

    type RiskRow = { key: (typeof RISK_KEYS)[number]; line: string; level: RiskLevel; hasNote: boolean };
    const riskRows: RiskRow[] = RISK_KEYS.map(k => {
      const r = place.risks[k];
      const label = RISK_LABEL[k];
      const level = r.level.replace("-", " ");
      const line = r.note ? `${label} (${level}): ${stripPeriod(trimProse(r.note, 120))}` : `${label}: ${level}`;
      return { key: k, line, level: r.level, hasNote: Boolean(r.note) };
    });
    riskRows.sort((a, b) => {
      const d = RISK_LEVEL_RANK[a.level] - RISK_LEVEL_RANK[b.level];
      if (d !== 0) return d;
      return (b.hasNote ? 1 : 0) - (a.hasNote ? 1 : 0);
    });
    const riskBits = riskRows.slice(0, 5).map(r => r.line);
    const confidenceRaw = place.confidenceNotes
      ? stripPeriod(place.confidenceNotes.replace(/^Tier [A-C] entry\s*[—–-]\s*/i, "").trim())
      : "";
    const confidenceNote = confidenceRaw.charAt(0).toUpperCase() + confidenceRaw.slice(1);

    out.push({
      id: "appendix-scouting-diligence",
      title: "Homes, land, and long-term fit",
      paragraphs: [
        `If you are scouting a home or a small parcel, ${trade.charAt(0).toLowerCase()}${trade.slice(1)} The comfort, resilience, and garden scores (${place.scores.comfort}, ${place.scores.resilience}, and ${place.scores.growability} out of 100) describe how livable the climate is, how well it should hold up as the climate changes, and what a yard or orchard can do. They are not an appraisal or a lending rule.`,
        `Risk diligence (always verify locally): ${riskBits.join(" · ")}.`,
        `Confidence in this entry is ${place.confidence}.${confidenceNote ? ` ${confidenceNote}.` : ""} The citations at the end of this page are the place to start for primary sources.`,
      ],
    });
  }

  return out;
}
