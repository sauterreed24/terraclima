import type { Place } from "../types";
import { annualComfortMonthCount, avgRisk } from "./climate-metrics";
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
  lanes: CompareDecisionLane[];
}

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
