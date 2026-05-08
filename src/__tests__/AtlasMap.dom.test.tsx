// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasMap } from "../components/AtlasMap";
import { UnitProvider } from "../lib/units";
import { makePlace } from "../lib/__tests__/test-fixtures";

afterEach(cleanup);

function setCoarsePointer(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(pointer: coarse)" ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderMap() {
  return render(
    <UnitProvider>
      <AtlasMap
        places={[
          makePlace({ id: "a", name: "Alpha Valley", lat: 40, lon: -100, tier: "A" }),
          makePlace({ id: "b", name: "Beta Ridge", lat: 41, lon: -101, tier: "B" }),
        ]}
        onSelect={vi.fn()}
      />
    </UnitProvider>,
  );
}

describe("AtlasMap DOM controls", () => {
  it("defaults phone-sized coarse pointers to direct map mode with a scroll escape", () => {
    setCoarsePointer(true);
    renderMap();

    const toggle = screen.getByRole("button", { name: "Switch map to page scrolling" });
    expect(toggle).toHaveTextContent("Scroll page");
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Switch map to direct interaction" })).toHaveTextContent("Use map");
    expect(screen.getByRole("button", { name: "Switch map to direct interaction" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps desktop controls available without rendering the phone touch-mode toggle", () => {
    setCoarsePointer(false);
    renderMap();

    expect(screen.queryByRole("button", { name: /Switch map to/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit all places in view" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Scroll to zoom, drag to pan/ })).toBeInTheDocument();
  });
});
