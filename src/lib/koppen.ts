// ============================================================
// Terraclima — Köppen-Geiger climate classifier
// ============================================================
// Deterministic Köppen-Geiger classification computed PURELY from the
// authored monthly normals (tempHighC / tempLowC / precipMm). It invents
// no climate facts — Köppen IS a function of temperature and precipitation
// — so it can independently verify the authored `koppen` label against the
// data it should derive from. Conventions follow Peel, Finlayson &
// McMahon (2007): C/D split at 0 °C, B with absolute priority, MAT≥18 for
// the hot/cold (h/k) arid sub-letter.
//
// All places in this atlas are Northern Hemisphere (lat 14–72), so the
// high-sun half-year is Apr–Sep and the low-sun half is Oct–Mar. That
// season convention is load-bearing: e.g. Osoyoos sits on the BSk knife-
// edge and flips class if the halves are redefined. Do not change it
// without re-checking the koppen.test.ts regression traces.
// ============================================================

import type { Monthly12, Place } from "../types";

const SUMMER: readonly number[] = [3, 4, 5, 6, 7, 8]; // Apr–Sep (high-sun half)
const WINTER: readonly number[] = [9, 10, 11, 0, 1, 2]; // Oct–Mar (low-sun half)

export interface KoppenBreakdown {
  /** Mean annual temperature (°C). */
  matC: number;
  /** Mean annual precipitation (mm). */
  mapMm: number;
  /** Warmest-month mean temperature (°C). */
  thotC: number;
  /** Coldest-month mean temperature (°C). */
  tcoldC: number;
  /** Count of months with mean ≥ 10 °C. */
  monthsAbove10: number;
  /** Aridity threshold P_th = 20·MAT + k (mm). */
  aridityThresholdMm: number;
  /** Seasonality constant k used in the aridity threshold. */
  dryThresholdK: 0 | 140 | 280;
  /** Index (0–11) of the driest month. */
  driestMonthIndex: number;
}

export interface KoppenResult {
  /** Full code, e.g. "Csb", "BSk", "Dfb", "Aw", "ET". */
  code: string;
  /** First-letter family: "A" | "B" | "C" | "D" | "E". */
  family: string;
  breakdown: KoppenBreakdown;
}

function round9(n: number): number {
  // Snap away float artefacts (e.g. 16.600000001) before threshold compares.
  return Math.round(n * 1e9) / 1e9;
}

function isFiniteMonthly(a: readonly number[] | undefined): a is Monthly12 {
  return !!a && a.length === 12 && a.every(v => typeof v === "number" && Number.isFinite(v));
}

/**
 * Classify from the three monthly arrays directly. Returns `null` for
 * degenerate input (missing / wrong-length / non-finite) — never throws.
 */
