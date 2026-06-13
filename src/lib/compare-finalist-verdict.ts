import type { Place } from "../types";
import { getBestMonths } from "./best-months";
import { annualComfortMonthCount, avgRisk, RISK_VALUE } from "./climate-metrics";
import { assessLiveFit, type LiveFitFilters } from "./live-fit";
import { feltComfortScore, livedFrictionScore, scoreLivability } from "./livability-score";
import {
  comparisonLensLabel,
  DEFAULT_COMPARISON_LENS,
  type ComparisonLensId,
} from "./compare-workbench";

export interface CompareDecisionProfile {
  place: Place;
  liveFitScore: number;
  livabilityScore: number;
  feltComfort: number;
  livedEase: number;
  easyMonths: number;
  riskLoad: number;
}

export interface CompareDecisionLane {
  label: string;
  place: Place;
  value: string;
  detail: string;
}

export interface CompareScoutStep {
  label: string;
  place: Place;
  visitWindow: string;
  visitDetail: string;
  why: string;
  caveat: string;
}

export interface CompareDecisionTableRow {
  place: Place;
  role: string;
  decisionScore: number;
  fitSummary: string;
  riskSummary: string;
  visitWindow: string;
  watch: string;
}

export type CompareVerificationTone = "book" | "verify" | "source";

export interface CompareVerificationItem {
  id: string;
  label: string;
  place: Place;
  action: string;
  proof: string;
  tone: CompareVerificationTone;
}

interface CounterweightRead {
  place: Place;
  label: string;
  preference: string;
}

export interface CompareDecisionRead {
  primary: CompareDecisionProfile;
  counterweight: CounterweightRead | null;
  summary: string;
  caution: string;
  nextAction: string;
  scoutSequence: CompareScoutStep[];
  verificationChecklist: CompareVerificationItem[];
  lanes: CompareDecisionLane[];
  tableRows: CompareDecisionTableRow[];
}

const RISK_LABELS: Record<keyof Place["risks"], string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal",
};

function profileNameTie(a: CompareDecisionProfile, b: CompareDecisionProfile): number {
  return a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id);
}

function pickProfile(
  profiles: readonly CompareDecisionProfile[],
  score: (profile: CompareDecisionProfile) => number,
  direction: "asc" | "desc" = "desc",
): CompareDecisionProfile {
  return [...profiles].sort((a, b) => {
    const diff = score(a) - score(b);
    if (diff !== 0) return direction === "asc" ? diff : -diff;
    return profileNameTie(a, b);
  })[0]!;
}

export function blendedCompareScore(profile: CompareDecisionProfile): number {
  return Math.round(
    profile.liveFitScore * 0.32 +
    profile.livabilityScore * 0.28 +
    profile.feltComfort * 0.16 +
    profile.livedEase * 0.1 +
    profile.place.scores.growability * 0.08 +
    (100 - profile.riskLoad) * 0.06,
  );
}

function easyMonthScore(profile: CompareDecisionProfile): number {
  return Math.round((profile.easyMonths / 12) * 100);
}

function weightedScore(parts: readonly [value: number, weight: number][]): number {
  return Math.round(parts.reduce((sum, [value, weight]) => sum + value * weight, 0));
}

export function compareLensScore(
  profile: CompareDecisionProfile,
  lens: ComparisonLensId = DEFAULT_COMPARISON_LENS,
): number {
  const easyMonths = easyMonthScore(profile);
  const lowRisk = 100 - profile.riskLoad;
  switch (lens) {
    case "travel":
      return weightedScore([
        [profile.feltComfort, 0.3],
        [easyMonths, 0.25],
        [lowRisk, 0.2],
        [profile.place.scores.microclimateUniqueness, 0.15],
        [profile.place.scores.hiddenGem, 0.1],
      ]);
    case "move":
      return weightedScore([
        [profile.liveFitScore, 0.28],
        [profile.livabilityScore, 0.28],
        [profile.livedEase, 0.18],
        [lowRisk, 0.16],
        [profile.place.scores.growability, 0.1],
      ]);
    case "remote":
      return weightedScore([
        [profile.liveFitScore, 0.34],
        [profile.livedEase, 0.22],
        [profile.feltComfort, 0.16],
        [lowRisk, 0.14],
        [profile.place.scores.resilience, 0.09],
        [easyMonths, 0.05],
      ]);
    case "garden":
      return weightedScore([
        [profile.place.scores.growability, 0.38],
        [easyMonths, 0.18],
        [lowRisk, 0.14],
        [profile.place.scores.resilience, 0.14],
        [profile.feltComfort, 0.1],
        [profile.liveFitScore, 0.06],
      ]);
    case "risk":
      return weightedScore([
        [lowRisk, 0.42],
        [profile.place.scores.resilience, 0.22],
        [profile.livedEase, 0.16],
        [profile.livabilityScore, 0.12],
        [profile.feltComfort, 0.08],
      ]);
    case "balanced":
    default:
      return blendedCompareScore(profile);
  }
}

