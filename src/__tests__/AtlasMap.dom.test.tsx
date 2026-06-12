// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasMap, wheelZoomFactor } from "../components/AtlasMap";
import { UnitProvider } from "../lib/units";
import { makePlace } from "../lib/__tests__/test-fixtures";
import { assessLiveFit, type LiveFitFilters } from "../lib/live-fit";

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

function renderMap(
  onSelect = vi.fn(),
  featuredIds: readonly string[] = [],
  places = defaultMapPlaces(),
  options: { featuredLabel?: string; liveFitFilters?: LiveFitFilters } = {},
) {
  return render(
    <UnitProvider>
      <AtlasMap
        places={places}
        onSelect={onSelect}
        featuredIds={featuredIds}
        featuredLabel={options.featuredLabel}
        liveFitFilters={options.liveFitFilters}
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

    fireEvent.click(screen.getByRole("button", { name: "Key" }));

    const mapKey = screen.getByRole("group", { name: "Map key" });
    expect(mapKey).toBeInTheDocument();
    expect(within(mapKey).getByText("Orographic / orchard / chinook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close map key" }));

    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();
  });

  it("keeps desktop controls available without rendering the phone touch-mode toggle", () => {
    setCoarsePointer(false);
    renderMap();

    const shell = document.querySelector(".map-shell");
    expect(shell).toHaveAttribute("data-legend-open", "false");
    expect(screen.queryByRole("button", { name: /Switch map to/ })).toBeNull();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    const fitAll = screen.getByRole("button", { name: "Fit all places in view" });
    expect(zoomIn).toHaveAttribute("data-map-target", "comfortable");
    expect(zoomOut).toHaveAttribute("data-map-target", "comfortable");
    expect(fitAll).toHaveAttribute("data-map-target", "comfortable");
    expect(screen.getByRole("img", { name: /Scroll to zoom, drag to pan/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Key" }));

    expect(screen.getByRole("group", { name: "Map key" })).toBeInTheDocument();
    expect(screen.getByText("Orographic / orchard / chinook")).toBeInTheDocument();
    expect(screen.getByText(/Flagship/)).toBeInTheDocument();
    const notes = screen.getByText("Usage notes").closest("details");
    expect(notes).not.toHaveAttribute("open");
    expect(screen.getByText(/Geospatial numbers are atlas screening analytics/)).toBeInTheDocument();
    expect(shell).toHaveAttribute("data-legend-open", "true");

    fireEvent.click(screen.getByText("Usage notes"));
    expect(notes).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Close map key" }));

    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();
    expect(shell).toHaveAttribute("data-legend-open", "false");
  });

  it("uses an empty-aware aria-label when no places match, and the interactive one otherwise", () => {
    setCoarsePointer(false);
    const { unmount } = renderMap(vi.fn(), [], []);
    const emptySvg = document.querySelector("svg.atlas-svg");
    expect(emptySvg?.getAttribute("aria-label")).toMatch(/No places match/i);
    unmount();

    renderMap();
    const svg = document.querySelector("svg.atlas-svg");
    expect(svg?.getAttribute("aria-label")).toMatch(/pin to open/i);
  });

  it("disables the zoom-in button at max zoom and zoom-out at min zoom", () => {
    setCoarsePointer(false);
    renderMap();
    const zoomIn = screen.getByLabelText("Zoom in") as HTMLButtonElement;
    const zoomOut = screen.getByLabelText("Zoom out") as HTMLButtonElement;

    for (let i = 0; i < 30; i += 1) fireEvent.click(zoomIn);
    expect(zoomIn).toBeDisabled();
    expect(zoomOut).not.toBeDisabled();

    for (let i = 0; i < 40; i += 1) fireEvent.click(zoomOut);
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).not.toBeDisabled();
  });

  it("announces the top/bottom edge when arrow-key pin nav cannot move further", () => {
    setCoarsePointer(false);
    // A single pin means any up/down press is a boundary (no adjacent row).
    const single = [makePlace({ id: "solo", name: "Solo Peak", lat: 40, lon: -100, tier: "A" })];
    renderMap(vi.fn(), [], single);

    const marker = document.querySelector('[data-marker-id="solo"]') as SVGGElement | null;
    expect(marker).toBeTruthy();
    marker!.focus();

    // Left/Right wrap (here onto the lone pin) and must NOT mislabel as a row edge.
    fireEvent.keyDown(marker!, { key: "ArrowRight" });
    expect(screen.queryByText(/row of the visible pins/)).toBeNull();

    fireEvent.keyDown(marker!, { key: "ArrowDown" });
    expect(screen.getByText("Bottom row of the visible pins.")).toBeInTheDocument();

    fireEvent.keyDown(marker!, { key: "ArrowUp" });
    expect(screen.getByText("Top row of the visible pins.")).toBeInTheDocument();
  });

  it("shows the climate-preview tooltip on keyboard focus (parity with pointer hover)", () => {
    setCoarsePointer(false);
    const places = [makePlace({ id: "solo", name: "Solo Peak", lat: 40, lon: -100, tier: "A" })];
    renderMap(vi.fn(), [], places);

    // No preview until a pin is engaged.
    expect(screen.queryByRole("tooltip")).toBeNull();

    const marker = document.querySelector('[data-marker-id="solo"]') as SVGGElement | null;
    expect(marker).toBeTruthy();
    fireEvent.focus(marker!);

    // Focusing a pin shows the same tooltip a pointer hover would.
    expect(screen.getByRole("tooltip")).toHaveTextContent("Solo Peak");
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

    expect(dialog).toHaveAttribute("aria-describedby");
    expect(within(dialog).getByText("20 nearby pins")).toBeInTheDocument();
    expect(within(dialog).getByText("20 nearby pins. Sorted by featured rank, tier, then name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Tier mix")).toBeInTheDocument();
    expect(within(dialog).getByText("1 flagship / 1 spotlight / 18 index")).toBeInTheDocument();
    expect(within(dialog).getByText("Lived read")).toBeInTheDocument();
    expect(within(dialog).getByText("1 source-backed / 1 partial / 18 pending")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close cluster picker" })).toBeInTheDocument();
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

  it("closes the cluster picker on Escape and restores focus to the cluster trigger", () => {
    setCoarsePointer(true);
    const clusterPlaces = [
      makePlace({ id: "c-1", name: "Alpha Cluster", tier: "A", lat: 40, lon: -100 }),
      makePlace({ id: "c-2", name: "Beta Cluster", tier: "A", lat: 40, lon: -100 }),
      ...Array.from({ length: 18 }, (_, i) =>
        makePlace({ id: `c-z-${i}`, name: `Gamma ${i}`, tier: "C", lat: 40, lon: -100 }),
      ),
    ];
    renderMap(vi.fn(), [], clusterPlaces);

    const trigger = screen.getByRole("button", { name: /20 nearby microclimates/ });
    // jsdom's fireEvent.click does NOT focus the click target the way a real
    // browser does, so explicitly focus the trigger first to mimic the real
    // open path (where the keyboard/touch user activates the cluster pin).
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Choose a microclimate from this cluster" });
    expect(dialog).toBeInTheDocument();
    // The close button auto-receives focus so Tab + Escape both work immediately.
    const closeBtn = within(dialog).getByRole("button", { name: "Close cluster picker" });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Choose a microclimate from this cluster" }),
    ).toBeNull();
    // Focus is restored to whatever launched the picker.
    expect(document.activeElement).toBe(trigger);
  });

  it("traps Tab focus inside the cluster picker (Tab from last item cycles back to close)", () => {
    setCoarsePointer(true);
    const clusterPlaces = [
      makePlace({ id: "tab-a", name: "Tab Alpha", tier: "A", lat: 40, lon: -100 }),
      makePlace({ id: "tab-b", name: "Tab Beta", tier: "A", lat: 40, lon: -100 }),
      ...Array.from({ length: 18 }, (_, i) =>
        makePlace({ id: `tab-z-${i}`, name: `Tab Gamma ${i}`, tier: "C", lat: 40, lon: -100 }),
      ),
    ];
    renderMap(vi.fn(), [], clusterPlaces);
    fireEvent.click(screen.getByRole("button", { name: /20 nearby microclimates/ }));

    const dialog = screen.getByRole("dialog", { name: "Choose a microclimate from this cluster" });
    const close = within(dialog).getByRole("button", { name: "Close cluster picker" });
    const optionButtons = within(dialog).getAllByRole("button", { name: /Open / });
    const lastOption = optionButtons[optionButtons.length - 1]!;

    // Focus the last in-dialog button manually, then Tab — focus should jump
    // back to the close button (the first focusable in the trap).
    lastOption.focus();
    expect(document.activeElement).toBe(lastOption);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
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
    expect(preview).toHaveTextContent("Open dossier, compare finalists");
    expect(preview).toHaveTextContent("lavender, grapes");
    expect(preview).toHaveTextContent("late frost pockets");

    expect(screen.queryByText("Location & classification")).not.toBeInTheDocument();
    expect(screen.queryByText(/Atlas scores/)).not.toBeInTheDocument();
    expect(screen.queryByText("Mid-century outlook (~2050)")).not.toBeInTheDocument();
    expect(screen.queryByText("Open the full sheet")).not.toBeInTheDocument();

    fireEvent.click(marker);

    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("aligns the hover preview with active ranking context and live-fit filters", () => {
    setCoarsePointer(false);
    const places = defaultMapPlaces();
    const liveFitFilters: LiveFitFilters = { maxSummerHighC: 22 };
    const expectedLiveFit = assessLiveFit(places[0]!, liveFitFilters).score;
    renderMap(vi.fn(), ["a"], places, { featuredLabel: "Live-here fit", liveFitFilters });

    const marker = screen.getByRole("button", { name: /Current rank #1\. Alpha Valley/ });
    fireEvent.pointerEnter(marker, { pointerType: "mouse" });

    const preview = screen.getByRole("tooltip");
    expect(preview).toHaveTextContent("Rank #1 by Live-here fit");
    expect(preview).toHaveTextContent("Current lens leader");
    expect(preview).not.toHaveTextContent("Next move: open the dossier from this pin, then compare it against the current leaders.");
    expect(preview).toHaveTextContent("Open dossier, compare finalists");
    expect(preview).toHaveTextContent(`Live fit${expectedLiveFit}`);
  });

  it("lets ranked map labels activate their own marker instead of passing through to neighbors", () => {
    setCoarsePointer(false);
    const onSelect = vi.fn();
    renderMap(onSelect, ["a"], defaultMapPlaces(), { featuredLabel: "Live-here fit" });

    const marker = screen.getByRole("button", { name: /Current rank #1\. Alpha Valley/ });
    const label = marker.querySelector(".map-marker-label");

    expect(label).toHaveAttribute("pointer-events", "auto");
    fireEvent.click(label!);

    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("projects current ranked leaders onto the map as accessible halos", () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), ["a", "b"]);

    expect(screen.getByRole("button", { name: /Current rank #1\. Alpha Valley/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current rank #2\. Beta Ridge/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Gold trail connects the current top-ranked places/ })).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail__line")).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail")).toHaveAttribute("data-tone", "full");
  });

  it("summarizes the current ranked map read before the user hovers a pin", () => {
    setCoarsePointer(false);
    renderMap(vi.fn(), ["a", "b"], defaultMapPlaces(), { featuredLabel: "Live-here fit" });

    const readout = screen.getByLabelText("Current map read");

    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(readout).toHaveTextContent("Atlas read");
    expect(readout).toHaveTextContent("Alpha Valley leads");
    expect(readout).toHaveTextContent("2 linked");
    expect(readout).toHaveTextContent("Live-here fit");
    expect(readout).toHaveTextContent("Driver");
    expect(readout).toHaveTextContent("Feel");
    expect(readout).toHaveTextContent("Field");
    expect(readout).toHaveTextContent("2 open pins");
    expect(readout.querySelector(".map-atlas-readout__grid")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Current map read."),
    );
  });

  it("softens the ranked trail when the initial map field is dense", () => {
    setCoarsePointer(false);
    const densePlaces = Array.from({ length: 96 }, (_, index) =>
      makePlace({
        id: `dense-${index}`,
        name: `Dense Place ${index}`,
        tier: index < 8 ? "A" : index < 28 ? "B" : "C",
        lat: 24 + (index % 12) * 3.2,
        lon: -126 + Math.floor(index / 12) * 7.2,
      }),
    );
    const { container } = renderMap(
      vi.fn(),
      densePlaces.slice(0, 5).map(place => place.id),
      densePlaces,
    );

    expect(screen.getByRole("img", { name: /Gold trail connects the current top-ranked places/ })).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail")).toHaveAttribute("data-tone", "quiet");
  });

  it("sizes cluster chrome by count while preserving the same hit target", () => {
    setCoarsePointer(false);
    const smallCluster = Array.from({ length: 2 }, (_, index) =>
      makePlace({
        id: `small-cluster-${index}`,
        name: `Small Cluster ${index}`,
        lat: 39,
        lon: -103,
      }),
    );
    const massCluster = Array.from({ length: 90 }, (_, index) =>
      makePlace({
        id: `mass-cluster-${index}`,
        name: `Mass Cluster ${index}`,
        lat: 49,
        lon: -116,
      }),
    );

    const { container } = renderMap(vi.fn(), [], [...smallCluster, ...massCluster]);
    const clusters = Array.from(container.querySelectorAll<SVGGElement>(".map-cluster"));
    const twoPlaceCluster = clusters.find(cluster => cluster.textContent?.trim() === "2");
    const ninetyPlaceCluster = clusters.find(cluster => cluster.textContent?.trim() === "90");

    expect(twoPlaceCluster).toBeTruthy();
    expect(ninetyPlaceCluster).toBeTruthy();
    if (!twoPlaceCluster || !ninetyPlaceCluster) throw new Error("Expected both cluster count bands to render");

    expect(twoPlaceCluster).toHaveAttribute("data-cluster-size", "small");
    expect(ninetyPlaceCluster).toHaveAttribute("data-cluster-size", "mass");
    expect(twoPlaceCluster.querySelector(".map-cluster__outer")).toHaveAttribute("r", "18");
    expect(ninetyPlaceCluster.querySelector(".map-cluster__outer")).toHaveAttribute("r", "24");
    expect(twoPlaceCluster.querySelector(".map-cluster__hit-area")).toHaveAttribute("r", "30");
    expect(ninetyPlaceCluster.querySelector(".map-cluster__hit-area")).toHaveAttribute("r", "30");
  });

  it("uses roving tabindex so only one marker is in the Tab order at a time", () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), [], defaultMapPlaces());

    const markers = Array.from(
      container.querySelectorAll<SVGGElement>('[data-atlas-marker="true"]'),
    );
    expect(markers.length).toBeGreaterThanOrEqual(2);

    const focusable = markers.filter(m => m.getAttribute("tabindex") === "0");
    expect(focusable.length).toBe(1);
    const nonFocusable = markers.filter(m => m.getAttribute("tabindex") === "-1");
    expect(nonFocusable.length).toBe(markers.length - 1);

    // The first visible marker is the keyboard entry point by default.
    expect(focusable[0]?.getAttribute("data-marker-id")).toBe(markers[0]?.getAttribute("data-marker-id"));
  });

  it("ArrowRight on a focused marker moves roving focus to the next marker", () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), [], defaultMapPlaces());

    const markers = Array.from(
      container.querySelectorAll<SVGGElement>('[data-atlas-marker="true"]'),
    );
    expect(markers.length).toBeGreaterThanOrEqual(2);

    const first = markers[0]!;
    first.focus();
    expect(first.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(first, { key: "ArrowRight" });

    const updated = Array.from(
      container.querySelectorAll<SVGGElement>('[data-atlas-marker="true"]'),
    );
    const tabZero = updated.find(m => m.getAttribute("tabindex") === "0");
    expect(tabZero?.getAttribute("data-marker-id")).toBe(markers[1]?.getAttribute("data-marker-id"));
  });
});
