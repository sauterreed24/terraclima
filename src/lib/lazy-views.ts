/**
 * Lazy-load wrappers for the cold-route view chunks (Climate Trips,
 * Collections, Learn) and the heavy overlays (PlaceDetail, CompareView).
 *
 * Two design notes:
 *   1. PlaceDetail and CompareView are opened from many places (cards,
 *      hero, top bar, keyboard shortcuts). We cache the dynamic-import
 *      promise per module so a user who hovers a "Compare" trigger and
 *      then clicks it doesn't kick off two parallel chunk fetches.
 *   2. The preload helpers are intentionally fire-and-forget — they exist
 *      so onHover / onFocus / onPointerDown handlers can warm the cache
 *      before the user commits, without blocking the render.
 */
export function loadClimateTripsView() {
  return import("../components/ClimateTripsView").then(module => ({ default: module.ClimateTripsView }));
}

export function loadCollectionsView() {
  return import("../components/CollectionsView").then(module => ({ default: module.CollectionsView }));
}

export function loadLearnMode() {
  return import("../components/LearnMode").then(module => ({ default: module.LearnMode }));
}

function importPlaceDetail() {
  return import("../components/PlaceDetail").then(module => ({ default: module.PlaceDetail }));
}

function importCompareView() {
  return import("../components/CompareView").then(module => ({ default: module.CompareView }));
}

let placeDetailLoadPromise: ReturnType<typeof importPlaceDetail> | null = null;
let compareViewLoadPromise: ReturnType<typeof importCompareView> | null = null;

export function loadPlaceDetail() {
  if (!placeDetailLoadPromise) {
    placeDetailLoadPromise = importPlaceDetail().catch(error => {
      placeDetailLoadPromise = null;
      throw error;
    });
  }
  return placeDetailLoadPromise;
}

export function loadCompareView() {
  if (!compareViewLoadPromise) {
    compareViewLoadPromise = importCompareView().catch(error => {
      compareViewLoadPromise = null;
      throw error;
    });
  }
  return compareViewLoadPromise;
}

export function preloadPlaceDetail() {
  void loadPlaceDetail();
}

export function preloadCompareView() {
  void loadCompareView();
}
