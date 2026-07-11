export type AtlasTouchMode = "map" | "page";

export const ATLAS_DEFAULT_TOUCH_MODE: AtlasTouchMode = "map";

/**
 * Whether the map should offer a visible Scroll page / Use map escape.
 * Coarse primary pointers always need it. Hybrid devices (fine primary
 * pointer + any coarse pointer, or touch capability) also need it so
 * one-finger scroll is not trapped forever.
 */
export function needsAtlasScrollEscape({
  coarsePointer,
  anyCoarsePointer = false,
  touchCapable = false,
}: {
  coarsePointer: boolean;
  anyCoarsePointer?: boolean;
  touchCapable?: boolean;
}): boolean {
  return coarsePointer || anyCoarsePointer || touchCapable;
}

export function resolveAtlasMapInteractive({
  coarsePointer,
  touchMode,
  anyCoarsePointer = false,
  touchCapable = false,
}: {
  coarsePointer: boolean;
  touchMode: AtlasTouchMode;
  anyCoarsePointer?: boolean;
  touchCapable?: boolean;
}): boolean {
  const needsEscape = needsAtlasScrollEscape({
    coarsePointer,
    anyCoarsePointer,
    touchCapable,
  });
  return !needsEscape || touchMode === "map";
}

export function atlasTouchActionForMode(mapInteractive: boolean): "none" | "pan-y pinch-zoom" {
  return mapInteractive ? "none" : "pan-y pinch-zoom";
}