export function buildCompareDecisionProfiles(
  places: readonly Place[],
  liveFitFilters: LiveFitFilters = {},
): CompareDecisionProfile[] {
  return places.map(place => {
    const liveFit = assessLiveFit(place, liveFitFilters);
    const livability = scoreLivability(place);
    return {
      place,
      liveFitScore: liveFit.score,
      livabilityScore: livability.score,
      feltComfort: Math.round(feltComfortScore(place)),
      livedEase: Math.round(livedFrictionScore(place)),
      easyMonths: annualComfortMonthCount(place),
      riskLoad: Math.round(avgRisk(place) * 20),
    };
  });
}

function compactSentence(s: string, max = 96): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max - 1);
  const head = clean.slice(0, cut > 48 ? cut : max).replace(/[;,:.\s]+$/, "");
  return `${head}...`;
}

function topRiskRead(place: Place): string | null {
  const entries = Object.entries(place.risks) as Array<
    [keyof Place["risks"], Place["risks"][keyof Place["risks"]]]
  >;
  const [key, risk] = entries
    .sort((a, b) => RISK_VALUE[b[1].level] - RISK_VALUE[a[1].level] || RISK_LABELS[a[0]].localeCompare(RISK_LABELS[b[0]]))[0]!;
  if (RISK_VALUE[risk.level] < 3) return null;
  const trend = risk.trend && risk.trend !== "stable" ? `, ${risk.trend}` : "";
  return `${RISK_LABELS[key]}: ${risk.level.replace(/-/g, " ")}${trend}; verify this hazard in the dossier.`;
}

function visitWindowRead(place: Place): Pick<CompareScoutStep, "visitWindow" | "visitDetail"> {
  const window = getBestMonths(place, "C").find(item => item.kind === "good");
  if (!window) {
    return {
      visitWindow: "Season read needed",
      visitDetail: "Use the dossier's season-by-season section before putting dates on a scout trip.",
    };
  }
  return {
    visitWindow: `${window.label}: ${window.range}`,
    visitDetail: window.note ?? "Use this favorable window for first-pass climate scouting.",
  };
}

function caveatRead(profile: CompareDecisionProfile): string {
  const risk = topRiskRead(profile.place);
  if (risk) return risk;
  if (profile.riskLoad >= 34) return `Risk load: ${profile.riskLoad}/100; read hazards before treating it as easy.`;
  if (profile.livedEase < 58) return `Lived ease: ${profile.livedEase}/100; verify daily access, cost, and social fit.`;
  return compactSentence(profile.place.whoMightNot, 96);
}

function sourceGapLabels(place: Place): string[] {
  const httpsCitations = place.citations.filter(citation => citation.url?.startsWith("https://")).length;
  const hasLiveSignals = Boolean(place.liveSignals && Object.values(place.liveSignals).some(value => typeof value === "number"));
  const hasHumidity = Boolean(place.climate.humidity?.length);
  const hasSunshine = Boolean(place.climate.sunshinePct?.length);
  return [
    ...(place.confidence === "low" ? ["low-confidence profile"] : place.confidence === "moderate" ? ["moderate-confidence profile"] : []),
    ...(httpsCitations < 2 ? ["second HTTPS source"] : []),
    ...((place.deepSections?.length ?? 0) < 1 ? ["deep-dive context"] : []),
    ...(!hasLiveSignals ? ["lived-friction signals"] : []),
    ...(!hasHumidity ? ["humidity normals"] : []),
    ...(!hasSunshine ? ["sunshine normals"] : []),
  ];
}

