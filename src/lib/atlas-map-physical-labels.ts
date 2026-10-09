import type { GeoProjection } from "d3-geo";

/**
 * Physical-geography lettering for the atlas map: water bodies, mountain
 * spines, and the big landform regions the corpus keeps referring to (rain
 * shadows behind the Cascades, the Great Plains dryline, the Sierra Madre).
 *
 * Labels are anchored in lon/lat and oriented from the projection itself, so
 * they stay glued to the land at every zoom and never depend on pixel guesses.
 */
export type PhysicalLabelKind = "ocean" | "sea" | "range" | "region" | "lake";

export interface PhysicalLabelSpec {
  id: string;
  text: string;
  kind: PhysicalLabelKind;
  /** Label centre. */
  at: [number, number];
  /**
   * Optional second point: the label is rotated to follow the projected
   * direction from `at` toward `toward` (mountain ranges, narrow gulfs).
   */
  toward?: [number, number];
  /** Zoom band where the label is drawn (fades in/out over ~25% of k). */
  minK: number;
  maxK: number;
}

export const PHYSICAL_LABELS: readonly PhysicalLabelSpec[] = [
  // Oceans and seas — continent-scale wayfinding.
  { id: "pacific", text: "Pacific Ocean", kind: "ocean", at: [-141, 35], minK: 0, maxK: 2.6 },
  { id: "atlantic", text: "Atlantic Ocean", kind: "ocean", at: [-63, 30], minK: 0, maxK: 2.6 },
  { id: "gulf-mexico", text: "Gulf of Mexico", kind: "sea", at: [-90.6, 25.4], minK: 0, maxK: 4.2 },
  { id: "hudson-bay", text: "Hudson Bay", kind: "sea", at: [-85.5, 59.6], minK: 0, maxK: 4.2 },
  { id: "gulf-alaska", text: "Gulf of Alaska", kind: "sea", at: [-145.5, 56.6], minK: 0, maxK: 4.2 },
  { id: "labrador-sea", text: "Labrador Sea", kind: "sea", at: [-55.5, 58.6], minK: 0, maxK: 4.2 },
  { id: "beaufort-sea", text: "Beaufort Sea", kind: "sea", at: [-139, 72.4], minK: 0, maxK: 4.2 },
  { id: "bering-sea", text: "Bering Sea", kind: "sea", at: [-172, 58.5], minK: 0, maxK: 4.2 },
  { id: "caribbean", text: "Caribbean Sea", kind: "sea", at: [-80, 16.2], minK: 0, maxK: 4.2 },
  { id: "gulf-california", text: "Gulf of California", kind: "sea", at: [-111.2, 27.4], toward: [-113.6, 30.6], minK: 0.8, maxK: 6 },

  // Mountain spines — the terrain that writes most of the microclimates here.
  { id: "rockies", text: "Rocky Mountains", kind: "range", at: [-111.2, 45.6], toward: [-106.2, 39.4], minK: 0.75, maxK: 4.6 },
  { id: "canadian-rockies", text: "Canadian Rockies", kind: "range", at: [-118.4, 53.6], toward: [-115.6, 51], minK: 1.1, maxK: 5.2 },
  { id: "cascades", text: "Cascade Range", kind: "range", at: [-121.6, 45.6], toward: [-121.4, 48.4], minK: 1.25, maxK: 6 },
  { id: "sierra-nevada", text: "Sierra Nevada", kind: "range", at: [-119.4, 37.6], toward: [-118.3, 36.2], minK: 1.25, maxK: 6 },
  { id: "coast-mountains", text: "Coast Mountains", kind: "range", at: [-127.4, 54.4], toward: [-125, 51.6], minK: 1.1, maxK: 5.2 },
  { id: "appalachians", text: "Appalachian Mountains", kind: "range", at: [-80.4, 37.8], toward: [-77.4, 40.8], minK: 0.85, maxK: 4.6 },
  { id: "sierra-madre-occ", text: "Sierra Madre Occidental", kind: "range", at: [-106.6, 26.2], toward: [-104.2, 22.6], minK: 0.9, maxK: 4.8 },
  { id: "sierra-madre-or", text: "Sierra Madre Oriental", kind: "range", at: [-100.4, 24.6], toward: [-99.2, 21.6], minK: 1.25, maxK: 5.2 },
  { id: "brooks-range", text: "Brooks Range", kind: "range", at: [-152, 68.1], toward: [-145, 68.6], minK: 0.9, maxK: 5 },
  { id: "alaska-range", text: "Alaska Range", kind: "range", at: [-149.5, 62.9], toward: [-145.5, 63.4], minK: 1.15, maxK: 5.5 },
  { id: "transvolcanic", text: "Trans-Mexican Volcanic Belt", kind: "range", at: [-100.6, 19.35], toward: [-97.6, 19.2], minK: 1.4, maxK: 6 },

  // Landform regions — broad climate provinces.
  { id: "great-plains", text: "Great Plains", kind: "region", at: [-102.4, 45.8], minK: 0.75, maxK: 3.6 },
  { id: "great-basin", text: "Great Basin", kind: "region", at: [-116.6, 39.8], minK: 1.0, maxK: 4.6 },
  { id: "colorado-plateau", text: "Colorado Plateau", kind: "region", at: [-110.6, 36.9], minK: 1.25, maxK: 5 },
  { id: "canadian-shield", text: "Canadian Shield", kind: "region", at: [-92, 53.2], minK: 0.75, maxK: 3.6 },
  { id: "prairies", text: "Prairies", kind: "region", at: [-107, 51.2], minK: 0.9, maxK: 4.2 },
  { id: "sonoran", text: "Sonoran Desert", kind: "region", at: [-112.6, 31.4], minK: 1.25, maxK: 5 },
  { id: "chihuahuan", text: "Chihuahuan Desert", kind: "region", at: [-104.6, 29.6], minK: 1.25, maxK: 5 },
  { id: "yucatan", text: "Yucatán Peninsula", kind: "region", at: [-89.2, 19.4], minK: 1.0, maxK: 4.6 },
  { id: "coastal-plain", text: "Atlantic Coastal Plain", kind: "region", at: [-79.6, 34.2], toward: [-77, 36.6], minK: 1.4, maxK: 5 },
  { id: "arctic", text: "Arctic Archipelago", kind: "region", at: [-98, 72.6], minK: 0.95, maxK: 3.6 },

  // Big lakes — only once the map is close enough to read them.
  { id: "superior", text: "Lake Superior", kind: "lake", at: [-87.6, 47.6], minK: 1.5, maxK: 8 },
  { id: "michigan", text: "L. Michigan", kind: "lake", at: [-87.1, 43.6], toward: [-86.9, 45.2], minK: 2.2, maxK: 9 },
  { id: "huron", text: "L. Huron", kind: "lake", at: [-82.3, 44.9], minK: 2.2, maxK: 9 },
  { id: "great-bear", text: "Great Bear Lake", kind: "lake", at: [-121, 66], minK: 1.25, maxK: 7 },
  { id: "great-slave", text: "Great Slave Lake", kind: "lake", at: [-114, 61.6], minK: 1.25, maxK: 7 },
  { id: "winnipeg", text: "L. Winnipeg", kind: "lake", at: [-97.6, 52.6], toward: [-98.6, 54.2], minK: 1.6, maxK: 8 },
  { id: "great-salt", text: "Great Salt Lake", kind: "lake", at: [-112.5, 41.15], minK: 2.6, maxK: 10 },
];

