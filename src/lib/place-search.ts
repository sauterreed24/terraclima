// ============================================================
// Terraclima — Place search: field-weighted tiers, typo tolerance,
// "did you mean" suggestions.
// ============================================================
//
// A query is split into tokens (AND); each token is matched against a place's
// tiered search fields (see `getPlaceSearchFields` in `src/data/places.ts`) and
// takes the best tier it hits. A place's match rank is its WORST token tier,
// so "cool summer oregon" needs every word to land somewhere, and a place
// whose name answers the whole query always sorts first.
//
// Tiers, best first:
//   0 name-exact      the query is the place's name ("boulder" → Boulder)
//   1 name-start      the name starts with the query ("oaxaca" → Oaxaca City)
//   2 name-word       a word of the name starts with the token
//   3 name-part       the token appears inside a name word
//   4 locality        municipality, state / province, country, towns in the zone
//   5 classification  archetype labels, drivers, biome, Köppen
//   6 headline        the one-sentence summary and the why-distinct mechanism
//   7 summary         the immersive summary paragraph   } only for
//   8 prose           other authored prose              } distinctive terms
//   9 cross-reference mentions of OTHER places          } — see below
//  10 fuzzy           typo-tolerant name / locality match (fallback pass only)
//
// Concept words. "snow" appears somewhere in the long prose of nearly every
// place, so a hit there says nothing. Tiers 7–9 are therefore admitted for a
// token one tier at a time, and only while the token stays distinctive: the
// places it would add through those tiers number at most
// `distinctiveLimit(pool)` (12, or 10% of the pool if larger). So "bandelier"
// (one place, deep prose) still finds Los Alamos, "wine" reaches into the
// summaries, and "snow" stops at the snowbelt / alpine places whose
// classification or headline is about snow. When nothing matches a token at
// tiers 0–6 at all, the first tier that has matches is admitted regardless,
// so a query is never emptied by the gate alone.
//
// Typos. The fuzzy pass runs only when the exact pass returns nothing, and
// only against name and locality words: Damerau–Levenshtein distance ≤ 1 for
// tokens of 5–7 letters, ≤ 2 for 8+, and two dropped letters for 7
// ("ashvile" → Asheville).
//
// Abbreviations. "mt", "ft", "pt", "st" and a few more also match their
// spelled-out word, and the reverse, as whole words (`WORD_VARIANTS`).
// ============================================================

import type { Place } from "../types";
import { PLACES, getPlaceSearchFields, normalizeSearchText, type PlaceSearchFields } from "../data/places";

export const SEARCH_TIER = {
  nameExact: 0,
  nameStart: 1,
  nameWord: 2,
  namePart: 3,
  locality: 4,
  classification: 5,
  headline: 6,
  summary: 7,
  prose: 8,
  crossReference: 9,
  fuzzy: 10,
} as const;

export type SearchTier = (typeof SEARCH_TIER)[keyof typeof SEARCH_TIER];

/**
 * How many places a token may add through the gated tiers (summary, prose,
 * cross-reference) and still count as distinctive.
 */
export function distinctiveLimit(poolSize: number): number {
  return Math.max(12, Math.ceil(poolSize * 0.1));
}

const NO_MATCH = 99;

/** Function words dropped from multi-word queries ("places in oregon" → "places oregon"). */
const STOPWORDS = new Set(["the", "a", "an", "in", "of", "and", "or", "near", "for", "with", "to", "at", "on"]);

export interface SearchToken {
  /** Normalized text, no padding; a quoted phrase keeps its inner spaces. */
  text: string;
  /** Quoted in the query: must match as whole words, in order. */
  phrase: boolean;
  /**
   * Other spellings of the same word that also count as a match, whole word
   * only: "mt" ↔ "mount", "ft" ↔ "fort", "st" ↔ "saint". Absent when none.
   */
  variants?: string[];
}

/**
 * Abbreviations people type for words that appear spelled out in place names,
 * and the reverse ("Mt. Charleston" → Mount Charleston, "Saint John's" →
 * St. John's). Matched as whole words only.
 */
const WORD_VARIANTS: Record<string, readonly string[]> = {
  mt: ["mount"],
  mount: ["mt"],
  mtn: ["mountain"],
  ft: ["fort"],
  fort: ["ft"],
  pt: ["point", "port"],
  point: ["pt"],
  port: ["pt"],
  st: ["saint"],
  saint: ["st"],
};

export interface ParsedSearchQuery {
  /** Whole query in normalized, unpadded form ("" when blank). */
  normalized: string;
  tokens: SearchToken[];
}

