/**
 * Pure roving-tabindex / arrow-key step helpers for the atlas map.
 *
 * The map renders one focusable `<g role="button">` per visible pin. With
 * hundreds of pins on screen, putting `tabIndex={0}` on every marker is
 * hostile to keyboard and screen-reader users — Tab walks through every pin
 * before reaching the next interactive control after the map.
 *
 * Roving-tabindex (WAI-ARIA practices): exactly one marker carries
 * `tabIndex={0}` at a time. Arrow keys move that "current" focus between
 * markers; Tab leaves the marker group entirely. These helpers compute the
 * next marker id for a given keystroke without touching the DOM, so the
 * logic is unit-testable in node and reusable across both the marker layer
 * and the cluster layer.
 *
 * Left/Right walk through visible markers in the render order the caller
 * passes in (rank order at the call site). Up/Down bucket markers by their
 * post-transform screen Y coordinate and target the closest marker by X in
 * the adjacent row, mimicking a 2-D grid feel even though the underlying
 * data is not a grid.
 */
export type AtlasMarkerLayoutPoint = {
  /** Stable id used as the React key + the focus target. */
  id: string;
  /** Post-projection / post-transform screen X (px). */
  x: number;
  /** Post-projection / post-transform screen Y (px). */
  y: number;
};

export type AtlasArrowDirection = "left" | "right" | "up" | "down";

/**
 * Compute the next marker id after an arrow keystroke.
 *
 * - Returns `null` when there are no visible markers.
 * - When `currentId` is null or not in the visible set, returns the first
 *   visible marker (so the first arrow press always lands somewhere sane).
 * - Left/Right wrap circularly through `visible`.
 * - Up/Down find the closest row in the requested direction (bucketed by
 *   `rowBucketPx`) and pick the marker in that row with X nearest the
 *   current marker's X. If no row exists in that direction, the focus
 *   stays on the current marker.
 */
export function nextMarkerId(
  currentId: string | null,
  direction: AtlasArrowDirection,
  visible: readonly AtlasMarkerLayoutPoint[],
  rowBucketPx: number = 56,
): string | null {
  if (visible.length === 0) return null;
  if (currentId == null) return visible[0].id;

  const idx = visible.findIndex(p => p.id === currentId);
  if (idx < 0) return visible[0].id;

  if (direction === "right") {
    return visible[(idx + 1) % visible.length].id;
  }
  if (direction === "left") {
    return visible[(idx - 1 + visible.length) % visible.length].id;
  }

  const current = visible[idx];
  const rowOf = (p: AtlasMarkerLayoutPoint): number =>
    Math.round(p.y / Math.max(1, rowBucketPx));
  const currentRow = rowOf(current);

  const candidates = visible.filter(p => {
    if (p.id === currentId) return false;
    const r = rowOf(p);
    return direction === "down" ? r > currentRow : r < currentRow;
  });
  if (candidates.length === 0) {
    return currentId;
  }

  const targetRow = direction === "down"
    ? Math.min(...candidates.map(rowOf))
    : Math.max(...candidates.map(rowOf));
  const inRow = candidates.filter(p => rowOf(p) === targetRow);
  inRow.sort((a, b) => {
    const dx = Math.abs(a.x - current.x) - Math.abs(b.x - current.x);
    if (dx !== 0) return dx;
    // Tiebreak by id so the result is deterministic.
    return a.id.localeCompare(b.id);
  });
  return inRow[0]?.id ?? currentId;
}

/**
 * Home → first visible marker. End → last visible marker.
 *
 * Returns null only when there are no visible markers.
 */
export function endpointMarkerId(
  position: "home" | "end",
  visible: readonly AtlasMarkerLayoutPoint[],
): string | null {
  if (visible.length === 0) return null;
  return position === "home" ? visible[0].id : visible[visible.length - 1].id;
}

/** Stable id prefix for cluster focus targets in the unified roving list. */
export const ATLAS_CLUSTER_FOCUS_PREFIX = "cluster:";

export function atlasClusterFocusId(clusterKey: string): string {
  return `${ATLAS_CLUSTER_FOCUS_PREFIX}${clusterKey}`;
}

export function isAtlasClusterFocusId(id: string): boolean {
  return id.startsWith(ATLAS_CLUSTER_FOCUS_PREFIX);
}

/**
 * Returns true when the React keyboard event came from a pin or cluster
 * focus target (versus the SVG itself). Used in the map's window-level
 * keydown handler to skip arrow-key map panning while a target has focus.
 */
export function isMarkerKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('[data-atlas-focus-target="true"], [data-atlas-marker="true"]') != null;
}
