/**
 * Scroll-spy helpers for the place detail drawer (`[data-place-detail]`).
 * Uses a reading-line marker inside the drawer, not the window viewport.
 */

export function detailScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-place-detail]");
}

/**
 * Last section whose top has crossed the marker — stable while scrolling
 * long profiles inside the drawer.
 */
export function pickActiveSectionIndex(root: HTMLElement, sectionEls: HTMLElement[]): number {
  if (sectionEls.length === 0) return 0;
  const slack = 10;
  if (root.scrollTop + root.clientHeight >= root.scrollHeight - slack) {
    return sectionEls.length - 1;
  }
  const rootRect = root.getBoundingClientRect();
  const marker = rootRect.top + Math.min(176, Math.max(96, rootRect.height * 0.24));
  for (let i = sectionEls.length - 1; i >= 0; i--) {
    const top = sectionEls[i].getBoundingClientRect().top;
    if (top <= marker + 1) return i;
  }
  return 0;
}