/** Split a raw query into AND-ed tokens; `"quoted phrases"` stay together. */
export function parseSearchQuery(raw: string | null | undefined): ParsedSearchQuery {
  const input = raw ?? "";
  const tokens: SearchToken[] = [];
  const seen = new Set<string>();
  const push = (text: string, phrase: boolean) => {
    const key = `${phrase ? "p" : "w"}:${text}`;
    if (!text || seen.has(key)) return;
    seen.add(key);
    tokens.push({ text, phrase });
  };
  const quoted = /["“”]([^"“”]*)["“”]/g;
  let rest = "";
  let last = 0;
  for (let m = quoted.exec(input); m; m = quoted.exec(input)) {
    rest += `${input.slice(last, m.index)} `;
    last = m.index + m[0].length;
    const phrase = normalizeSearchText(m[1] ?? "").trim();
    push(phrase, phrase.includes(" "));
  }
  rest += input.slice(last);
  const words = normalizeSearchText(rest).trim().split(" ").filter(Boolean);
  const meaningful = words.filter(w => !STOPWORDS.has(w));
  // A query made only of stopwords ("the") is still a query.
  for (const w of meaningful.length > 0 || tokens.length > 0 ? meaningful : words) push(w, false);
  // Abbreviations only alongside another word: "mt washington" means Mount,
  // but "mt" on its own is Montana.
  if (tokens.length > 1) {
    for (const token of tokens) {
      // Own keys only: a token like "constructor" is a word, not an Object method.
      const variants = token.phrase || !Object.prototype.hasOwnProperty.call(WORD_VARIANTS, token.text) ? undefined : WORD_VARIANTS[token.text];
      if (variants) token.variants = [...variants];
    }
  }
  return { normalized: normalizeSearchText(input).trim(), tokens };
}

function fieldHas(field: string, token: SearchToken, wholeWord: boolean): boolean {
  return field.includes(wholeWord || token.phrase ? ` ${token.text} ` : ` ${token.text}`);
}

/**
 * Best tier at which one token matches one place, ignoring the distinctive-term
 * gate (the caller applies it). Tokens under three letters only match whole
 * words in prose, so "wa" does not hit "water" in every summary.
 */
function tokenTier(fields: PlaceSearchFields, token: SearchToken): number {
  let best = literalTokenTier(fields, token);
  // An abbreviation's spelled-out form (or the reverse) counts as the same
  // word, matched whole so "pt" → "point" does not also hit "pointed".
  for (const text of token.variants ?? []) {
    if (best <= SEARCH_TIER.nameWord) break;
    best = Math.min(best, literalTokenTier(fields, { text, phrase: true }));
  }
  return best;
}

function literalTokenTier(fields: PlaceSearchFields, token: SearchToken): number {
  const short = token.text.length < 3;
  if (fieldHas(fields.name, token, false)) return SEARCH_TIER.nameWord;
  if (!short && !token.phrase && fields.name.includes(token.text)) return SEARCH_TIER.namePart;
  // A one- or two-letter token is a code here ("mi", "bc"): whole words only,
  // so "grand marais mi" does not take "mi" as the start of "Minnesota".
  if (fieldHas(fields.locality, token, short)) return SEARCH_TIER.locality;
  if (fieldHas(fields.classification, token, false)) return SEARCH_TIER.classification;
  if (fieldHas(fields.headline, token, short)) return SEARCH_TIER.headline;
  if (fieldHas(fields.summary, token, short)) return SEARCH_TIER.summary;
  if (fieldHas(fields.prose, token, short)) return SEARCH_TIER.prose;
  if (fieldHas(fields.crossReference, token, short)) return SEARCH_TIER.crossReference;
  return NO_MATCH;
}

/** Whole-query name tiers: the query is, or begins, the place's name. */
function wholeNameTier(fields: PlaceSearchFields, normalized: string): number {
  if (!normalized) return NO_MATCH;
  const padded = ` ${normalized} `;
  if (fields.name === padded || fields.nameCore === padded) return SEARCH_TIER.nameExact;
  if (fields.name.startsWith(` ${normalized}`)) return SEARCH_TIER.nameStart;
  return NO_MATCH;
}

/** Damerau–Levenshtein (optimal string alignment) distance, abandoning past `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2]! + 1);
      }
      row.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * Allowed typos for a token: none under 5 letters, 1 for 5–7, 2 for 8+. A
 * 7-letter token also gets a second edit when both are dropped letters (see
 * {@link fuzzyFieldDistance}).
 */
