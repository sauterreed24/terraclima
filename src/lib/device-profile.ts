import { useSyncExternalStore } from "react";

/**
 * Single source of truth for motion / GPU tiering: reduced-motion preference,
 * save-data, modest RAM, and low core count (e.g. older Surface-class tablets).
 * Used by the map (skip SVG blur / pulse) and the shell (`tc-low-power` on
 * `<html>` for cheaper ambient animation).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getNavigatorConnection(): { saveData?: boolean; addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void } | undefined {
  return (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void } }).connection;
}

export function getRichVisualEffects(): boolean {
  if (typeof window === "undefined") return true;
  if (prefersReducedMotion()) return false;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
  const conn = getNavigatorConnection();
  const saveData = Boolean(conn?.saveData);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof memory === "number" && memory <= 4;
  return !saveData && !lowMem && cores > 4;
}

export function subscribeRichVisualEffects(onChange: () => void): () => void {
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
