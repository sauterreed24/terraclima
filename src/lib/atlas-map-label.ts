import type { Place } from "../types";

/** Secondary line: locality / region / country code — for map callouts. */
export function placeMapSecondaryLine(place: Place): string {
  const parts: string[] = [];
  const mun = place.municipality?.trim();
  if (mun && mun !== place.name) parts.push(mun);
  if (place.region?.trim()) parts.push(place.region.trim());
  const cc = place.country === "USA" ? "US" : place.country === "Canada" ? "CA" : "MX";
  parts.push(cc);
  return parts.join(" · ");
}

/**
 * At low zoom, shorten long titles so the map stays legible; full string on hover/active or when zoomed in.
 */
export function truncateMapTitle(title: string, maxChars: number): string {
  if (title.length <= maxChars) return title;
  return `${title.slice(0, Math.max(1, maxChars - 1))}…`;
}
