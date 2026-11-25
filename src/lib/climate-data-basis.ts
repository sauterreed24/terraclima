// ============================================================
// Terraclima — How a place's climate figures were checked
// ============================================================
//
// Every place's normals come from the Daymet 1 km grid. Some were corrected to
// a weather station beside the place; some sit where stations disagree with
// the grid for a known reason; the rest have no nearby station to check
// against. Readers see this next to the figures, so a "high confidence"
// rating of the written sources is never read as a check of the numbers.
// ============================================================

import { CLIMATE_V2_OVERLAY_BY_ID } from "../data/generated/climate-v2";
import type { Confidence, Place } from "../types";

export interface ClimateDataBasis {
  status: "validated" | "reviewed-exception" | "grid-only" | "unknown";
  /** Short label for the normals header and Compare. */
  label: string;
  /** One sentence for a tooltip or the Evidence panel. */
  detail: string;
}

export function climateDataBasis(place: Pick<Place, "id">): ClimateDataBasis {
  switch (CLIMATE_V2_OVERLAY_BY_ID[place.id]?.validationStatus) {
    case "validated":
      return {
        status: "validated",
        label: "station-checked",
        detail: "Grid figures corrected to a weather station beside the place.",
      };
    case "reviewed-exception":
      return {
        status: "reviewed-exception",
        label: "checked, with caveats",
        detail: "Nearby stations differ from the grid for a known reason (terrain, coast or distance); local figures may be off by a few degrees.",
      };
    case "grid-only":
      return {
        status: "grid-only",
        label: "grid estimate",
        detail: "From a 1 km climate grid; no weather station near enough to check it against.",
      };
    default:
      return { status: "unknown", label: "source pending", detail: "Climate figures not yet matched to a source record." };
  }
}

const CONFIDENCE_ORDER: readonly Confidence[] = ["low", "moderate", "high"];

/**
 * The confidence a single badge may claim for a place: the lower of the
 * sources rating and the climate-data rating.
 */
export function overallConfidence(place: Pick<Place, "confidence" | "climateDataConfidence">): Confidence {
  const sources = CONFIDENCE_ORDER.indexOf(place.confidence);
  const data = place.climateDataConfidence ? CONFIDENCE_ORDER.indexOf(place.climateDataConfidence) : sources;
  return CONFIDENCE_ORDER[Math.max(0, Math.min(sources, data))]!;
}