export interface ProjectedPhysicalLabel extends PhysicalLabelSpec {
  x: number;
  y: number;
  /** Screen-space rotation in degrees, already flipped to read left→right. */
  angle: number;
}

export function projectPhysicalLabels(
  projection: GeoProjection,
  specs: readonly PhysicalLabelSpec[] = PHYSICAL_LABELS,
): ProjectedPhysicalLabel[] {
  const out: ProjectedPhysicalLabel[] = [];
  for (const spec of specs) {
    const xy = projection(spec.at);
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) continue;
    let angle = 0;
    if (spec.toward) {
      const to = projection(spec.toward);
      if (to) {
        angle = (Math.atan2(to[1] - xy[1], to[0] - xy[0]) * 180) / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
      }
    }
    out.push({ ...spec, x: xy[0], y: xy[1], angle });
  }
  return out;
}

/**
 * Fade weight for a label at zoom `k`: 1 inside its band, easing to 0 over
 * roughly a quarter of the band edge so labels never pop.
 */
export function physicalLabelOpacity(spec: Pick<PhysicalLabelSpec, "minK" | "maxK">, k: number): number {
  const fadeIn = spec.minK <= 0 ? 1 : Math.max(0, Math.min(1, (k - spec.minK) / (spec.minK * 0.25)));
  const fadeOut = Math.max(0, Math.min(1, (spec.maxK - k) / (spec.maxK * 0.25)));
  return Math.min(fadeIn, fadeOut);
}