export function classifyKoppen(
  highC: readonly number[],
  lowC: readonly number[],
  precipMm: readonly number[],
): KoppenResult | null {
  if (!isFiniteMonthly(highC) || !isFiniteMonthly(lowC) || !isFiniteMonthly(precipMm)) return null;

  const mean = highC.map((h, i) => round9((h + lowC[i]!) / 2));
  const mat = round9(mean.reduce((s, v) => s + v, 0) / 12);
  const map = round9(precipMm.reduce((s, v) => s + v, 0));
  const thot = round9(Math.max(...mean));
  const tcold = round9(Math.min(...mean));
  const monthsAbove10 = mean.filter(v => v >= 10).length;

  const sumP = SUMMER.reduce((s, i) => s + precipMm[i]!, 0);
  const winP = WINTER.reduce((s, i) => s + precipMm[i]!, 0);
  const sPmin = Math.min(...SUMMER.map(i => precipMm[i]!));
  const sPmax = Math.max(...SUMMER.map(i => precipMm[i]!));
  const wPmin = Math.min(...WINTER.map(i => precipMm[i]!));
  const wPmax = Math.max(...WINTER.map(i => precipMm[i]!));
  const pmin = Math.min(...precipMm);

  let driestMonthIndex = 0;
  for (let i = 1; i < 12; i += 1) {
    if (precipMm[i]! < precipMm[driestMonthIndex]!) driestMonthIndex = i;
  }

  // Seasonality constant: ≥70% of precip in the low-sun half → 0; ≥70% in
  // the high-sun half → 280; otherwise evenly spread → 140.
  let k: 0 | 140 | 280;
  if (winP >= 0.7 * map) k = 0;
  else if (sumP >= 0.7 * map) k = 280;
  else k = 140;
  const pth = round9(20 * mat + k);

  const breakdown: KoppenBreakdown = {
    matC: mat,
    mapMm: map,
    thotC: thot,
    tcoldC: tcold,
    monthsAbove10,
    aridityThresholdMm: pth,
    dryThresholdK: k,
    driestMonthIndex,
  };

  // B (arid) — absolute priority over A/C/D/E.
  if (map < pth) {
    const second = map < 0.5 * pth ? "W" : "S";
    const third = mat >= 18 ? "h" : "k";
    return { code: `B${second}${third}`, family: "B", breakdown };
  }

  // E (polar) — warmest month below 10 °C.
  if (thot < 10) {
    return { code: thot < 0 ? "EF" : "ET", family: "E", breakdown };
  }

  // A (tropical) — coldest month ≥ 18 °C.
  if (tcold >= 18) {
    let code: string;
    if (pmin >= 60) code = "Af";
    else if (pmin >= 100 - map / 25) code = "Am";
    else code = SUMMER.includes(driestMonthIndex) ? "As" : "Aw";
    return { code, family: "A", breakdown };
  }

  // C vs D split at the 0 °C coldest-month isotherm (Peel 2007).
  const first = tcold >= 0 ? "C" : "D";

  // Precip sub-letter. When both dry-summer and dry-winter qualify, the
  // drier half wins.
  const sQ = sPmin < 30 && sPmin < wPmax / 3;
  const wQ = wPmin < sPmax / 10;
  let second: string;
  if (sQ && wQ) second = sPmin <= wPmin ? "s" : "w";
  else if (sQ) second = "s";
  else if (wQ) second = "w";
  else second = "f";

  // Temperature sub-letter.
  let third: string;
  if (thot >= 22) third = "a";
  else if (monthsAbove10 >= 4) third = "b";
  else if (tcold > -38) third = "c";
  else third = "d"; // continental only (Tcold ≤ −38)

  return { code: `${first}${second}${third}`, family: first, breakdown };
}

const koppenCache = new WeakMap<Place, KoppenResult | null>();

/** Cached per-place Köppen classification from the authored monthly normals. */
export function computeKoppen(place: Place): KoppenResult | null {
  if (koppenCache.has(place)) return koppenCache.get(place)!;
  const result = classifyKoppen(place.climate.tempHighC, place.climate.tempLowC, place.climate.precipMm);
  koppenCache.set(place, result);
  return result;
}

function isValidKoppenCode(token: string): boolean {
  const first = token[0];
  // A and E require a second letter (bare "A" or "E" is not a full code); A's
  // second letter is f/m/w/s, E's is T/F. B always has three letters
  // (W/S + h/k). C has 2–3 letters (s/w/f + optional a/b/c); D has 2–3
  // letters (s/w/f + optional a/b/c/d — `d` is the continental-only sub-letter).
  if (first === "A") return /^A[fmws]$/.test(token);
  if (first === "B") return /^B[WS][hk]?$/.test(token);
  if (first === "C") return /^C[swf][abc]?$/.test(token);
  if (first === "D") return /^D[swf][abcd]?$/.test(token);
  if (first === "E") return /^E[TF]$/.test(token);
  return false;
}

/**
 * Extract valid Köppen codes from a free-form authored label. The atlas
 * stores prose-y, multi-zone strings like
 * "BSk (valley) / Csb analog (summit)" → ["BSk", "Csb"], and also
 * hyphen-joined siblings like "Csb-Cfb" → ["Csb", "Cfb"].
 */
export function parseAuthoredKoppen(authored: string): string[] {
  const out: string[] = [];
  for (const zone of authored.split("/")) {
    const noParens = zone.replace(/\([^)]*\)/g, " ");
    // Split on whitespace, commas, semicolons, and hyphens — the corpus uses
    // any of these to join codes (e.g. "Csb-Cfb", "Csb, Cfb", "Csb / Cfb").
    for (const token of noParens.split(/[-\s,;]+/)) {
      const t = token.trim();
      if (t && isValidKoppenCode(t)) out.push(t);
    }
  }
  return [...new Set(out)];
}

/**
 * Places where strict Köppen-Geiger legitimately diverges from the authored
 * label (near-threshold or genuine multi-zone transitions). A place passes
 * the audit if its computed code is in `expected`. Keep this small and every
 * entry justified — it is the documented exception list, not a silencer.
 */
export const KOPPEN_AUDIT_ALLOWLIST: Record<string, { expected: string[]; reason: string }> = {};

