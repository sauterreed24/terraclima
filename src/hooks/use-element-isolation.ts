import { useEffect, type RefObject } from "react";

type InertElement = HTMLElement & { inert?: boolean };

/**
 * Temporarily removes a subtree from pointer, keyboard, and assistive-tech flow.
 * Useful for app shells or lower overlay layers while a modal above them is open.
 */
export function useElementIsolation(
  elementRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;

    const element = elementRef.current;
    if (!element) return;

    const hadAriaHidden = element.hasAttribute("aria-hidden");
    const previousAriaHidden = element.getAttribute("aria-hidden");
    const hadInertAttribute = element.hasAttribute("inert");
    const previousInertAttribute = element.getAttribute("inert");
    const inertElement = element as InertElement;
    const previousInertProperty = "inert" in element ? Boolean(inertElement.inert) : undefined;

    element.setAttribute("aria-hidden", "true");
    element.setAttribute("inert", "");
    if (previousInertProperty !== undefined) {
      inertElement.inert = true;
    }

    return () => {
      if (hadAriaHidden) {
        element.setAttribute("aria-hidden", previousAriaHidden ?? "");
      } else {
        element.removeAttribute("aria-hidden");
      }

      if (previousInertProperty !== undefined) {
        inertElement.inert = previousInertProperty;
      }

      if (hadInertAttribute) {
        element.setAttribute("inert", previousInertAttribute ?? "");
      } else {
        element.removeAttribute("inert");
      }
    };
  }, [active, elementRef]);
}