export function typoBudget(token: string): number {
  if (token.length >= 8) return 2;
  if (token.length >= 5) return 1;
  return 0;
}

/** Smallest edit distance from `token` to any word of `field`, or null when over budget. */
function fuzzyFieldDistance(field: string, token: string, budget: number): number | null {
  let best: number | null = null;
  for (const word of field.split(" ")) {
    // A one-letter slip must not turn a short word into a match for a long token.
    if (word.length < 4) continue;
    const d = editDistance(token, word, budget);
    // Dropped letters are the commonest slip ("ashvile" → Asheville): a
    // 7-letter token may miss two of them. Other two-edit slips at this length
    // land on unrelated names ("houston" → Houghton), so they stay out.
    const dropped = d > budget && token.length === 7 && word.length === 9 && isSubsequence(token, word);
    if (!dropped && d > budget) continue;
    const dist = dropped ? 2 : d;
    if (best == null || dist < best) best = dist;
  }
  return best;
}

function isSubsequence(short: string, long: string): boolean {
  let i = 0;
  for (let j = 0; j < long.length && i < short.length; j++) if (short[i] === long[j]) i++;
  return i === short.length;
}

export interface PlaceSearchResult {
  /**
   * `none`: blank query, nothing filtered. `exact`: tiered matches. `fuzzy`:
   * the exact pass found nothing and typo-tolerant matches are returned.
   */
  mode: "none" | "exact" | "fuzzy";
  /**
   * Sort key per matching place: lower is a better match. Places absent from
   * the map do not match. Empty in `none` mode. The integer part ÷ 100 is the
   * place's {@link SearchTier}.
   */
  rankByPlace: Map<Place, number>;
}

/**
 * Match `query` against `places`. Pure; the per-place field text is cached by
 * `getPlaceSearchFields`, so a keystroke costs a few `includes` per place.
 */
export function searchPlaces(places: readonly Place[], query: string | null | undefined): PlaceSearchResult {
  const parsed = parseSearchQuery(query);
  const rankByPlace = new Map<Place, number>();
  if (parsed.tokens.length === 0) return { mode: "none", rankByPlace };

  const fields = places.map(getPlaceSearchFields);
  // tiers[t][i]: best raw tier of token t in place i.
  const tiers = parsed.tokens.map(token => fields.map(f => tokenTier(f, token)));
  // Distinctive-term gate, per token (see header): the worst tier admitted.
  const limit = distinctiveLimit(places.length);
  const maxTier = tiers.map(row => {
    const count = new Array<number>(SEARCH_TIER.fuzzy).fill(0);
    for (const t of row) if (t !== NO_MATCH) count[t]! += 1;
    let admitted: number = SEARCH_TIER.headline;
    let hasMatch = count.slice(0, SEARCH_TIER.summary).some(n => n > 0);
    let gated = 0;
    for (let tier: number = SEARCH_TIER.summary; tier <= SEARCH_TIER.crossReference; tier++) {
      const n = count[tier]!;
      if (n === 0) continue;
      if (hasMatch && gated + n > limit) break;
      // The first tier with any match is admitted whatever its size; it still uses up the allowance.
      hasMatch = true;
      gated += n;
      admitted = tier;
    }
    return admitted;
  });

  for (let i = 0; i < places.length; i++) {
    let worst = 0;
    let sum = 0;
    for (let t = 0; t < tiers.length; t++) {
      let tier = tiers[t]![i]!;
      if (tier > maxTier[t]!) tier = NO_MATCH;
      if (tier > worst) worst = tier;
      sum += tier;
      if (worst === NO_MATCH) break;
    }
    if (worst === NO_MATCH) continue;
    const whole = wholeNameTier(fields[i]!, parsed.normalized);
    // Whole-name hits sort ahead of everything; otherwise worst token tier, then the tier total.
    rankByPlace.set(places[i]!, whole !== NO_MATCH ? whole * 100 : worst * 100 + Math.min(sum, 99));
  }
  if (rankByPlace.size > 0) return { mode: "exact", rankByPlace };

  // Typo-tolerant fallback: every token must match — exactly at a name /
  // locality / classification / headline tier, or within its typo budget
  // against a name or locality word.
  for (let i = 0; i < places.length; i++) {
    const f = fields[i]!;
    let total = 0;
    let fuzzyHits = 0;
    let ok = true;
    for (let t = 0; t < parsed.tokens.length; t++) {
      const token = parsed.tokens[t]!;
      const exactTier = tiers[t]![i]!;
      if (exactTier <= SEARCH_TIER.headline) {
        // A short exact word ("fe") that is a whole word here beats one that is
        // only the start of a longer word ("Felton"): "sante fe" → Santa Fe.
        if (exactTier <= SEARCH_TIER.namePart && !` ${f.name} ${f.locality} `.includes(` ${token.text} `)) total += 1;
        continue;
      }
      const budget = token.phrase ? 0 : typoBudget(token.text);
      const inName = budget > 0 ? fuzzyFieldDistance(f.name, token.text, budget) : null;
      const inLocality = budget > 0 && inName == null ? fuzzyFieldDistance(f.locality, token.text, budget) : null;
      if (inName == null && inLocality == null) {
        ok = false;
        break;
      }
      fuzzyHits += 1;
      // Name typos outrank locality typos; fewer edits outrank more.
      total += inName != null ? inName * 10 : inLocality! * 10 + 5;
    }
    if (ok && fuzzyHits > 0) rankByPlace.set(places[i]!, SEARCH_TIER.fuzzy * 100 + Math.min(total, 99));
  }
  return { mode: rankByPlace.size > 0 ? "fuzzy" : "exact", rankByPlace };
}

