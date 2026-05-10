import type { Place, Tier } from "../types";

/** How much typography to draw next to a pin (pins are always visible). */
export type MapPinLabelMode = "hidden" | "compact" | "full";

const TIER_RANK: Record<Tier, number> = { A: 3, B: 2, C: 1 };

function priority(place: Place): number {
  return TIER_RANK[place.tier] * 1_000_000 - place.name.length;
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
  mode: MapPinLabelMode
): LabelBox {
  const nameWidth = Math.min(184, Math.max(72, place.name.length * 7.2));
  const width = mode === "full" ? nameWidth + 58 : Math.min(136, nameWidth + 36);
  const height = mode === "full" ? 42 : 24;
  return {
    left: screenX - width / 2,
    right: screenX + width / 2,
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

function candidateMode(place: Place, mapZoomK: number): MapPinLabelMode {
  if (mapZoomK < 0.48) return "hidden";
  if (mapZoomK < 0.86 && place.tier !== "A") return "hidden";
  if (mapZoomK < 1.02 && place.tier === "C") return "hidden";
  return mapZoomK >= 1.18 ? "full" : "compact";
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
  mapZoomK: number,
  selectedId: string | undefined,
  hoverId: string | null | undefined
): ReadonlyMap<string, MapPinLabelMode> {
  const out = new Map<string, MapPinLabelMode>();
  const alwaysFull = new Set<string>();

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
  const gutter = mapZoomK < 0.86 ? 18 : mapZoomK < 1.18 ? 12 : 8;

  for (const id of alwaysFull) {
    const pt = byId.get(id);
    if (!pt) continue;
    accepted.push(estimateLabelBox(pt.place, pt.x * mapZoomK, pt.y * mapZoomK, "full"));
  }

  const candidates = pts
    .filter(({ place }) => !alwaysFull.has(place.id))
    .map(pt => ({
      ...pt,
      mode: candidateMode(pt.place, mapZoomK),
      screenX: pt.x * mapZoomK,
      screenY: pt.y * mapZoomK,
      score: priority(pt.place),
    }))
    .filter(pt => pt.mode !== "hidden")
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id));

  for (const pt of candidates) {
    const box = estimateLabelBox(pt.place, pt.screenX, pt.screenY, pt.mode);
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
