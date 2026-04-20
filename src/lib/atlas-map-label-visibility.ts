import type { Place, Tier } from "../types";

/** How much typography to draw next to a pin (pins are always visible). */
export type MapPinLabelMode = "hidden" | "compact" | "full";

const TIER_RANK: Record<Tier, number> = { A: 3, B: 2, C: 1 };

function bucketOf(x: number, y: number, cell: number): string {
  return `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
}

function priority(place: Place): number {
  return TIER_RANK[place.tier] * 1_000_000 - place.name.length;
}

/**
 * Pick at most one “label slot” per map cell so names do not stack into unreadable soup.
 * Selected and hovered pins always get a full label; everyone else follows zoom + grid rules.
 *
 * Map coordinates are projected SVG units (same space as pan/zoom `translate/scale`).
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

  // Smaller cells when zoomed in → more winners, still one label per cell.
  const cell = Math.max(22, 58 / Math.sqrt(Math.max(0.35, mapZoomK)));

  const winnerByBucket = new Map<string, string>();
  const winnerPri = new Map<string, number>();

  for (const { place, x, y } of pts) {
    const b = bucketOf(x, y, cell);
    const pri = priority(place);
    const cur = winnerByBucket.get(b);
    if (cur === undefined) {
      winnerByBucket.set(b, place.id);
      winnerPri.set(b, pri);
      continue;
    }
    const curPri = winnerPri.get(b) ?? -Infinity;
    if (pri > curPri || (pri === curPri && place.id < cur)) {
      winnerByBucket.set(b, place.id);
      winnerPri.set(b, pri);
    }
  }

  const winners = new Set(winnerByBucket.values());

  for (const { place } of pts) {
    if (alwaysFull.has(place.id)) continue;
    if (winners.has(place.id)) {
      out.set(place.id, mapZoomK >= 1.18 ? "full" : "compact");
    } else {
      out.set(place.id, "hidden");
    }
  }

  for (const { place } of pts) {
    if (!out.has(place.id)) out.set(place.id, "hidden");
  }

  return out;
}
