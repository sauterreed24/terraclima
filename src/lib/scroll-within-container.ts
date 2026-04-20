/**
 * Scroll a child into view **inside** `container` only — never calls the
 * global `Element.scrollIntoView`, which would scroll the place drawer and
 * fight the reader.
 */
export function scrollChildIntoContainer(
  container: HTMLElement,
  child: HTMLElement,
  opts: { axis: "x" | "y"; behavior: ScrollBehavior },
): void {
  const c = container.getBoundingClientRect();
  const ch = child.getBoundingClientRect();
  if (opts.axis === "x") {
    const ideal = container.scrollLeft + (ch.left - c.left) - (c.width - ch.width) / 2;
    const max = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollTo({ left: Math.max(0, Math.min(ideal, max)), behavior: opts.behavior });
  } else {
    const ideal = container.scrollTop + (ch.top - c.top) - (c.height - ch.height) / 2;
    const max = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTo({ top: Math.max(0, Math.min(ideal, max)), behavior: opts.behavior });
  }
}

/** True if any part of `child` lies outside `container`'s scrollport on that axis. */
export function childOverflowsContainer(
  container: HTMLElement,
  child: HTMLElement,
  axis: "x" | "y",
  margin = 6,
): boolean {
  const c = container.getBoundingClientRect();
  const ch = child.getBoundingClientRect();
  if (axis === "x") {
    return ch.left < c.left + margin || ch.right > c.right - margin;
  }
  return ch.top < c.top + margin || ch.bottom > c.bottom - margin;
}
