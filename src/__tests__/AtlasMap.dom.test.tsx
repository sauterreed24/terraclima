// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasMap, wheelZoomFactor } from "../components/AtlasMap";
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

function defaultMapPlaces() {
  return [
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
  ];
}

function renderMap(onSelect = vi.fn(), featuredIds: readonly string[] = [], places = defaultMapPlaces()) {
  return render(
    <UnitProvider>
      <AtlasMap
        places={places}
        onSelect={onSelect}
        featuredIds={featuredIds}
      />
    </UnitProvider>,
  );
}

describe("AtlasMap DOM controls", () => {
  it("scales wheel zoom by delta size for trackpads without making mouse wheels sluggish", () => {
    expect(wheelZoomFactor(-1, 0)).toBeGreaterThan(1);
    expect(wheelZoomFactor(-1, 0)).toBeLessThan(1.01);
    expect(wheelZoomFactor(-100, 0)).toBeGreaterThan(1.18);
    expect(wheelZoomFactor(100, 0)).toBeLessThan(0.84);
    expect(wheelZoomFactor(-10_000, 0)).toBeLessThan(1.6);
    expect(wheelZoomFactor(0, 0)).toBe(1);
  });

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
    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Key" }));

    expect(screen.getByRole("group", { name: "Map key" })).toBeInTheDocument();
    expect(screen.getByText("Orographic / orchard / chinook")).toBeInTheDocument();
    expect(screen.getByText(/Flagship/)).toBeInTheDocument();
  });

  it("opens dense clusters into a sorted picker with tier and lived-coverage context", () => {
    setCoarsePointer(true);
    const onSelect = vi.fn();
    const clusterPlaces = [
      makePlace({
        id: "cluster-c",
        name: "Cedar Draw",
        tier: "C",
        lat: 40,
        lon: -100,
      }),
      makePlace({
        id: "cluster-a",
        name: "Alpha Valley",
        tier: "A",
        lat: 40,
        lon: -100,
        liveSignals: {
          costPressure: 30,
          socialStress: 20,
          accessFriction: 35,
          note: "Two source lived-reality read for the dense-cluster picker.",
          sources: [
            { label: "County profile", url: "https://example.com/county" },
            { label: "Local services", url: "https://example.com/services" },
          ],
        },
      }),
      makePlace({
        id: "cluster-b",
        name: "Beta Ridge",
        tier: "B",
        lat: 40,
        lon: -100,
        liveSignals: {
          costPressure: 44,
          note: "Partial lived-reality read with one graded axis.",
          sources: [],
        },
      }),
      ...Array.from({ length: 17 }, (_, index) =>
        makePlace({
          id: `cluster-z-${index}`,
          name: `Zulu Pocket ${String(index).padStart(2, "0")}`,
          tier: "C",
          lat: 40,
          lon: -100,
        }),
      ),
    ];

    renderMap(onSelect, [], clusterPlaces);

    fireEvent.click(screen.getByRole("button", { name: /20 nearby microclimates/ }));

    const dialog = screen.getByRole("dialog", { name: "Choose a microclimate from this cluster" });
    const items = within(dialog).getAllByRole("button", { name: /Open / });
    const first = items[0]!;
    const second = items[1]!;
    const third = items[2]!;

    expect(within(dialog).getByText("Location key")).toBeInTheDocument();
    expect(within(dialog).getByText("20 pins separated")).toBeInTheDocument();
    expect(dialog.querySelectorAll(".cluster-picker__mini-pin")).toHaveLength(20);
    expect(first).toHaveAttribute("aria-label", expect.stringContaining("Position 1"));
    expect(first).toHaveTextContent("Alpha Valley");
    expect(first).toHaveTextContent("Flagship");
    expect(first).toHaveTextContent("2 lived sources");
    expect(second).toHaveTextContent("Beta Ridge");
    expect(second).toHaveTextContent("Spotlight");
    expect(second).toHaveTextContent("Partial lived read");
    expect(third).toHaveTextContent("Cedar Draw");
    expect(third).toHaveTextContent("Index");
    expect(third).toHaveTextContent("Lived read pending");

    fireEvent.click(first);
    expect(onSelect).toHaveBeenCalledWith("cluster-a");
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
    expect(preview).toHaveTextContent("Comfort read");
    expect(preview).toHaveTextContent("Comfort");
    expect(preview).toHaveTextContent("Live fit");
    expect(preview).toHaveTextContent("Atmosphere");
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

  it("projects current ranked leaders onto the map as accessible halos", () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), ["a", "b"]);

    expect(screen.getByRole("button", { name: /Current rank #1\. Alpha Valley/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current rank #2\. Beta Ridge/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Gold trail connects the current top-ranked places/ })).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail__line")).toBeInTheDocument();
  });
});
