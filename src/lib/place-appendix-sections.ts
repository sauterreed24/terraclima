// ============================================================
// Terraclima — Derived deep-dive copy from structured place data
// Keeps long “encyclopedia” prose auditable: every sentence ties back
// to fields already edited in the corpus (no LLM ghost-writing).
// ============================================================

import type { Place, PlaceDeepSection, RiskLevel } from "../types";
import { DRIVER_LABELS } from "../types";
import { computeBestMonths } from "./best-months";

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
const MAX_NEARBY_NOTE_CHARS = 260;

function trimProse(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Extra `PlaceDeepSection`s synthesized from structured fields so every place
 * gains the same **scaffold** of organized reading, after any hand-authored
 * `deepSections` in the corpus.
 */
export function mergeDeepSections(place: Place): PlaceDeepSection[] {
  const base = place.deepSections ?? [];
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
    const hasCalendarWindows = computeBestMonths(place).length > 0;
    const chartHint = hasCalendarWindows
      ? "The monthly strip sits under Seasonal rhythm below. Best months for… on this same page already turns these normals into garden, outdoor-comfort, dry-travel, and snow windows — this block stays on how total rain stacks month to month."
      : "The monthly precipitation strip lives in Seasonal rhythm a little farther down this page — read narrative here first, then line it up against the bars.";

    let lead: string;
    if (precipAllEqual(precip) || Math.max(...precip) <= 0) {
      lead =
        `Monthly precipitation normals are effectively even across the year — seasonal planning leans more on temperature, humidity, and wind than on a single rainy season. ${chartHint}`;
    } else if (flat) {
      const mid = hasCalendarWindows
        ? "Irrigation, drainage, and storm cadence still move month to month, but the calendar is gentler than in strongly seasonal climates."
        : "Irrigation, drainage, and travel timing still move month to month, but the calendar is gentler than in strongly seasonal climates.";
      lead = `Monthly precipitation stays in a fairly tight band — no sharp monsoon–dry split. ${mid} ${chartHint}`;
    } else if (mild) {
      const mid = hasCalendarWindows
        ? "Roof work, irrigation, and canopy management still track that rhythm."
        : "Roof work, travel windows, and how hard you lean on irrigation still track that rhythm.";
      lead = `Wettest pool toward ${wetM} and the lightest stretch around ${dryM}, but the wet–dry swing is moderate. ${mid} ${chartHint}`;
    } else {
      const mid = hasCalendarWindows
        ? "That rhythm shapes roof work, stormwater design, and how aggressively you need irrigation or drainage on a parcel."
        : "That rhythm shapes roof work, travel timing, and how aggressively you need irrigation or drainage on a parcel.";
      lead = `Monthly normals concentrate the wettest signal in ${wetM} and the driest stretch around ${dryM}. ${mid} ${chartHint}`;
    }

    const paras: string[] = [lead];
    const snow = place.climate.snowCm;
    if (snow && snow.some(s => s > 1)) {
      const snowMonths = snow.map((cm, i) => (cm > 1 ? MO[i] : null)).filter(Boolean) as string[];
      if (snowMonths.length > 0) {
        paras.push(
          `Snow shows in normals across ${snowMonths.slice(0, 6).join(", ")}${snowMonths.length > 6 ? ", …" : ""} — a planning season distinct from rainfall alone.`,
        );
      }
    } else {
      paras.push(
        flat
          ? "Snow is minor or absent in these normals; winter is mostly temperature, wind, and liquid precip."
          : "Snow plays a minor or absent role in the monthly normals here; winter challenges lean more toward temperature, wind, or rain than ploughing.",
      );
    }
    if (place.climate.frostFreeDays != null) {
      paras.push(
        `Estimated frost-free days for this entry: about ${place.climate.frostFreeDays} — pair with growability for tender plants.`,
      );
    }
    out.push({
      id: "appendix-season-pocket",
      title: "When rain and snow stack through the year",
      paragraphs: paras.slice(0, 3),
    });
  }

  // --- Mechanisms (cross-links the driver chips section) ---
  if (!existing.has("appendix-forces-atlas") && place.drivers.length > 0) {
    const labels = place.drivers.map(d => DRIVER_LABELS[d] ?? d);
    const maxShow = 7;
    const head = labels.slice(0, maxShow);
    const more = labels.length - head.length;
    const list =
      more > 0
        ? `${head.join(" · ")} — plus ${more} more in the same chip row.`
        : head.join(" · ");
    out.push({
      id: "appendix-forces-atlas",
      title: "Mechanisms tagged for this place",
      paragraphs: [
        `${list} Tap the matching chips under “Why this climate is different here” for glossary definitions and how each process shows up in the terrain.`,
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
      `${s.texture} Drainage is ${s.drainage}; soil pH about ${ph}. Growability sits at ${g.score}/100 in this atlas. Crops and plants called out as strong fits: ${grows}. Worth extra care: ${tricky}.`,
    ];
    if (s.notes) groundParas.push(trimProse(s.notes, MAX_SOIL_NOTE_CHARS));
    if (g.homeGarden) groundParas.push(`Home garden angle: ${trimProse(g.homeGarden, 240)}`);
    if (g.orchard) groundParas.push(`Orchard / perennial note: ${trimProse(g.orchard, 240)}`);
    out.push({
      id: "appendix-ground-garden",
      title: "Ground, drainage, and what grows",
      paragraphs: groundParas.slice(0, 4),
    });
  }

  // --- Local contrasts (only curated notes already on the record) ---
  if (!existing.has("appendix-nearby-differences")) {
    const paras: string[] = [];
    for (const lc of place.localContrast ?? []) {
      if (lc.note) paras.push(`Within roughly ${lc.radiusKm} km: ${trimProse(lc.note, MAX_NEARBY_NOTE_CHARS)}`);
      if (paras.length >= 2) break;
    }
    for (const nc of place.nearbyContrasts ?? []) {
      if (paras.length >= 3) break;
      paras.push(`${nc.label}: ${trimProse(nc.note, MAX_NEARBY_NOTE_CHARS)}`);
    }
    if (paras.length > 0) {
      out.push({
        id: "appendix-nearby-differences",
        title: "Contrasts within the neighbourhood",
        paragraphs: paras.slice(0, 3),
      });
    }
  }

  // --- Scouting / diligence (last in this bundle; relocation voice) ---
  if (!existing.has("appendix-scouting-diligence")) {
    const rel = place.relocationFit.length ? place.relocationFit.join(", ") : "general readers";
    const travel = place.travelFit.length ? place.travelFit.join(", ") : "year-round curiosity";
    const trade = place.scores.tradeoff >= 55
      ? "This profile carries real tradeoffs — read risks and seasonal limits before committing money or a move."
      : place.scores.tradeoff >= 35
        ? "Tradeoffs exist but are manageable for many households if you align expectations with the dry season, winter, or smoke windows."
        : "On paper the tradeoff load is modest relative to other atlas stops — still verify against your own health and insurance context.";

    type RiskRow = { key: (typeof RISK_KEYS)[number]; line: string; level: RiskLevel; hasNote: boolean };
    const riskRows: RiskRow[] = RISK_KEYS.map(k => {
      const r = place.risks[k];
      const label = RISK_LABEL[k];
      const line = r.note ? `${label} (${r.level}): ${trimProse(r.note, 120)}` : `${label}: ${r.level}`;
      return { key: k, line, level: r.level, hasNote: Boolean(r.note) };
    });
    riskRows.sort((a, b) => {
      const d = RISK_LEVEL_RANK[a.level] - RISK_LEVEL_RANK[b.level];
      if (d !== 0) return d;
      return (b.hasNote ? 1 : 0) - (a.hasNote ? 1 : 0);
    });
    const riskBits = riskRows.slice(0, 5).map(r => r.line);

    out.push({
      id: "appendix-scouting-diligence",
      title: "Homes, land, and long-term bets — how to read this stop",
      paragraphs: [
        `If you are scouting a home or small land parcel, start with who already thrives here: ${place.whoWouldLove} Relocation tags we attach include ${rel} — they are editorial shorthand, not census demographics.`,
        `Be equally clear on poor fit so you do not waste a site visit: ${place.whoMightNot} Travel-wise, people often show up for ${travel}.`,
        `Comfort (${place.scores.comfort}/100), resilience (${place.scores.resilience}/100), and growability (${place.scores.growability}/100) summarize habitability, climate-change positioning, and yard or orchard potential inside this atlas — not appraisal or lending rules. ${trade}`,
        `Risk diligence (always verify locally): ${riskBits.join(" · ")}.`,
        `Confidence here is ${place.confidence}${place.confidenceNotes ? ` — ${place.confidenceNotes}` : ""}. Use citations at the end of this sheet as your jump-off for primary sources.`,
      ],
    });
  }

  return out;
}
