import type { Place } from "../types";
import { COMPARE_LIMIT } from "./app-url";
import { blendedCompareScore, buildCompareDecisionProfiles, buildCompareDecisionRead } from "./compare-finalist-verdict";

export interface ShortlistPacketCue {
  compareIds: string[];
  primary: Place;
  counterweight: Place | null;
  summary: string;
  watch: string;
  primaryScore: number;
}

export function buildShortlistPacketCue(
  places: readonly Place[],
  compareLimit = COMPARE_LIMIT,
): ShortlistPacketCue | null {
  const comparePlaces = places.slice(0, compareLimit);
  if (comparePlaces.length < 2) return null;

  const read = buildCompareDecisionRead(buildCompareDecisionProfiles(comparePlaces));
  if (!read) return null;

  const primaryRow = read.tableRows.find(row => row.place.id === read.primary.place.id);
  return {
    compareIds: comparePlaces.map(place => place.id),
    primary: read.primary.place,
    counterweight: read.counterweight?.place ?? null,
    summary: read.summary,
    watch: primaryRow?.watch ?? read.scoutSequence[0]?.caveat ?? read.caution,
    primaryScore: blendedCompareScore(read.primary),
  };
}
