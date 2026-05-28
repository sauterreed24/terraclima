/**
 * View-transition helper for the top-level view-switch (Explorer / Trips /
 * Collections / Learn). When the browser supports the View Transitions API
 * and the user hasn't requested reduced motion, the view swap animates as
 * a single compositor-driven cross-fade — no per-component animation
 * library, no extra mounting work. Otherwise we just run the update
 * synchronously.
 */
import { prefersReducedMotion } from "./device-profile";

export type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

export function runViewTransition(update: () => void): void {
  if (typeof document === "undefined" || prefersReducedMotion()) {
    update();
    return;
  }

  const startViewTransition = (document as ViewTransitionDocument).startViewTransition;
  if (!startViewTransition) {
    update();
    return;
  }

  try {
    void startViewTransition.call(document, update);
  } catch {
    update();
  }
}
