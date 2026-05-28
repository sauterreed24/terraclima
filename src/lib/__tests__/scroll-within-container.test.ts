// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { childOverflowsContainer, scrollChildIntoContainer } from "../scroll-within-container";

function makeContainer(opts: {
  scrollLeft?: number;
  scrollTop?: number;
  scrollWidth?: number;
  scrollHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  rect?: Partial<DOMRect>;
}): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollLeft", { value: opts.scrollLeft ?? 0, writable: true });
  Object.defineProperty(el, "scrollTop", { value: opts.scrollTop ?? 0, writable: true });
  Object.defineProperty(el, "scrollWidth", { value: opts.scrollWidth ?? 500, configurable: true });
  Object.defineProperty(el, "scrollHeight", { value: opts.scrollHeight ?? 500, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: opts.clientWidth ?? 200, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: opts.clientHeight ?? 200, configurable: true });
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 200, bottom: 200,
    width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    ...opts.rect,
  } as DOMRect);
  return el;
}

function makeChild(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 20, bottom: 20,
    width: 20, height: 20, x: 0, y: 0, toJSON: () => ({}),
    ...rect,
  } as DOMRect);
  return el;
}

describe("scrollChildIntoContainer — horizontal axis", () => {
  it("centers the child inside the container's scrollport", () => {
    const container = makeContainer({ scrollWidth: 600, clientWidth: 200 });
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo;
    // Child is at clientX 240, width 20 → wants to land in container center (~100).
    const child = makeChild({ left: 240, right: 260, width: 20 });
    scrollChildIntoContainer(container, child, { axis: "x", behavior: "auto" });
    // ideal = 0 + (240 - 0) - (200 - 20) / 2 = 240 - 90 = 150
    expect(scrollTo).toHaveBeenCalledWith({ left: 150, behavior: "auto" });
  });

  it("clamps to 0 when the ideal position is negative", () => {
    const container = makeContainer({});
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo;
    const child = makeChild({ left: 0, right: 20, width: 20 });
    scrollChildIntoContainer(container, child, { axis: "x", behavior: "smooth" });
    // ideal = 0 + (0 - 0) - (200 - 20) / 2 = -90 → clamped to 0
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
  });

  it("clamps to the max scroll when the ideal position would overshoot", () => {
    const container = makeContainer({ scrollWidth: 500, clientWidth: 200 });
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo;
    const child = makeChild({ left: 9999, right: 10019, width: 20 });
    scrollChildIntoContainer(container, child, { axis: "x", behavior: "auto" });
    // ideal would be ~9909, clamped to max = 300.
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "auto" });
  });
});

describe("scrollChildIntoContainer — vertical axis", () => {
  it("centers the child vertically", () => {
    const container = makeContainer({ scrollHeight: 600, clientHeight: 200 });
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo;
    const child = makeChild({ top: 240, bottom: 260, height: 20 });
    scrollChildIntoContainer(container, child, { axis: "y", behavior: "auto" });
    expect(scrollTo).toHaveBeenCalledWith({ top: 150, behavior: "auto" });
  });
});

describe("childOverflowsContainer", () => {
  it("returns false when child sits entirely within the container's scrollport", () => {
    const container = makeContainer({});
    const child = makeChild({ left: 50, top: 50, right: 70, bottom: 70, width: 20, height: 20 });
    expect(childOverflowsContainer(container, child, "x")).toBe(false);
    expect(childOverflowsContainer(container, child, "y")).toBe(false);
  });

  it("returns true on the X axis when the child crosses the right edge", () => {
    const container = makeContainer({});
    const child = makeChild({ left: 180, right: 220, width: 40 });
    expect(childOverflowsContainer(container, child, "x")).toBe(true);
  });

  it("returns true on the Y axis when the child crosses the top edge", () => {
    const container = makeContainer({});
    const child = makeChild({ top: -10, bottom: 10, height: 20 });
    expect(childOverflowsContainer(container, child, "y")).toBe(true);
  });

  it("honours the margin parameter for hysteresis", () => {
    const container = makeContainer({});
    // Child sits exactly inside the right edge but within the margin band.
    const child = makeChild({ left: 100, right: 198, width: 98 });
    expect(childOverflowsContainer(container, child, "x", 6)).toBe(true);
    expect(childOverflowsContainer(container, child, "x", 0)).toBe(false);
  });
});
