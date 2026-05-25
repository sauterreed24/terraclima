// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { detailScrollRoot, pickActiveSectionIndex } from "../detail-scroll-spy";

function setBox(el: HTMLElement, rect: Partial<DOMRect>, scroll: Partial<Pick<HTMLElement, "clientHeight" | "scrollHeight" | "scrollTop">> = {}) {
  Object.defineProperty(el, "clientHeight", { configurable: true, value: scroll.clientHeight ?? 0 });
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scroll.scrollHeight ?? 0 });
  Object.defineProperty(el, "scrollTop", { configurable: true, value: scroll.scrollTop ?? 0 });
  el.getBoundingClientRect = () => ({
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
    height: rect.height ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? 0,
    top: rect.top ?? 0,
    width: rect.width ?? 0,
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    toJSON: () => ({}),
  });
}

function sectionAt(top: number): HTMLElement {
  const el = document.createElement("section");
  setBox(el, { top, height: 120 });
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("detail scroll spy", () => {
  it("finds the place-detail drawer root", () => {
    const root = document.createElement("div");
    root.dataset.placeDetail = "true";
    document.body.append(root);

    expect(detailScrollRoot()).toBe(root);
  });

  it("returns the first section when there are no measured sections", () => {
    const root = document.createElement("div");

    expect(pickActiveSectionIndex(root, [])).toBe(0);
  });

  it("does not force the last section active when the drawer is not scrollable", () => {
    const root = document.createElement("div");
    setBox(root, { top: 100, height: 600 }, { clientHeight: 600, scrollHeight: 600, scrollTop: 0 });
    const sections = [sectionAt(120), sectionAt(240), sectionAt(520)];

    expect(pickActiveSectionIndex(root, sections)).toBe(1);
  });

  it("chooses the last section only when a scrollable drawer reaches the bottom", () => {
    const root = document.createElement("div");
    setBox(root, { top: 100, height: 600 }, { clientHeight: 600, scrollHeight: 1600, scrollTop: 995 });
    const sections = [sectionAt(120), sectionAt(250), sectionAt(520)];

    expect(pickActiveSectionIndex(root, sections)).toBe(2);
  });

  it("uses the clamped reading marker to select the latest crossed section", () => {
    const root = document.createElement("div");
    setBox(root, { top: 80, height: 900 }, { clientHeight: 900, scrollHeight: 1800, scrollTop: 300 });
    const sections = [sectionAt(100), sectionAt(240), sectionAt(360)];

    expect(pickActiveSectionIndex(root, sections)).toBe(1);
  });
});
