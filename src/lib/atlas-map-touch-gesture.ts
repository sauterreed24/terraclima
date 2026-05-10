export type AtlasTouchMode = "map" | "page";

export const ATLAS_DEFAULT_TOUCH_MODE: AtlasTouchMode = "map";

export function resolveAtlasMapInteractive({
  coarsePointer,
  touchMode,
}: {
  coarsePointer: boolean;
  touchMode: AtlasTouchMode;
}): boolean {
  return !coarsePointer || touchMode === "map";
}

export function atlasTouchActionForMode(mapInteractive: boolean): "none" | "pan-y pinch-zoom" {
  return mapInteractive ? "none" : "pan-y pinch-zoom";
}