// A Köppen family disagreement is *expected*, not an error, when the place
// sits within measurement noise of the threshold that separates the two
// families — this is the well-known knife-edge behaviour of the system
// (e.g. a semi-arid town a few mm of rain from the B/C line, or a highland
// town a fraction of a degree from the 18 °C A/C isotherm). We treat such
// cases as "boundary"; only a disagreement with no nearby threshold is a
// "divergent" labelling error.
const ARIDITY_BOUNDARY_FRACTION = 0.35; // |MAP − Pth| within this share of Pth
const THERMAL_BOUNDARY_C = 2; // within this many °C of an A/C, C/D or E isotherm

function familyBoundaryExplains(fa: string, fc: string, b: KoppenBreakdown): boolean {
  const pair = new Set([fa, fc]);
  const has = (x: string) => pair.has(x);
  // B (arid) vs any moist family → proximity to the aridity threshold.
  if (has("B") && (has("A") || has("C") || has("D"))) {
    return Math.abs(b.mapMm - b.aridityThresholdMm) <= ARIDITY_BOUNDARY_FRACTION * b.aridityThresholdMm;
  }
  // A (tropical) vs C/D → proximity to the 18 °C coldest-month isotherm.
  if (has("A") && (has("C") || has("D"))) {
    return Math.abs(b.tcoldC - 18) <= THERMAL_BOUNDARY_C;
  }
  // C vs D → proximity to the 0 °C coldest-month isotherm.
  if (has("C") && has("D")) {
    return Math.abs(b.tcoldC) <= THERMAL_BOUNDARY_C;
  }
  // E (polar) vs C/D → proximity to the 10 °C warmest-month isotherm.
  if (has("E") && (has("C") || has("D"))) {
    return Math.abs(b.thotC - 10) <= THERMAL_BOUNDARY_C;
  }
  return false;
}

export type KoppenAuditLevel = "match" | "subclass" | "boundary" | "divergent" | "skip";

export interface KoppenAudit {
  computed: KoppenResult | null;
  authored: string;
  authoredZones: string[];
  familyMatch: boolean;
  classMatch: boolean;
  allowlisted: boolean;
  level: KoppenAuditLevel;
  note: string;
}

/**
 * Audit the authored `koppen` label against the computed class.
 * - `match`     — computed code equals an authored zone (or allowlisted).
 * - `subclass`  — same family, different sub-letters (a/b, s/w/f near-threshold).
 * - `boundary`  — different family, but the place sits on the dividing isotherm
 *                 / aridity line (expected Köppen knife-edge — not an error).
 * - `divergent` — different family with no nearby threshold (a real labelling error).
 * - `skip`      — degenerate climate data, or no parseable authored code.
 * A multi-zone authored label counts as agreement if the computed code matches
 * ANY parsed zone.
 */
export function koppenAudit(place: Place): KoppenAudit {
  const computed = computeKoppen(place);
  const authored = place.koppen;
  const authoredZones = parseAuthoredKoppen(authored);

  if (!computed) {
    return {
      computed: null, authored, authoredZones, familyMatch: false, classMatch: false,
      allowlisted: false, level: "skip", note: "Degenerate climate data; cannot classify.",
    };
  }
  if (authoredZones.length === 0) {
    // The authored field is present (sanity-check already enforces that elsewhere)
    // but yields no valid Köppen code — almost always a typo like "Csab", "Cfd",
    // or pure prose. The audit treats this as a genuine labelling error so it
    // cannot silently slip past CI.
    return {
      computed, authored, authoredZones, familyMatch: false, classMatch: false,
      allowlisted: false, level: "divergent",
      note: `No parseable Köppen code in authored label "${authored}"; computed ${computed.code}.`,
    };
  }

  const classMatch = authoredZones.some(z => computed.code === z || computed.code.startsWith(z));
  const familyMatch = authoredZones.some(z => z[0] === computed.family);
  const allow = KOPPEN_AUDIT_ALLOWLIST[place.id];
  const allowlisted = allow ? allow.expected.includes(computed.code) : false;

  let level: KoppenAuditLevel;
  if (classMatch || allowlisted) level = "match";
  else if (familyMatch) level = "subclass";
  else if (authoredZones.some(z => familyBoundaryExplains(z[0]!, computed.family, computed.breakdown))) level = "boundary";
  else level = "divergent";

  const note = level === "match"
    ? `Computed ${computed.code} agrees with authored ${authoredZones.join("/")}.`
    : level === "boundary"
      ? `Computed ${computed.code} vs authored ${authoredZones.join("/")} — sits on the Köppen boundary.`
      : `Computed ${computed.code} vs authored ${authoredZones.join("/")}.`;

  return { computed, authored, authoredZones, familyMatch, classMatch, allowlisted, level, note };
}
