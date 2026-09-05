// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExplorerBackToMap } from "../ExplorerBackToMap";

vi.mock("../../lib/device-profile", () => ({ prefersReducedMotion: () => true }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Explorer return to map", () => {
  it("appears below the map and returns keyboard focus as well as scroll position", () => {
    const map = document.createElement("div");
    map.tabIndex = -1;
    document.body.append(map);
    vi.spyOn(map, "getBoundingClientRect").mockReturnValue({ bottom: -100 } as DOMRect);
    map.scrollIntoView = vi.fn();
    const { unmount } = render(<ExplorerBackToMap mapRef={{ current: map }} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to atlas map" }));
    expect(document.activeElement).toBe(map);
    expect(map.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    unmount();
    map.remove();
  });

  it("does not cover the map while it is still in view", () => {
    const map = document.createElement("div");
    vi.spyOn(map, "getBoundingClientRect").mockReturnValue({ bottom: 400 } as DOMRect);
    render(<ExplorerBackToMap mapRef={{ current: map }} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
