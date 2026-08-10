/**
 * Screen-space rank-badge placement for featured atlas pins.
 *
 * Glyph collision spread already moves markers apart, but badges historically
 * locked to the upper-right of each glyph — so Central Mexico comfort leaders
 * still stacked callouts at regional zoom. This helper fans badges on a radial
 * orbit when neighbors are close, keeping leader lines on the geo anchors.
 */

export interface RankBadgeLayoutInput {
  id: string;
  /** Pin glyph center in screen pixels. */
  screenX: number;
  screenY: number;
  /** Featured rank (1 = leader). */
  rank: number;
  /** Approximate glyph radius in screen pixels (pre-inverse-scale). */
  pinRadiusPx: number;
  crowded?: boolean;
}

export interface RankBadgeOffset {
  id: string;
  /** Offset from glyph center in the inverse-scaled marker local space. */
  dx: number;
  dy: number;
  /** True when the default NE seat was abandoned for collision avoidance. */
  fanned: boolean;
}

export interface RankBadgeLayoutOptions {
  /** Minimum center-to-center spacing between badges in screen px. */
  minSpacingPx?: number;
  /** Neighbor search radius; pins farther apart keep the default NE badge. */
  proximityPx?: number;
}

const DEFAULT_MIN_SPACING_PX = 20;
const DEFAULT_PROXIMITY_PX = 56;

/** Classic NE callout seat used when density is low. */
export function defaultRankBadgeOffset(pinRadiusPx: number): { dx: number; dy: number } {
  const r = Math.max(3, pinRadiusPx);
  return { dx: r + 12, dy: -(r + 13) };
}

function hashAngle(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 3600) / 3600 * Math.PI * 2;
}

function badgeOrbitRadius(pinRadiusPx: number): number {
  return Math.max(14, pinRadiusPx + 13.5);
}

function offsetAtAngle(pinRadiusPx: number, angleRad: number): { dx: number; dy: number } {
  const orbit = badgeOrbitRadius(pinRadiusPx);
  return {
    dx: Math.cos(angleRad) * orbit,
    dy: Math.sin(angleRad) * orbit,
  };
}

/**
 * Assign badge offsets so nearby featured ranks do not stack on the same seat.
 * Deterministic: higher ranks claim preferred angles first; ties break by id.
 */
export function layoutRankBadges(
  pins: readonly RankBadgeLayoutInput[],
  opts: RankBadgeLayoutOptions = {},
): RankBadgeOffset[] {
  if (pins.length === 0) return [];

  const minSpacing = opts.minSpacingPx ?? DEFAULT_MIN_SPACING_PX;
  const proximity = opts.proximityPx ?? DEFAULT_PROXIMITY_PX;
  const ordered = [...pins].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.id.localeCompare(b.id);
  });

  const needsFan = new Set<string>();
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      const dist = Math.hypot(a.screenX - b.screenX, a.screenY - b.screenY);
      if (dist < proximity || a.crowded || b.crowded) {
        needsFan.add(a.id);
        needsFan.add(b.id);
      }
    }
  }
  // Solo crowded pin (glyph cluster with non-featured neighbors) still fans
  // slightly so the badge clears the dense glyph cloud.
  for (const pin of ordered) {
    if (pin.crowded) needsFan.add(pin.id);
  }

  const placed: { id: string; x: number; y: number; dx: number; dy: number; fanned: boolean }[] = [];

  for (const pin of ordered) {
    const fallback = defaultRankBadgeOffset(pin.pinRadiusPx);
    if (!needsFan.has(pin.id)) {
      placed.push({
        id: pin.id,
        x: pin.screenX + fallback.dx,
        y: pin.screenY + fallback.dy,
        dx: fallback.dx,
        dy: fallback.dy,
        fanned: false,
      });
      continue;
    }

    // Prefer a rank-indexed fan around the NE seat, then hashed backups.
    const preferred: number[] = [];
    const rankPhase = ((pin.rank - 1) % 8) * (Math.PI / 4) - Math.PI / 4;
    preferred.push(rankPhase);
    for (let step = 1; step <= 7; step += 1) {
      preferred.push(rankPhase + step * (Math.PI / 4));
    }
    preferred.push(hashAngle(pin.id));

    let best = { dx: fallback.dx, dy: fallback.dy, score: -Infinity };
    for (const angle of preferred) {
      const offset = offsetAtAngle(pin.pinRadiusPx, angle);
      const bx = pin.screenX + offset.dx;
      const by = pin.screenY + offset.dy;
      let minDist = Infinity;
      for (const other of placed) {
        minDist = Math.min(minDist, Math.hypot(bx - other.x, by - other.y));
      }
      // Prefer seats that clear spacing; break ties toward the classic NE seat.
      const neBias = -Math.hypot(offset.dx - fallback.dx, offset.dy - fallback.dy) * 0.02;
      const score = (minDist === Infinity ? minSpacing * 4 : minDist) + neBias;
      if (score > best.score) {
        best = { dx: offset.dx, dy: offset.dy, score };
      }
      if (minDist >= minSpacing) break;
    }

    placed.push({
      id: pin.id,
      x: pin.screenX + best.dx,
      y: pin.screenY + best.dy,
      dx: best.dx,
      dy: best.dy,
      fanned: true,
    });
  }

  return placed.map(({ id, dx, dy, fanned }) => ({ id, dx, dy, fanned }));
}
