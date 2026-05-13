import { ARCHETYPE_BY_ID } from "../data/archetypes";
import type { Place } from "../types";
import { scorePlaceFeel, type PlaceFeelComponent, type PlaceFeelComponentKey } from "./place-feel";

type SignatureAxisMeta = {
  label: string;
  shortLabel: string;
  color: string;
  rgb: string;
};

const AXIS_META: Record<PlaceFeelComponentKey, SignatureAxisMeta> = {
  sensoryComfort: {
    label: "Sensory comfort",
    shortLabel: "Comfort",
    color: "#5ec4dc",
    rgb: "94, 196, 220",
  },
  dailyEase: {
    label: "Daily ease",
    shortLabel: "Ease",
    color: "#67b96f",
    rgb: "103, 185, 111",
  },
  placeIdentity: {
    label: "Place identity",
    shortLabel: "Identity",
    color: "#e3a63b",
    rgb: "227, 166, 59",
  },
  scoutingClarity: {
    label: "Scouting clarity",
    shortLabel: "Clarity",
    color: "#ad8cff",
    rgb: "173, 140, 255",
  },
};

const FEEL_DASH: Record<ReturnType<typeof scorePlaceFeel>["band"], string> = {
  Exceptional: "none",
  Easy: "6 2.5",
  Textured: "3 2.5",
  Demanding: "1.6 3.2",
  Hard: "1 4",
};

export interface PlaceVisualSignature {
  primaryLabel: string;
  primaryTone: string;
  primaryBlurb: string;
  feelBand: ReturnType<typeof scorePlaceFeel>["band"];
  feelScore: number;
  strength: PlaceFeelComponent & SignatureAxisMeta;
  verify: PlaceFeelComponent & SignatureAxisMeta;
  mapLabel: string;
  mapAccentColor: string;
  mapAccentRgb: string;
  mapDash: string;
}

function mergeAxisMeta(component: PlaceFeelComponent): PlaceFeelComponent & SignatureAxisMeta {
  return { ...component, ...AXIS_META[component.key] };
}

export function getPlaceVisualSignature(place: Place): PlaceVisualSignature {
  const primary = place.archetypes[0] ? ARCHETYPE_BY_ID[place.archetypes[0]] : null;
  const feel = scorePlaceFeel(place);
  const sorted = [...feel.components].sort((a, b) => b.value - a.value);
  const strength = mergeAxisMeta(sorted[0]!);
  const verify = mergeAxisMeta(sorted[sorted.length - 1]!);

  return {
    primaryLabel: primary?.label ?? "Microclimate index",
    primaryTone: primary?.tone ?? "ice",
    primaryBlurb: primary?.blurb ?? "Distinct climate signal in the atlas.",
    feelBand: feel.band,
    feelScore: feel.score,
    strength,
    verify,
    mapLabel: `${feel.band} ${feel.score} | ${strength.shortLabel}`,
    mapAccentColor: strength.color,
    mapAccentRgb: strength.rgb,
    mapDash: FEEL_DASH[feel.band],
  };
}
