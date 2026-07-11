import type { Place, Tier } from "../types";
import type { MapViewState } from "./atlas-map-fit";
import { placeMapSecondaryLine } from "./atlas-map-label";

/** How much typography to draw next to a pin (pins are always visible). */
export type MapPinLabelMode = "hidden" | "compact" | "full";

const TIER_RANK: Record<Tier, number> = { A: 3, B: 2, C: 1 };

export interface MapPinLabelOptions {
  viewportWidth: number;
  viewportHeight: number;
  featuredRankById?: ReadonlyMap<string, number>;
}

function priority(place: Place, featuredRank?: number): number {
  const featuredBoost = featuredRank ? (10 - featuredRank) * 1_000_000 : 0;
  return featuredBoost + TIER_RANK[place.tier] * 100_000 - place.name.length;
}

interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function estimateLabelBox(
  place: Place,
  screenX: number,
  screenY: number,
  mode: MapPinLabelMode,
  side: "left" | "right",
  mapZoomK: number,
  emphasized: boolean,
): LabelBox {
  const titleLimit =
    mode === "compact"
      ? 16
      : emphasized
        ? 120
        : mapZoomK >= 1.65
          ? 56
          : Math.max(12, Math.min(30, Math.floor(11 + mapZoomK * 11)));
  const titleWidth = Math.min(place.name.length, titleLimit) * (mode === "compact" ? 6.7 : 7.2) + 22;
  const secondaryWidth = mode === "full" ? placeMapSecondaryLine(place).length * 5.8 + 22 : 0;
  const width = Math.min(
    mode === "full" ? 320 : 168,
    Math.max(mode === "full" ? 104 : 72, titleWidth, secondaryWidth),
  );
  const height = mode === "full" ? (emphasized || mapZoomK >= 1.65 ? 54 : 40) : 24;
  const gap = mode === "full" ? 13 : 11;
  const left = side === "right" ? screenX + gap : screenX - gap - width;
  return {
    left,
    right: left + width,
    top: screenY - height / 2,
    bottom: screenY + height / 2,
  };
}

function intersects(a: LabelBox, b: LabelBox, gutter: number): boolean {
  return !(
    a.right + gutter < b.left ||
    a.left - gutter > b.right ||
    a.bottom + gutter < b.top ||
    a.top - gutter > b.bottom
  );
}

function candidateMode(place: Place, mapZoomK: number, featuredRank?: number): MapPinLabelMode {
  if (featuredRank) return mapZoomK >= 1.25 ? "full" : mapZoomK >= 0.72 ? "compact" : "hidden";
  if (mapZoomK < 1.05) return "hidden";
  if (mapZoomK < 1.28) return place.tier === "A" ? "compact" : "hidden";
  if (mapZoomK < 1.55) return place.tier === "C" ? "hidden" : "compact";
  if (mapZoomK < 1.85) return place.tier === "C" ? "compact" : "full";
  return "full";
}

function labelSide(screenX: number, viewportWidth: number): "left" | "right" {
  return screenX > viewportWidth * 0.62 ? "left" : "right";
}

/**
 * Pick readable labels in screen-pixel space so visually displaced pins do not
 * stack names after the map transform is applied.
 *
 * Selected and hovered pins always get a full label; everyone else follows zoom + collision rules.
 * Input coordinates are projected SVG units after any visual pin displacement.
 */
export function computePinLabelModes(
  pts: readonly { place: Place; x: number; y: number }[],
  view: MapViewState,
  selectedId: string | undefined,
  hoverId: string | null | undefined,
  opts: MapPinLabelOptions,
): ReadonlyMap<string, MapPinLabelMode> {
  const out = new Map<string, MapPinLabelMode>();
  const alwaysFull = new Set<string>();
  const mapZoomK = view.k;

  if (selectedId) {
    out.set(selectedId, "full");
    alwaysFull.add(selectedId);
  }
  if (hoverId) {
    out.set(hoverId, "full");
    alwaysFull.add(hoverId);
  }

  if (pts.length === 0) return out;

  // Continent-scale: only the engaged pin shows text; everything else stays a clean glyph field.
  if (mapZoomK < 0.48) {
    for (const { place } of pts) {
      if (!alwaysFull.has(place.id)) out.set(place.id, "hidden");
    }
    return out;
  }

  const accepted: LabelBox[] = [];
  const byId = new Map(pts.map(pt => [pt.place.id, pt]));
  const gutter = mapZoomK < 1.28 ? 22 : mapZoomK < 1.55 ? 16 : 9;
  const viewportPad = 28;

  for (const id of alwaysFull) {
    const pt = byId.get(id);
    if (!pt) continue;
    const screenX = pt.x * view.k + view.x;
    const screenY = pt.y * view.k + view.y;
    accepted.push(estimateLabelBox(
      pt.place,
      screenX,
      screenY,
      "full",
      labelSide(screenX, opts.viewportWidth),
      mapZoomK,
      true,
    ));
  }

  const candidates = pts
    .filter(({ place }) => !alwaysFull.has(place.id))
    .map(pt => ({
      ...pt,
      mode: candidateMode(pt.place, mapZoomK, opts.featuredRankById?.get(pt.place.id)),
      screenX: pt.x * view.k + view.x,
      screenY: pt.y * view.k + view.y,
      featuredRank: opts.featuredRankById?.get(pt.place.id),
      score: priority(pt.place, opts.featuredRankById?.get(pt.place.id)),
    }))
    .filter(pt => pt.mode !== "hidden")
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id));

  for (const pt of candidates) {
    if (
      pt.screenX < -viewportPad ||
      pt.screenX > opts.viewportWidth + viewportPad ||
      pt.screenY < -viewportPad ||
      pt.screenY > opts.viewportHeight + viewportPad
    ) {
      out.set(pt.place.id, "hidden");
      continue;
    }
    const box = estimateLabelBox(
      pt.place,
      pt.screenX,
      pt.screenY,
      pt.mode,
      labelSide(pt.screenX, opts.viewportWidth),
      mapZoomK,
      Boolean(pt.featuredRank),
    );
    if (accepted.some(other => intersects(box, other, gutter))) {
      out.set(pt.place.id, "hidden");
      continue;
    }
    accepted.push(box);
    out.set(pt.place.id, pt.mode);
  }

  for (const { place } of pts) {
    if (!out.has(place.id)) out.set(place.id, "hidden");
  }

  return out;
}
