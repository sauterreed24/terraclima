import { useSyncExternalStore } from "react";

/**
 * Single source of truth for motion / GPU tiering: reduced-motion preference,
 * save-data, modest RAM, and low core count (e.g. older Surface-class tablets).
 * Used by the map (skip SVG blur / pulse) and the shell (`tc-low-power` on
 * `<html>` for cheaper ambient animation).
 */
export type MotionPolicy = "full" | "reduced" | "minimal";

/** Shared motion timings — mirrored in `src/styles.css` as `--tc-motion-duration-*`. */
export const MOTION_DURATION_FAST_MS = 180;
export const MOTION_DURATION_BASE_MS = 280;
export const MOTION_DURATION_FAST_S = MOTION_DURATION_FAST_MS / 1000;
export const MOTION_DURATION_BASE_S = MOTION_DURATION_BASE_MS / 1000;

const DRAWER_EASE = [0.2, 0.8, 0.2, 1] as const;

/** Overlay drawer slide — spring on full tier, fast ease on minimal, instant when reduced. */
export function drawerPanelTransition(reduceMotion: boolean, coarsePointer: boolean) {
  if (reduceMotion) return { duration: 0 };
  const policy = motionPolicy();
  if (policy === "reduced") return { duration: 0 };
  if (policy === "minimal" || coarsePointer) {
    return { duration: MOTION_DURATION_FAST_S, ease: DRAWER_EASE };
  }
  return { type: "spring" as const, stiffness: 280, damping: 32 };
}

export function scrimFadeTransition(reduceMotion: boolean) {
  return { duration: reduceMotion || motionPolicy() === "reduced" ? 0 : MOTION_DURATION_FAST_S };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Single motion tier for CSS transitions, map topo fades, and backdrop blur.
 * `minimal` = reduced motion and/or low-power device profile.
 */
export function motionPolicy(): MotionPolicy {
  if (typeof window === "undefined") return "full";
  if (prefersReducedMotion()) return "reduced";
  if (!getRichVisualEffects()) return "minimal";
  return "full";
}

function getNavigatorConnection(): { saveData?: boolean; addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void } | undefined {
  return (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void } }).connection;
}

function getRichVisualEffects(): boolean {
  if (typeof window === "undefined") return true;
  if (prefersReducedMotion()) return false;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
  const conn = getNavigatorConnection();
  const saveData = Boolean(conn?.saveData);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof memory === "number" && memory <= 4;
  return !saveData && !lowMem && cores > 4;
}

function subscribeRichVisualEffects(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  const conn = getNavigatorConnection();
  conn?.addEventListener?.("change", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    conn?.removeEventListener?.("change", onChange);
  };
}

/**
 * React subscribe to {@link getRichVisualEffects} for map chrome and other
 * components. Server snapshot is optimistic (full effects) to match SSR.
 */
export function useRichVisualEffects(): boolean {
  return useSyncExternalStore(subscribeRichVisualEffects, getRichVisualEffects, () => true);
}