/** Tier of a rank value from {@link PlaceSearchResult.rankByPlace}. */
export function searchTierOfRank(rank: number): SearchTier {
  return Math.floor(rank / 100) as SearchTier;
}

export interface PlaceSearchSuggestion {
  /** Text to put in the search box (a place's short name, or a region name). */
  text: string;
  kind: "place" | "region";
  /** Set for `kind: "place"` so the UI can open the profile directly. */
  placeId?: string;
}

function titleOfCore(place: Place): string {
  return (place.name.split(/\s*[(&—]|\s+and the\s+/i)[0] ?? place.name).trim() || place.name;
}

/**
 * "Did you mean" suggestions for a query whose exact search found nothing:
 * the closest place names (and regions) by typo distance, best first, at most
 * `limit`. Returns [] for a blank query and for a query that has exact
 * matches in `places` — so it can be called unconditionally.
 *
 * More forgiving than the search fallback itself (which only auto-corrects
 * within the typo budget): suggestions allow one extra edit and 4-letter
 * tokens, since the user confirms them with a click.
 */
export function suggestPlaceSearches(
  query: string | null | undefined,
  places: readonly Place[] = PLACES,
  limit = 3,
): PlaceSearchSuggestion[] {
  const parsed = parseSearchQuery(query);
  if (parsed.tokens.length === 0 || limit <= 0) return [];
  const found = searchPlaces(places, query);
  if (found.mode === "exact" && found.rankByPlace.size > 0) return [];

  const tokens = parsed.tokens.filter(t => !t.phrase).map(t => t.text);
  if (tokens.length === 0) return [];
  const budgetFor = (token: string) => (token.length >= 4 ? typoBudget(token) + 1 : 0);

  interface Candidate extends PlaceSearchSuggestion { score: number }
  const candidates = new Map<string, Candidate>();
  const consider = (label: string, normalized: string, kind: Candidate["kind"], placeId?: string) => {
    const words = normalized.trim().split(" ").filter(Boolean);
    let score = 0;
    let matched = 0;
    for (const token of tokens) {
      const budget = budgetFor(token);
      let best: number | null = null;
      for (const word of words) {
        // Compare against the same-length prefix too, so a typo made while still typing is caught.
        const d = Math.min(
          editDistance(token, word, budget),
          word.length > token.length ? editDistance(token, word.slice(0, token.length), budget) + 0.5 : Infinity,
        );
        if (d <= budget && (best == null || d < best)) best = d;
      }
      if (best == null) continue;
      matched += 1;
      score += best;
    }
    if (matched === 0) return;
    // Unmatched query tokens cost more than any typo; region suggestions rank just behind equally close places.
    const total = score + (tokens.length - matched) * 10 + (kind === "region" ? 0.25 : 0);
    const key = `${kind}:${label.toLowerCase()}`;
    const existing = candidates.get(key);
    if (!existing || total < existing.score) {
      candidates.set(key, placeId ? { text: label, kind, placeId, score: total } : { text: label, kind, score: total });
    }
  };

  for (const place of places) {
    const f = getPlaceSearchFields(place);
    consider(titleOfCore(place), f.nameCore, "place", place.id);
    consider(place.region, normalizeSearchText(place.region), "region");
  }
  return [...candidates.values()]
    .sort((a, b) => a.score - b.score || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
