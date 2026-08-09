/**
 * Load authored Place climate *before* Climate V2 overlay for shadow diffs.
 */

import type { Place } from "../../src/types";
import { PLACES_USA } from "../../src/data/places.usa";
import { PLACES_CANADA } from "../../src/data/places.canada";
import { PLACES_MEXICO } from "../../src/data/places.mexico";
import { TIER_C_POLISH, TIER_C_POLISH_GENERATED } from "../../src/data/places.tier-c-polish";

const POLISH = { ...TIER_C_POLISH, ...TIER_C_POLISH_GENERATED };

function applyPolishOnly(p: Place): Place {
  const polish = POLISH[p.id as keyof typeof POLISH] as
    | { climate?: { humidity?: Place["climate"]["humidity"]; sunshinePct?: Place["climate"]["sunshinePct"] } }
    | undefined;
  if (!polish?.climate) return p;
  return {
    ...p,
    climate: {
      ...p.climate,
      ...(polish.climate.humidity != null && p.climate.humidity == null
        ? { humidity: polish.climate.humidity }
        : {}),
      ...(polish.climate.sunshinePct != null && p.climate.sunshinePct == null
        ? { sunshinePct: polish.climate.sunshinePct }
        : {}),
    },
  };
}

/** Authored + polish humidity/sunshine, without Daymet V2 overlay. */
export const AUTHORED_PLACES: Place[] = [
  ...PLACES_USA,
  ...PLACES_CANADA,
  ...PLACES_MEXICO,
].map(applyPolishOnly);
