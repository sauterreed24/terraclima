export type AtlasTouchGestureDecision = "pending" | "map-pan" | "page-scroll";

export interface AtlasTouchGestureInput {
  dx: number;
  dy: number;
  explicitMapMode: boolean;
  thresholdPx?: number;
  verticalBias?: number;
}

export const ATLAS_TOUCH_GESTURE_THRESHOLD_PX = 8;
export const ATLAS_TOUCH_VERTICAL_SCROLL_BIAS = 1.15;

export function classifyAtlasTouchGesture({
  dx,
  dy,
  explicitMapMode,
  thresholdPx = ATLAS_TOUCH_GESTURE_THRESHOLD_PX,
  verticalBias = ATLAS_TOUCH_VERTICAL_SCROLL_BIAS,
}: AtlasTouchGestureInput): AtlasTouchGestureDecision {
  if (explicitMapMode) return "map-pan";

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.hypot(absX, absY) < thresholdPx) return "pending";

  return absY > absX * verticalBias ? "page-scroll" : "map-pan";
}
