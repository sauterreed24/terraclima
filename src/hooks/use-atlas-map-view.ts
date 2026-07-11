import { useCallback, useRef } from "react";
import {
  type MapSafeArea,
  type MapViewState,
} from "../lib/atlas-map-fit";
import {
  clampMapTranslation,
  MAX_ZOOM,
  MIN_ZOOM,
  type ContentBBox,
} from "../lib/atlas-map-zoom";

/**
 * Shared view commit helpers for AtlasMap: clamp pan/zoom against content
 * bounds and chrome safe areas, then apply through React state.
 */
export function useAtlasMapViewCommit({
  width,
  height,
  safeArea,
  contentBBox,
  setView,
}: {
  width: number;
  height: number;
  safeArea: MapSafeArea;
  contentBBox: ContentBBox | null;
  setView: React.Dispatch<React.SetStateAction<MapViewState>>;
}) {
  const safeAreaRef = useRef(safeArea);
  safeAreaRef.current = safeArea;
  const contentBBoxRef = useRef(contentBBox);
  contentBBoxRef.current = contentBBox;

  const clampView = useCallback((next: MapViewState): MapViewState => {
    const bbox = contentBBoxRef.current;
    if (!bbox) return next;
    return clampMapTranslation(next, bbox, width, height, {
      safeArea: safeAreaRef.current,
      overscrollPx: 80,
    });
  }, [width, height]);

  const commitView = useCallback((updater: MapViewState | ((prev: MapViewState) => MapViewState)) => {
    setView(prev => {
      const raw = typeof updater === "function" ? updater(prev) : updater;
      return clampView(raw);
    });
  }, [clampView, setView]);

  const fitOpts = useCallback((extra: { inset?: number; minK?: number; maxK?: number } = {}) => ({
    minK: extra.minK ?? MIN_ZOOM,
    maxK: extra.maxK ?? MAX_ZOOM,
    inset: extra.inset ?? 0.065,
    safeArea: safeAreaRef.current,
  }), []);

  return { clampView, commitView, fitOpts, safeAreaRef, contentBBoxRef };
}