function sourceGapWeight(place: Place): number {
  const confidenceWeight = place.confidence === "low" ? 2 : place.confidence === "moderate" ? 1 : 0;
  return sourceGapLabels(place).length + confidenceWeight;
}

function scoutStep(label: string, profile: CompareDecisionProfile, why: string): CompareScoutStep {
  return {
    label,
    place: profile.place,
    why,
    caveat: caveatRead(profile),
    ...visitWindowRead(profile.place),
  };
}

function pickCounterweight(
  primary: CompareDecisionProfile,
  runnerUp: CompareDecisionProfile | undefined,
  lowestRisk: CompareDecisionProfile,
  comfort: CompareDecisionProfile,
  garden: CompareDecisionProfile,
  longestSeason: CompareDecisionProfile,
  livedEase: CompareDecisionProfile,
): CounterweightRead | null {
  const rankedSignals: CounterweightRead[] = [
    { place: lowestRisk.place, label: "Lower risk", preference: "risk load is the deciding constraint" },
    { place: comfort.place, label: "Comfort", preference: "felt comfort matters more than the blended score" },
    { place: garden.place, label: "Garden", preference: "garden or land fit outranks the broader relocation blend" },
    { place: longestSeason.place, label: "Season runway", preference: "more easy months matter most" },
    { place: livedEase.place, label: "Lived ease", preference: "daily friction is the deciding constraint" },
  ];
  const signal = rankedSignals.find(item => item.place.id !== primary.place.id);
  if (signal) return signal;
  if (!runnerUp) return null;
  return {
    place: runnerUp.place,
    label: "Runner-up",
    preference: "a second all-around option is needed for the shortlist",
  };
}

function buildScoutSequence(
  profiles: readonly CompareDecisionProfile[],
  primary: CompareDecisionProfile,
  counterweight: CounterweightRead | null,
  runnerUp: CompareDecisionProfile | undefined,
  highestRisk: CompareDecisionProfile,
  lensRead: string,
): CompareScoutStep[] {
  const byId = new Map(profiles.map(profile => [profile.place.id, profile]));
  const sequence: CompareScoutStep[] = [];
  const limit = Math.min(3, profiles.length);

  function append(step: CompareScoutStep) {
    if (sequence.length >= limit) return;
    if (sequence.some(existing => existing.place.id === step.place.id)) return;
    sequence.push(step);
  }

  append(scoutStep(
    "Start here",
    primary,
    `Best ${lensRead} finalist; pressure-test this dossier before the rest.`,
  ));

  const counterweightProfile = counterweight ? byId.get(counterweight.place.id) : undefined;
  const counterweightPreference = counterweight?.preference;
  if (counterweightProfile && counterweightPreference) {
    append(scoutStep(
      "Counterweight",
      counterweightProfile,
      `Use this as the tradeoff check if ${counterweightPreference}.`,
    ));
  }

  if (highestRisk.riskLoad - primary.riskLoad >= 10 || highestRisk.riskLoad >= 34) {
    append(scoutStep(
      "Risk check",
      highestRisk,
      "Heaviest risk load in this comparison; verify hazards before ranking it as equivalent.",
    ));
  }

  if (runnerUp) {
    append(scoutStep(
      "Runner-up",
      runnerUp,
      "Second all-around option; keep it warm if the first read exposes a dealbreaker.",
    ));
  }

  return sequence;
}

