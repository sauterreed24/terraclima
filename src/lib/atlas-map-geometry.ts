/**
 * Pure geometry helpers used by the atlas map.
 *
 * Extracted from AtlasMap.tsx so they can be unit-tested in node without
 * any React or DOM. The helpers were already pure inside the component
 * file; this just gives them a dedicated home.
 */

/**
 * Convert a client-space (mouse / pointer / touch) coordinate to SVG user
 * units, accounting for the SVG's own bounding box scaling. Used wherever
 * a pointer event needs to map to map coordinates (wheel zoom anchor,
 * pinch center, double-tap zoom anchor).
 */
export function svgPointFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect | { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}

/**
 * Great-circle distance in kilometres between two lon/lat pairs.
 * Used to derive the scale bar and to validate the inverse projection.
 */
export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Format a lat/lon pair for the cursor overlay. Two decimal places give
 * ~1.1 km of horizontal resolution at the equator — readable at a glance
 * while still useful for regional orientation.
 */
export function formatLatLon(lat: number, lon: number): string {
  const latH = lat >= 0 ? "N" : "S";
  const lonH = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${latH}  ${Math.abs(lon).toFixed(2)}°${lonH}`;
}

/** Euclidean distance between two client-coordinate points. */
export function pointerDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Pull the first two pointers from a pointer-id-keyed map. */
export function firstTwoPointers(
  map: Map<number, { clientX: number; clientY: number }>,
): readonly [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] | null {
  const arr = [...map.values()];
  if (arr.length < 2) return null;
  return [arr[0], arr[1]] as const;
}
