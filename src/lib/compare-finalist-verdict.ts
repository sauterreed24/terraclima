import type { Place } from "../types";
import { getBestMonths } from "./best-months";
import { annualComfortMonthCount, avgRisk, RISK_VALUE } from "./climate-metrics";
import { assessLiveFit, type LiveFitFilters } from "./live-fit";
import { feltComfortScore, livedFrictionScore, scoreLivability } from "./livability-score";

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
    "Best all-around finalist; pressure-test this dossier before the rest.",
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
): CompareDecisionTableRow[] {
  const sequenceRank = new Map(scoutSequence.map((step, index) => [step.place.id, index]));
  const sequenceRole = new Map(scoutSequence.map(step => [step.place.id, step.label]));

  return [...profiles]
    .sort((a, b) => {
      const aSeq = sequenceRank.get(a.place.id);
      const bSeq = sequenceRank.get(b.place.id);
      if (aSeq != null || bSeq != null) return (aSeq ?? Number.POSITIVE_INFINITY) - (bSeq ?? Number.POSITIVE_INFINITY);
      return blendedCompareScore(b) - blendedCompareScore(a) || profileNameTie(a, b);
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
        decisionScore: blendedCompareScore(profile),
        fitSummary: `${profile.liveFitScore}/100 fit · ${profile.easyMonths}/12 easy months`,
        riskSummary: `${profile.riskLoad}/100 risk`,
        visitWindow: visit.visitWindow,
        watch: caveatRead(profile),
      };
    });
}

export function buildCompareDecisionRead(
  profiles: readonly CompareDecisionProfile[],
): CompareDecisionRead | null {
  if (profiles.length < 2) return null;

  const byBlend = [...profiles].sort((a, b) => blendedCompareScore(b) - blendedCompareScore(a) || profileNameTie(a, b));
  const primary = byBlend[0]!;
  const runnerUp = byBlend.find(profile => profile.place.id !== primary.place.id);
  const lowestRisk = pickProfile(profiles, profile => profile.riskLoad, "asc");
  const comfort = pickProfile(profiles, profile => profile.feltComfort);
  const garden = pickProfile(profiles, profile => profile.place.scores.growability);
  const longestSeason = pickProfile(profiles, profile => profile.easyMonths);
  const livedEase = pickProfile(profiles, profile => profile.livedEase);
  const highestRisk = pickProfile(profiles, profile => profile.riskLoad);
  const counterweight = pickCounterweight(primary, runnerUp, lowestRisk, comfort, garden, longestSeason, livedEase);
  const scoutSequence = buildScoutSequence(profiles, primary, counterweight, runnerUp, highestRisk);
  const tableRows = buildDecisionTableRows(profiles, primary, counterweight, scoutSequence);

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
    summary: `${primary.place.name} is the first finalist to pressure-test (${blendedCompareScore(primary)}/100 all-around); ${riskClause}, and ${landClause}.${counterweightClause}`,
    caution,
    nextAction: counterweight
      ? `Open ${primary.place.name}'s dossier first; read ${counterweight.place.name} second if ${counterweight.preference}.`
      : `Open ${primary.place.name}'s dossier first, then add another place to test the tradeoff.`,
    scoutSequence,
    tableRows,
    lanes: [
      {
        label: "Broadest fit",
        place: primary.place,
        value: `${blendedCompareScore(primary)}/100`,
        detail: "Blend of live-fit, livability, felt comfort, lived ease, garden signal, and low-risk margin.",
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