function buildDecisionTableRows(
  profiles: readonly CompareDecisionProfile[],
  primary: CompareDecisionProfile,
  counterweight: CounterweightRead | null,
  scoutSequence: readonly CompareScoutStep[],
  lens: ComparisonLensId,
): CompareDecisionTableRow[] {
  const sequenceRank = new Map(scoutSequence.map((step, index) => [step.place.id, index]));
  const sequenceRole = new Map(scoutSequence.map(step => [step.place.id, step.label]));

  return [...profiles]
    .sort((a, b) => {
      const aSeq = sequenceRank.get(a.place.id);
      const bSeq = sequenceRank.get(b.place.id);
      if (aSeq != null || bSeq != null) return (aSeq ?? Number.POSITIVE_INFINITY) - (bSeq ?? Number.POSITIVE_INFINITY);
      return compareLensScore(b, lens) - compareLensScore(a, lens) || profileNameTie(a, b);
    })
    .map(profile => {
      const visit = visitWindowRead(profile.place);
      const role = profile.place.id === primary.place.id
        ? "Start here"
        : sequenceRole.get(profile.place.id)
          ?? (counterweight?.place.id === profile.place.id ? counterweight.label : "Keep warm");
      return {
        place: profile.place,
        role,
        decisionScore: compareLensScore(profile, lens),
        fitSummary: `${profile.liveFitScore}/100 fit · ${profile.easyMonths}/12 easy months`,
        riskSummary: `${profile.riskLoad}/100 risk`,
        visitWindow: visit.visitWindow,
        watch: caveatRead(profile),
      };
    });
}

function buildVerificationChecklist(
  profiles: readonly CompareDecisionProfile[],
  primary: CompareDecisionProfile,
  counterweight: CounterweightRead | null,
  highestRisk: CompareDecisionProfile,
  lensRead: string,
): CompareVerificationItem[] {
  const lowestLivedEase = pickProfile(profiles, profile => profile.livedEase, "asc");
  const weakestEvidence = [...profiles].sort((a, b) => {
    const gapDiff = sourceGapWeight(b.place) - sourceGapWeight(a.place);
    if (gapDiff !== 0) return gapDiff;
    return profileNameTie(a, b);
  })[0]!;
  const visit = visitWindowRead(primary.place);
  const items: CompareVerificationItem[] = [
    {
      id: "scout-window",
      label: "Scout window",
      place: primary.place,
      action: `Start with ${visit.visitWindow}; use that season to test the ${lensRead} promise.`,
      proof: "Confirm heat, rain, smoke, daylight, and lodging logistics against the dossier before dates harden.",
      tone: "book",
    },
  ];

  if (counterweight) {
    items.push({
      id: "counterweight",
      label: "Tradeoff check",
      place: counterweight.place,
      action: `Compare ${counterweight.place.name} before locking travel if ${counterweight.preference}.`,
      proof: "Use the same dates, errands, neighborhood walk, and housing notes so the tradeoff is not just a ranking-table read.",
      tone: "book",
    });
  }

  items.push({
    id: "hazard",
    label: "Hazard check",
    place: highestRisk.place,
    action: `Resolve ${highestRisk.place.name}'s hardest risk before it stays equivalent to the leader.`,
    proof: caveatRead(highestRisk),
    tone: highestRisk.riskLoad >= 34 ? "verify" : "book",
  });

  items.push({
    id: "daily-life",
    label: "Daily-life friction",
    place: lowestLivedEase.place,
    action: `Stress-test ${lowestLivedEase.place.name} for errands, housing, health care, internet, and social fit before calling it move-ready.`,
    proof: `${lowestLivedEase.livedEase}/100 lived-ease read; a visit should prove the friction is tolerable, not just scenic.`,
    tone: lowestLivedEase.livedEase < 60 ? "verify" : "book",
  });

  const sourceGaps = sourceGapLabels(weakestEvidence.place);
  items.push({
    id: "source-gap",
    label: "Source gap",
    place: weakestEvidence.place,
    action: sourceGaps.length
      ? `Source-check ${weakestEvidence.place.name} before using it as a travel or moving anchor.`
      : `Keep ${weakestEvidence.place.name}'s evidence profile attached to the comparison packet.`,
    proof: sourceGaps.length
      ? `Verify ${sourceGaps.slice(0, 3).join(", ")} before booking around this finalist.`
      : "No major source gap is visible in the current profile; still verify parcel-level hazards and local logistics.",
    tone: sourceGaps.length >= 3 ? "source" : sourceGaps.length > 0 ? "verify" : "book",
  });

  return items;
}

