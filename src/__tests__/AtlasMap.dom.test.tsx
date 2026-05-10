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

function renderMap(onSelect = vi.fn()) {
  return render(
    <UnitProvider>
      <AtlasMap
        places={[
          makePlace({
            id: "a",
            name: "Alpha Valley",
            lat: 40,
            lon: -100,
            tier: "A",
            whyDistinct: "A sharp rain-shadow bench keeps this valley sunnier and drier than the forested slopes around it.",
            drivers: ["rain-shadow", "aspect-slope", "cold-air-drainage", "orographic-lift"],
            growability: {
              score: 70,
              hardinessZone: "8a",
              growsWell: ["lavender", "grapes", "apples"],
              tricky: ["late frost pockets"],
            },
            risks: {
              wildfire: { level: "elevated" },
              flood: { level: "low" },
              drought: { level: "moderate" },
              extremeHeat: { level: "low" },
              extremeCold: { level: "low" },
              smoke: { level: "moderate" },
              storm: { level: "low" },
              landslide: { level: "low" },
              coastal: { level: "very-low" },
            },
          }),
          makePlace({ id: "b", name: "Beta Ridge", lat: 41, lon: -101, tier: "B" }),
        ]}
        onSelect={onSelect}
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

  it("shows a compact non-blocking scout preview on desktop hover while click still selects", () => {
    setCoarsePointer(false);
    const onSelect = vi.fn();
    renderMap(onSelect);

    const marker = screen.getByRole("button", { name: /Alpha Valley/ });
    fireEvent.pointerEnter(marker, { pointerType: "mouse" });

    const preview = screen.getByRole("tooltip");
    expect(preview).toHaveClass("pointer-events-none");
    expect(preview).toHaveTextContent("Alpha Valley");
    expect(preview).toHaveTextContent("Climate snapshot");
    expect(preview).toHaveTextContent("JJA high");
    expect(preview).toHaveTextContent("Microclimate gist");
    expect(preview).toHaveTextContent("rain-shadow bench");
    expect(preview).toHaveTextContent("Physical drivers");
    expect(preview).toHaveTextContent("Rain Shadow");
    expect(preview).toHaveTextContent("Scout cues");
    expect(preview).toHaveTextContent("lavender, grapes");
    expect(preview).toHaveTextContent("late frost pockets");

    expect(screen.queryByText("Location & classification")).not.toBeInTheDocument();
    expect(screen.queryByText(/Atlas scores/)).not.toBeInTheDocument();
    expect(screen.queryByText("Mid-century outlook (~2050)")).not.toBeInTheDocument();
    expect(screen.queryByText("Open the full sheet")).not.toBeInTheDocument();

    fireEvent.click(marker);

    expect(onSelect).toHaveBeenCalledWith("a");
  });
});
