/**
 * Scroll-spy helpers for the place detail drawer (`[data-place-detail]`).
 * Uses a reading-line marker inside the drawer, not the window viewport.
 */

export function detailScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-place-detail]");
}

export function scrollDetailRootToSection(
  id: string,
  options: { behavior?: ScrollBehavior; marginFallback?: number } = {},
): boolean {
  const root = detailScrollRoot();
  const target = document.getElementById(id);
  if (!root || !target) return false;

  const rootRect = root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const fallback = options.marginFallback ?? 12;
  const parsedMargin = Number.parseFloat(getComputedStyle(target).scrollMarginTop);
  const scrollMarginTop = Number.isFinite(parsedMargin) && parsedMargin > 0 ? parsedMargin : fallback;
  root.scrollTo({
    top: Math.max(0, root.scrollTop + (targetRect.top - rootRect.top) - scrollMarginTop),
    behavior: options.behavior ?? "smooth",
  });
  return true;
}

/**
 * Last section whose top has crossed the marker — stable while scrolling
 * long profiles inside the drawer.
 */
export function pickActiveSectionIndex(root: HTMLElement, sectionEls: HTMLElement[]): number {
  if (sectionEls.length === 0) return 0;
  const slack = 10;
  const canScroll = root.scrollHeight > root.clientHeight + slack;
  if (canScroll && root.scrollTop + root.clientHeight >= root.scrollHeight - slack) {
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