export function buildCompareDecisionRead(
  profiles: readonly CompareDecisionProfile[],
  lens: ComparisonLensId = DEFAULT_COMPARISON_LENS,
): CompareDecisionRead | null {
  if (profiles.length < 2) return null;

  const byLens = [...profiles].sort((a, b) => compareLensScore(b, lens) - compareLensScore(a, lens) || profileNameTie(a, b));
  const primary = byLens[0]!;
  const runnerUp = byLens.find(profile => profile.place.id !== primary.place.id);
  const lowestRisk = pickProfile(profiles, profile => profile.riskLoad, "asc");
  const comfort = pickProfile(profiles, profile => profile.feltComfort);
  const garden = pickProfile(profiles, profile => profile.place.scores.growability);
  const longestSeason = pickProfile(profiles, profile => profile.easyMonths);
  const livedEase = pickProfile(profiles, profile => profile.livedEase);
  const highestRisk = pickProfile(profiles, profile => profile.riskLoad);
  const counterweight = pickCounterweight(primary, runnerUp, lowestRisk, comfort, garden, longestSeason, livedEase);
  const lensRead = lens === DEFAULT_COMPARISON_LENS ? "all-around" : `${comparisonLensLabel(lens).toLowerCase()}-lens`;
  const scoutSequence = buildScoutSequence(profiles, primary, counterweight, runnerUp, highestRisk, lensRead);
  const tableRows = buildDecisionTableRows(profiles, primary, counterweight, scoutSequence, lens);
  const verificationChecklist = buildVerificationChecklist(profiles, primary, counterweight, highestRisk, lensRead);

  const landClause = garden.place.id === primary.place.id
    ? `${primary.place.name} also keeps the garden edge`
    : `${garden.place.name} keeps the garden edge`;
  const riskClause = lowestRisk.place.id === primary.place.id
    ? `${primary.place.name} also carries the lowest risk load`
    : `${lowestRisk.place.name} is the lower-risk anchor`;
  const caution = highestRisk.riskLoad - lowestRisk.riskLoad >= 14
    ? `${highestRisk.place.name} carries the heaviest risk load (${highestRisk.riskLoad}/100); read the risk notes before treating it as equivalent.`
    : "Risk loads are close enough that seasonal comfort, access, and lived friction should break the tie.";
  const counterweightClause = counterweight
    ? ` ${counterweight.place.name} is the counterweight if ${counterweight.preference}.`
    : "";

  return {
    primary,
    counterweight,
    summary: `${primary.place.name} is the first finalist to pressure-test (${compareLensScore(primary, lens)}/100 ${lensRead}); ${riskClause}, and ${landClause}.${counterweightClause}`,
    caution,
    nextAction: counterweight
      ? `Open ${primary.place.name}'s dossier first; read ${counterweight.place.name} second if ${counterweight.preference}.`
      : `Open ${primary.place.name}'s dossier first, then add another place to test the tradeoff.`,
    scoutSequence,
    verificationChecklist,
    tableRows,
    lanes: [
      {
        label: lens === DEFAULT_COMPARISON_LENS ? "Broadest fit" : `${comparisonLensLabel(lens)} fit`,
        place: primary.place,
        value: `${compareLensScore(primary, lens)}/100`,
        detail: lens === DEFAULT_COMPARISON_LENS
          ? "Blend of live-fit, livability, felt comfort, lived ease, garden signal, and low-risk margin."
          : `Priority read using the ${comparisonLensLabel(lens).toLowerCase()} comparison lens.`,
      },
      {
        label: "Lowest risk",
        place: lowestRisk.place,
        value: `${lowestRisk.riskLoad}/100`,
        detail: "Composite hazard load; lower is easier to underwrite before deeper research.",
      },
      {
        label: "Comfort leader",
        place: comfort.place,
        value: `${comfort.feltComfort}/100`,
        detail: "Human-felt thermal and atmospheric comfort signal.",
      },
      {
        label: "Garden edge",
        place: garden.place,
        value: `${garden.place.scores.growability}/100`,
        detail: `Season runway check: ${longestSeason.place.name} has ${longestSeason.easyMonths}/12 easy months.`,
      },
    ],
  };
}
