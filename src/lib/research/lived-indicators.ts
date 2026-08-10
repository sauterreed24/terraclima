/**
 * Transparent lived-indicator indices from dated factual inputs.
 * No imputation: missing inputs stay missing; scores renormalize over
 * available components and expose coverage.
 */

import type { LivedSignals, Place, TransportConstraint } from "../../types";

export const ACCESS_REMOTENESS_THRESHOLDS = {
  /** Minutes to hospital: full remoteness credit at/above this. */
  hospitalSevereMinutes: 90,
  hospitalModerateMinutes: 45,
  hospitalLocalMinutes: 20,
  /** Minutes to commercial airport. */
  airportSevereMinutes: 180,
  airportModerateMinutes: 90,
  airportLocalMinutes: 45,
} as const;

export function accessRemotenessFromMinutes(
  hospitalRouteMinutes: number | undefined,
  airportRouteMinutes: number | undefined,
  transportConstraints: readonly TransportConstraint[] | undefined,
): { index: number | undefined; coverage: number } {
  const parts: number[] = [];
  if (hospitalRouteMinutes != null) {
    parts.push(minutesToRemoteness(hospitalRouteMinutes, "hospital"));
  }
  if (airportRouteMinutes != null) {
    parts.push(minutesToRemoteness(airportRouteMinutes, "airport"));
  }
  if (parts.length === 0) return { index: undefined, coverage: 0 };

  let index = parts.reduce((a, b) => a + b, 0) / parts.length;
  if (transportConstraints?.includes("ferry-only")) index = Math.min(100, index + 18);
  if (transportConstraints?.includes("seasonal-road")) index = Math.min(100, index + 12);
  if (transportConstraints?.includes("single-access-road")) index = Math.min(100, index + 8);
  return { index: Math.round(index), coverage: parts.length };
}

function minutesToRemoteness(minutes: number, kind: "hospital" | "airport"): number {
  const t = kind === "hospital"
    ? ACCESS_REMOTENESS_THRESHOLDS
    : {
        hospitalSevereMinutes: ACCESS_REMOTENESS_THRESHOLDS.airportSevereMinutes,
        hospitalModerateMinutes: ACCESS_REMOTENESS_THRESHOLDS.airportModerateMinutes,
        hospitalLocalMinutes: ACCESS_REMOTENESS_THRESHOLDS.airportLocalMinutes,
      };
  if (minutes <= t.hospitalLocalMinutes) return Math.max(0, (minutes / t.hospitalLocalMinutes) * 25);
  if (minutes <= t.hospitalModerateMinutes) {
    const span = t.hospitalModerateMinutes - t.hospitalLocalMinutes;
    return 25 + ((minutes - t.hospitalLocalMinutes) / span) * 35;
  }
  if (minutes <= t.hospitalSevereMinutes) {
    const span = t.hospitalSevereMinutes - t.hospitalModerateMinutes;
    return 60 + ((minutes - t.hospitalModerateMinutes) / span) * 30;
  }
  return 100;
}

/**
 * Within-country percentile (0..100) of a numeric housing metric.
 * Higher = more pressure. Returns undefined when fewer than 2 peers have data.
 */
export function housingPressurePercentile(
  placeId: string,
  countryValues: ReadonlyArray<{ id: string; value: number }>,
): number | undefined {
  const self = countryValues.find(v => v.id === placeId);
  if (!self || countryValues.length < 2) return undefined;
  const sorted = [...countryValues].sort((a, b) => a.value - b.value);
  const rank = sorted.findIndex(v => v.id === placeId);
  if (rank < 0) return undefined;
  return Math.round((rank / (sorted.length - 1)) * 100);
}

/** Prefer factual indices; fall back to legacy cost/access only when indices absent. */
export function effectiveHousingPressure(ls: LivedSignals | undefined): number | undefined {
  if (!ls) return undefined;
  if (ls.housingPressureIndex != null) return ls.housingPressureIndex;
  return ls.costPressure;
}

export function effectiveAccessRemoteness(ls: LivedSignals | undefined): number | undefined {
  if (!ls) return undefined;
  if (ls.accessRemotenessIndex != null) return ls.accessRemotenessIndex;
  if (ls.hospitalRouteMinutes != null || ls.airportRouteMinutes != null) {
    return accessRemotenessFromMinutes(
      ls.hospitalRouteMinutes,
      ls.airportRouteMinutes,
      ls.transportConstraints,
    ).index;
  }
  return ls.accessFriction;
}

/** Strip deprecated socialStress from a liveSignals object. */
export function sanitizeLivedSignals(ls: LivedSignals | undefined): LivedSignals | undefined {
  if (!ls) return undefined;
  const { socialStress: _removed, ...rest } = ls;
  void _removed;
  return rest;
}

export function sanitizePlaceLivedSignals(place: Place): Place {
  if (!place.liveSignals) return place;
  return { ...place, liveSignals: sanitizeLivedSignals(place.liveSignals) };
}
