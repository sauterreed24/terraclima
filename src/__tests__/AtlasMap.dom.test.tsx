// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AtlasMap, wheelZoomFactor } from "../components/AtlasMap";
import { UnitProvider } from "../lib/units";
import { makePlace } from "../lib/__tests__/test-fixtures";

afterEach(cleanup);

function setPointerMedia({
  coarse = false,
  anyCoarse = false,
}: {
  coarse?: boolean;
  anyCoarse?: boolean;
} = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      query === "(pointer: coarse)" ? coarse
      : query === "(any-pointer: coarse)" ? anyCoarse
      : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setCoarsePointer(matches: boolean) {
  setPointerMedia({ coarse: matches, anyCoarse: matches });
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
  options: {
    featuredLabel?: string;
    selectedId?: string;
    onEmptyRecovery?: () => void;
    emptyRecoveryLabel?: string;
    bookmarkIds?: ReadonlySet<string>;
    onToggleBookmark?: (id: string) => void;
    onMapEngaged?: () => void;
  } = {},
) {
  return render(
    <UnitProvider>
      <AtlasMap
        places={places}
        selectedId={options.selectedId}
        onSelect={onSelect}
        featuredIds={featuredIds}
        featuredLabel={options.featuredLabel}
        onEmptyRecovery={options.onEmptyRecovery}
        emptyRecoveryLabel={options.emptyRecoveryLabel}
        bookmarkIds={options.bookmarkIds}
        onToggleBookmark={options.onToggleBookmark}
        onMapEngaged={options.onMapEngaged}
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

  it("defaults phone-sized coarse pointers to direct map mode with a scroll escape", async () => {
    setCoarsePointer(true);
    renderMap();

    const toggle = screen.getByRole("button", { name: "Switch map to page scrolling" });
    expect(toggle).toHaveTextContent("Scroll page");
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Switch map to direct interaction" })).toHaveTextContent("Use map");
    expect(screen.getByRole("button", { name: "Switch map to direct interaction" })).toHaveAttribute("aria-pressed", "false");

    const keyButton = screen.getByRole("button", { name: "Open map legend" });
    expect(keyButton).toHaveTextContent("Key");
    expect(keyButton).toHaveAttribute("title", "Open map legend");
    fireEvent.click(keyButton);

    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();
    const mapLegend = screen.getByRole("dialog", { name: "Map legend" });
    expect(mapLegend).toBeInTheDocument();
    expect(mapLegend).toHaveAttribute("open");
    expect(mapLegend).toHaveAttribute("aria-modal", "true");
    expect(keyButton).toHaveAccessibleName("Hide map legend");
    expect(keyButton).toHaveAttribute("title", "Hide map legend");
    expect(within(mapLegend).getByText("Orographic / orchard / chinook")).toBeInTheDocument();

    const closeMapLegend = screen.getByRole("button", { name: "Close map legend" });
    expect(closeMapLegend).toHaveAttribute("title", "Close map legend");
    await waitFor(() => expect(closeMapLegend).toHaveFocus());
    fireEvent.keyDown(closeMapLegend, { key: "Tab" });
    expect(closeMapLegend).toHaveFocus();
    fireEvent.click(closeMapLegend);

    expect(screen.queryByRole("dialog", { name: "Map legend" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(keyButton));
  });

  it("keeps desktop controls available without rendering the phone touch-mode toggle", async () => {
    setCoarsePointer(false);
    const { container } = renderMap();

    const shell = document.querySelector(".map-shell");
    expect(shell).toHaveAttribute("data-legend-open", "false");
    expect(screen.queryByRole("button", { name: /Switch map to/ })).toBeNull();
    const zoomIn = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-in"]');
    const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
    const fitAll = screen.getByRole("button", { name: "Fit every pin in view (keyboard: 0)" });
    expect(zoomIn).toBeTruthy();
    expect(zoomOut).toBeTruthy();
    expect(zoomIn).toHaveAttribute("data-map-target", "comfortable");
    expect(zoomIn).toHaveAttribute("title", zoomIn?.getAttribute("aria-label"));
    expect(zoomOut).toHaveAttribute("data-map-target", "comfortable");
    expect(zoomOut).toHaveAttribute("title", zoomOut?.getAttribute("aria-label"));
    expect(fitAll).toHaveAttribute("data-map-target", "comfortable");
    expect(fitAll).toHaveAttribute("title", "Fit every pin in view (keyboard: 0)");
    expect(screen.getByRole("application", { name: /Scroll to zoom, drag to pan/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();

    const keyButton = screen.getByRole("button", { name: "Open map key" });
    expect(keyButton).toHaveTextContent("Key");
    expect(keyButton).toHaveAttribute("title", "Open map key");
    fireEvent.click(keyButton);

    expect(screen.getByRole("group", { name: "Map key" })).toBeInTheDocument();
    expect(keyButton).toHaveAccessibleName("Hide map key");
    expect(keyButton).toHaveAttribute("title", "Hide map key");
    expect(screen.getByText("Orographic / orchard / chinook")).toBeInTheDocument();
    expect(screen.getByText(/Flagship/)).toBeInTheDocument();
    const notes = screen.getByText("Usage notes").closest("details");
    expect(notes).not.toHaveAttribute("open");
    expect(screen.getByText(/Geospatial numbers are atlas screening analytics/)).toBeInTheDocument();
    expect(shell).toHaveAttribute("data-legend-open", "true");

    fireEvent.click(screen.getByText("Usage notes"));
    expect(notes).toHaveAttribute("open");

    const closeMapKey = screen.getByRole("button", { name: "Close map key" });
    expect(closeMapKey).toHaveAttribute("title", "Close map key");
    fireEvent.click(closeMapKey);

    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();
    expect(shell).toHaveAttribute("data-legend-open", "false");
    await waitFor(() => expect(document.activeElement).toBe(keyButton));
  });

  it("closes the desktop map key on Escape and restores focus to the trigger", async () => {
    setCoarsePointer(false);
    renderMap();

    const shell = document.querySelector(".map-shell");
    const keyButton = screen.getByRole("button", { name: "Open map key" });
    fireEvent.click(keyButton);

    expect(screen.getByRole("group", { name: "Map key" })).toBeInTheDocument();
    expect(keyButton).toHaveAccessibleName("Hide map key");
    expect(shell).toHaveAttribute("data-legend-open", "true");

    fireEvent.keyDown(keyButton, { key: "Escape" });

    expect(screen.queryByRole("group", { name: "Map key" })).toBeNull();
    expect(shell).toHaveAttribute("data-legend-open", "false");
    await waitFor(() => expect(document.activeElement).toBe(keyButton));
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
    const { container } = renderMap();
    const zoomIn = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-in"]');
    const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
    expect(zoomIn).toBeTruthy();
    expect(zoomOut).toBeTruthy();

    for (let i = 0; i < 30; i += 1) fireEvent.click(zoomIn!);
    const maxZoom = screen.getByLabelText("Maximum zoom reached") as HTMLButtonElement;
    expect(maxZoom).toBeDisabled();
    expect(maxZoom).toHaveAttribute("title", "Maximum zoom reached");
    expect(container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]')).not.toBeDisabled();

    for (let i = 0; i < 40; i += 1) {
      const currentZoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      fireEvent.click(currentZoomOut!);
    }
    const minZoom = screen.getByLabelText("Minimum zoom reached") as HTMLButtonElement;
    expect(minZoom).toBeDisabled();
    expect(minZoom).toHaveAttribute("title", "Minimum zoom reached");
    expect(screen.getByLabelText("Zoom in (+)")).not.toBeDisabled();
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
    expect(screen.queryByText(/row of the visible (pins|map targets)/)).toBeNull();

    fireEvent.keyDown(marker!, { key: "ArrowDown" });
    expect(screen.getByText(/Bottom row of the visible map targets/)).toBeInTheDocument();

    fireEvent.keyDown(marker!, { key: "ArrowUp" });
    expect(screen.getByText(/Top row of the visible map targets/)).toBeInTheDocument();
  });

  it("shows the climate-preview tooltip on keyboard focus (parity with pointer hover)", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      const places = [makePlace({ id: "solo", name: "Solo Peak", lat: 40, lon: -100, tier: "A" })];
      renderMap(vi.fn(), [], places);

      // No preview until a pin is engaged.
      expect(screen.queryByRole("tooltip")).toBeNull();

      const marker = document.querySelector('[data-marker-id="solo"]') as SVGGElement | null;
      expect(marker).toBeTruthy();
      fireEvent.focus(marker!);

      expect(screen.getByRole("tooltip")).toHaveAttribute("data-variant", "compact");
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      // Keyboard stays on the compact peek — no dwell promotion.
      expect(screen.getByRole("tooltip")).toHaveAttribute("data-variant", "compact");
      expect(screen.getByRole("tooltip")).toHaveTextContent("Solo Peak");
      expect(screen.getByRole("tooltip")).not.toHaveTextContent("Climate snapshot");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the keyboard compact peek when the pointer grazes and leaves the focused pin", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      renderMap(vi.fn(), [], defaultMapPlaces());
      const marker = document.querySelector('[data-marker-id="a"]') as SVGGElement;
      fireEvent.focus(marker);
      expect(screen.getByRole("tooltip")).toHaveAttribute("data-variant", "compact");

      fireEvent.pointerEnter(marker, { pointerType: "mouse" });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole("tooltip")).toHaveAttribute("data-variant", "compact");
      expect(screen.getByRole("tooltip")).not.toHaveTextContent("Climate snapshot");

      fireEvent.pointerLeave(marker, { pointerType: "mouse" });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByRole("tooltip")).toHaveAttribute("data-variant", "compact");
    } finally {
      vi.useRealTimers();
    }
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
    expect(within(dialog).getByRole("button", { name: "Close cluster picker" })).toHaveAttribute("title", "Close cluster picker");
    expect(within(dialog).getByText("Location key")).toBeInTheDocument();
    expect(within(dialog).getByText("20 pins separated")).toBeInTheDocument();
    expect(dialog.querySelectorAll(".cluster-picker__mini-pin")).toHaveLength(20);
    const pickerMax = Number.parseFloat(
      getComputedStyle(dialog).getPropertyValue("--cluster-picker-max-height") ||
        (dialog as HTMLElement).style.getPropertyValue("--cluster-picker-max-height"),
    );
    expect(pickerMax).toBeGreaterThan(0);
    expect(pickerMax).toBeLessThanOrEqual(380);
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

  it("closes the cluster picker from the map surface and restores focus to the cluster trigger", () => {
    setCoarsePointer(true);
    const clusterPlaces = [
      makePlace({ id: "surface-a", name: "Surface Alpha", tier: "A", lat: 40, lon: -100 }),
      makePlace({ id: "surface-b", name: "Surface Beta", tier: "A", lat: 40, lon: -100 }),
      ...Array.from({ length: 18 }, (_, i) =>
        makePlace({ id: `surface-z-${i}`, name: `Surface Gamma ${i}`, tier: "C", lat: 40, lon: -100 }),
      ),
    ];
    renderMap(vi.fn(), [], clusterPlaces);

    const trigger = screen.getByRole("button", { name: /20 nearby microclimates/ });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Choose a microclimate from this cluster" });
    const closeBtn = within(dialog).getByRole("button", { name: "Close cluster picker" });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.pointerDown(screen.getByRole("application", { name: /Atlas map of North America/ }), {
      button: 0,
      pointerType: "mouse",
    });

    expect(
      screen.queryByRole("dialog", { name: "Choose a microclimate from this cluster" }),
    ).toBeNull();
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

  it("shows a compact instant preview on hover and promotes to the rich scout card after dwell", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      const onSelect = vi.fn();
      renderMap(onSelect);

      const marker = screen.getByRole("button", { name: /Alpha Valley/ });
      fireEvent.pointerEnter(marker, { pointerType: "mouse" });

      const preview = screen.getByRole("tooltip");
      expect(preview).toHaveAttribute("data-variant", "compact");
      expect(preview).toHaveTextContent("Alpha Valley");
      expect(preview).toHaveTextContent("JJA high");
      expect(preview).not.toHaveTextContent("Climate snapshot");
      expect(preview).toHaveClass("tc-map-hover-card-enter");
      expect(preview).not.toHaveClass("anim-fade-in");
      expect(preview).toHaveAttribute("data-horizontal");
      expect(preview).toHaveAttribute("data-vertical");
      expect(["left", "right"]).toContain(preview.getAttribute("data-horizontal"));
      expect(["above", "below"]).toContain(preview.getAttribute("data-vertical"));

      await act(async () => {
        vi.advanceTimersByTime(460);
      });

      const richPreview = screen.getByRole("tooltip");
      expect(richPreview).toHaveAttribute("data-variant", "full");
      expect(richPreview).toHaveTextContent("Climate snapshot");
      expect(richPreview).toHaveTextContent("Why it differs");
      expect(richPreview).toHaveTextContent("Open pin for full profile");
      expect(richPreview).not.toHaveTextContent("Scout cues");
      expect(richPreview).not.toHaveTextContent("Comfort read");
      expect(richPreview).toHaveClass("tc-map-hover-card-enter");
      expect(richPreview).not.toHaveClass("anim-fade-in");
      expect(richPreview).toHaveAttribute("data-horizontal", preview.getAttribute("data-horizontal")!);
      expect(richPreview).toHaveAttribute("data-vertical", preview.getAttribute("data-vertical")!);

      fireEvent.click(marker);
      expect(onSelect).toHaveBeenCalledWith("a");
    } finally {
      vi.useRealTimers();
    }
  });

  it("pins a place to the shortlist from the rich hover card without opening the dossier", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      const onSelect = vi.fn();
      const onToggleBookmark = vi.fn();
      renderMap(onSelect, [], defaultMapPlaces(), {
        bookmarkIds: new Set(),
        onToggleBookmark,
      });

      const marker = screen.getByRole("button", { name: /Alpha Valley/ });
      fireEvent.pointerEnter(marker, { pointerType: "mouse" });
      await act(async () => {
        vi.advanceTimersByTime(460);
      });

      const richPreview = screen.getByRole("region", { name: "Alpha Valley map preview" });
      expect(richPreview).toHaveAttribute("data-interactive", "true");
      expect(richPreview).toHaveAttribute("id", "tc-map-hover-preview");
      expect(richPreview).toHaveTextContent("Pin shortlist · open for profile");
      fireEvent.click(within(richPreview).getByRole("button", { name: /Pin Alpha Valley to your shortlist/ }));
      expect(onToggleBookmark).toHaveBeenCalledWith("a");
      expect(onSelect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("fans overlapping featured rank badges instead of stacking them NE", async () => {
    setCoarsePointer(false);
    const highland = [
      makePlace({ id: "patzcuaro-mx", name: "Pátzcuaro", lat: 19.51, lon: -101.61, tier: "A" }),
      makePlace({ id: "morelia-mx", name: "Morelia", lat: 19.52, lon: -101.60, tier: "A" }),
      makePlace({ id: "patzcuaro-lake-mx", name: "Lake Pátzcuaro", lat: 19.515, lon: -101.605, tier: "B" }),
      makePlace({ id: "tzintzuntzan-mx", name: "Tzintzuntzan", lat: 19.518, lon: -101.608, tier: "B" }),
      makePlace({ id: "erongaricuaro-mx", name: "Erongarícuaro", lat: 19.513, lon: -101.612, tier: "C" }),
    ];
    renderMap(vi.fn(), highland.map(place => place.id), highland, { featuredLabel: "Most comfortable" });

    await waitFor(() => {
      expect(document.querySelectorAll(".map-rank-badge")).toHaveLength(5);
    });
    const badges = [...document.querySelectorAll(".map-rank-badge")];
    expect(badges.some(badge => badge.getAttribute("data-badge-fanned") === "true")).toBe(true);
    const seats = badges.map(badge => badge.getAttribute("transform") ?? "");
    expect(new Set(seats).size).toBeGreaterThan(1);
  });

  it("shift-clicks a map pin to shortlist without opening the dossier", () => {
    setCoarsePointer(false);
    const onSelect = vi.fn();
    const onToggleBookmark = vi.fn();
    renderMap(onSelect, [], defaultMapPlaces(), { onToggleBookmark });

    const marker = screen.getByRole("button", { name: /Alpha Valley/ });
    fireEvent.click(marker, { shiftKey: true });
    expect(onToggleBookmark).toHaveBeenCalledWith("a");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("exposes quadrant placement attrs and keeps the entrance class motion-safe", async () => {
    vi.useFakeTimers();
    const root = document.documentElement;
    const prevMotion = root.getAttribute("data-motion");
    try {
      setCoarsePointer(false);
      // Southern pin → prefers card above; western pin → prefers card to the right.
      const places = [
        makePlace({
          id: "south",
          name: "South Mesa",
          lat: 20,
          lon: -105,
          tier: "A",
          whyDistinct: "A southern highland bench for quadrant placement coverage.",
        }),
        makePlace({
          id: "north-east",
          name: "North East Ridge",
          lat: 48,
          lon: -70,
          tier: "B",
        }),
      ];
      renderMap(vi.fn(), [], places);

      const south = screen.getByRole("button", { name: /South Mesa/ });
      fireEvent.pointerEnter(south, { pointerType: "mouse" });
      let card = screen.getByRole("tooltip");
      expect(card).toHaveAttribute("data-horizontal", "right");
      expect(card).toHaveAttribute("data-vertical", "above");
      expect(card.style.transform).toMatch(/translate\(/);
      expect(card.style.transform).not.toBe("none");
      expect(card.style.transform).not.toMatch(/translateY\(0\)/);
      expect(card).toHaveClass("tc-map-hover-card-enter");
      expect(card).not.toHaveClass("anim-fade-in");

      await act(async () => {
        vi.advanceTimersByTime(460);
      });
      card = screen.getByRole("tooltip");
      expect(card).toHaveAttribute("data-variant", "full");
      expect(card).toHaveAttribute("data-horizontal", "right");
      expect(card).toHaveAttribute("data-vertical", "above");
      expect(card).toHaveClass("tc-map-hover-card-enter");

      fireEvent.pointerLeave(south, { pointerType: "mouse" });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      root.setAttribute("data-motion", "reduced");
      const northEast = screen.getByRole("button", { name: /North East Ridge/ });
      fireEvent.pointerEnter(northEast, { pointerType: "mouse" });
      card = screen.getByRole("tooltip");
      expect(card).toHaveAttribute("data-horizontal", "left");
      expect(card).toHaveAttribute("data-vertical", "below");
      expect(card).toHaveClass("tc-map-hover-card-enter");
      expect(card).not.toHaveClass("anim-fade-in");
      // Reduced-motion styling disables the entrance; the placement class stays for parity.
      expect(root.getAttribute("data-motion")).toBe("reduced");
    } finally {
      if (prevMotion == null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prevMotion);
      vi.useRealTimers();
    }
  });

  it("aligns the hover preview with active ranking context", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      const places = defaultMapPlaces();
      renderMap(vi.fn(), ["a"], places, { featuredLabel: "Most comfortable" });

      const marker = screen.getByRole("button", { name: /Current rank #1\. Alpha Valley/ });
      fireEvent.pointerEnter(marker, { pointerType: "mouse" });

      expect(screen.getByRole("tooltip")).toHaveTextContent("Rank #1 by Most comfortable");
      expect(screen.getByRole("tooltip")).toHaveTextContent("Fill = climate driver");

      await act(async () => {
        vi.advanceTimersByTime(460);
      });

      const richPreview = screen.getByRole("tooltip");
      expect(richPreview).toHaveAttribute("data-variant", "full");
      expect(richPreview).toHaveTextContent("Rank #1 by Most comfortable");
      expect(richPreview).toHaveTextContent("Climate snapshot");
      expect(richPreview).toHaveTextContent("gold = comfort leaders");
      expect(richPreview).not.toHaveTextContent("Live fit");
      expect(richPreview).not.toHaveTextContent("Current lens leader");
    } finally {
      vi.useRealTimers();
    }
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
    expect(screen.getByRole("application", { name: /Gold trail connects the current top-ranked places/ })).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail__line")).toBeInTheDocument();
    expect(container.querySelector(".map-rank-trail")).toHaveAttribute("data-tone", "quiet");
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
    // Feel/Field stay in the DOM; the dl aria-label carries the full read for AT.
    // Visual collapse is CSS (nth-child); More toggles data-expanded for sticky expand.
    expect(readout.querySelectorAll(".map-atlas-readout__item").length).toBe(4);
    expect(readout).toHaveAttribute("data-expanded", "false");
    expect(readout).toHaveAttribute("data-density", "full");
    expect(readout).toHaveTextContent("Feel");
    expect(readout).toHaveTextContent("Field");
    expect(readout).toHaveTextContent("2 open pins");
    expect(readout.querySelector(".map-atlas-readout__grid")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Current map read."),
    );

    const expand = within(readout).getByRole("button", { name: "Expand atlas read details" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(readout).toHaveAttribute("data-expanded", "true");
    expect(within(readout).getByRole("button", { name: "Collapse atlas read details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Valid <dl> structure (axe definition-list): each grouping div holds only a
    // <dt>/<dd> pair, and the detail line is nested inside the <dd> rather than a
    // stray <span> sibling that breaks the definition-list grouping.
    const items = readout.querySelectorAll(".map-atlas-readout__item");
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      const tags = Array.from(item.children).map(c => c.tagName);
      expect(tags).toEqual(["DT", "DD"]);
      expect(item.querySelector("dd > span")).not.toBeNull();
    });
  });

  it("keeps the atlas read as a compact corner chip on coarse pointers", () => {
    setCoarsePointer(true);
    renderMap(vi.fn(), ["a", "b"], defaultMapPlaces(), { featuredLabel: "Most comfortable" });

    const readout = screen.getByLabelText("Current map read");
    expect(readout).toHaveAttribute("data-density", "compact");
    expect(readout).toHaveAttribute("data-expanded", "false");
    // Compact chip shortens the headline so the control stays corner-sized.
    expect(readout).toHaveTextContent("Alpha Valley");
    expect(readout).not.toHaveTextContent("Alpha Valley leads");

    const grid = readout.querySelector(".map-atlas-readout__grid");
    expect(grid).toHaveAttribute("hidden");

    const expand = within(readout).getByRole("button", { name: "Expand atlas read details" });
    fireEvent.click(expand);
    expect(readout).toHaveAttribute("data-expanded", "true");
    expect(grid).not.toHaveAttribute("hidden");
    expect(readout).toHaveTextContent("Driver");
    expect(readout).toHaveTextContent("Feel");
  });

  it("exposes the interactive map as an application widget, not a static image", () => {
    setCoarsePointer(false);
    const { container } = renderMap();
    const svg = container.querySelector("svg.atlas-svg");
    // role=application (not img) lets the focusable map legitimately contain the
    // focusable pin buttons (avoids the nested-interactive a11y violation) and
    // makes screen readers pass arrow keys through to pan/zoom.
    expect(svg).toHaveAttribute("role", "application");
    expect(svg).toHaveAttribute("aria-roledescription", "Interactive map");
    expect(svg).toHaveAttribute("tabindex", "0");
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

    expect(screen.getByRole("application", { name: /Gold trail connects the current top-ranked places/ })).toBeInTheDocument();
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
    const twoPlaceCluster = clusters.find(cluster => cluster.getAttribute("aria-label")?.startsWith("2 nearby microclimates"));
    const ninetyPlaceCluster = clusters.find(cluster => cluster.getAttribute("aria-label")?.startsWith("90 nearby microclimates"));

    expect(twoPlaceCluster).toBeTruthy();
    expect(ninetyPlaceCluster).toBeTruthy();
    if (!twoPlaceCluster || !ninetyPlaceCluster) throw new Error("Expected both cluster count bands to render");

    expect(twoPlaceCluster).toHaveAttribute("data-cluster-size", "small");
    expect(ninetyPlaceCluster).toHaveAttribute("data-cluster-size", "mass");
    expect(twoPlaceCluster.querySelector("title")).toHaveTextContent("2 nearby microclimates");
    expect(ninetyPlaceCluster.querySelector("title")).toHaveTextContent("90 nearby microclimates");
    expect(twoPlaceCluster.querySelector(".map-cluster__outer")).toHaveAttribute("r", "18");
    expect(ninetyPlaceCluster.querySelector(".map-cluster__outer")).toHaveAttribute("r", "24");
    expect(twoPlaceCluster.querySelector(".map-cluster__hit-area")).toHaveAttribute("r", "30");
    expect(ninetyPlaceCluster.querySelector(".map-cluster__hit-area")).toHaveAttribute("r", "30");
  });

  it("adds place context so equal-size cluster buttons stay distinct", () => {
    setCoarsePointer(false);
    const westCluster = Array.from({ length: 46 }, (_, index) =>
      makePlace({
        id: `west-cluster-${index}`,
        name: index === 0 ? "West Alpha" : index === 1 ? "West Beta" : `West Pocket ${index}`,
        lat: 39,
        lon: -103,
      }),
    );
    const eastCluster = Array.from({ length: 46 }, (_, index) =>
      makePlace({
        id: `east-cluster-${index}`,
        name: index === 0 ? "East Alpha" : index === 1 ? "East Beta" : `East Pocket ${index}`,
        lat: 49,
        lon: -116,
      }),
    );

    const { container } = renderMap(vi.fn(), [], [...westCluster, ...eastCluster]);
    const labels = Array.from(container.querySelectorAll<SVGGElement>(".map-cluster"))
      .map(cluster => cluster.getAttribute("aria-label") ?? "")
      .filter(label => label.startsWith("46 nearby microclimates"));

    expect(labels).toHaveLength(2);
    expect(new Set(labels).size).toBe(2);
    expect(labels).toEqual(expect.arrayContaining([
      expect.stringContaining("West Alpha, West Beta, and 44 more"),
      expect.stringContaining("East Alpha, East Beta, and 44 more"),
    ]));
  });

  it("groups the north arrow and scale bar in one bottom-left cartography cluster", () => {
    setCoarsePointer(false);
    const { container } = renderMap();

    const cluster = container.querySelector(".map-cartography-cluster");
    expect(cluster).toBeTruthy();
    // North arrow furniture is decorative orientation, not an interactive control.
    expect(cluster?.querySelector(".map-compass svg")).toBeTruthy();
    // The scale bar reports real distance, so we deliberately do not render a
    // redundant raw zoom multiplier alongside it.
    expect(container.querySelector(".map-zoom-readout")).toBeNull();
  });

  it("drops the decorative north arrow on coarse pointers to save room", () => {
    setCoarsePointer(true);
    const { container } = renderMap();
    expect(container.querySelector(".map-compass")).toBeNull();
    // The scale bar itself stays available on every pointer type.
    expect(container.querySelector(".map-scale-stack")).toBeTruthy();
  });

  it("zooms in on a desktop double-click of the map background, but ignores pins", () => {
    setCoarsePointer(false);
    // Widely separated pins keep the initial fit zoom well below the cap so a
    // double-click has room to zoom in.
    const places = [
      makePlace({ id: "nw", name: "Northwest", lat: 49, lon: -123, tier: "A" }),
      makePlace({ id: "se", name: "Southeast", lat: 26, lon: -80, tier: "B" }),
    ];
    const { container } = renderMap(vi.fn(), [], places);

    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    // Read the live zoom factor straight off the pan/zoom group's transform.
    const zoom = () => {
      const g = Array.from(svg.querySelectorAll("g")).find(el => /scale\(/.test(el.getAttribute("transform") ?? ""));
      const m = /scale\(([\d.]+)\)/.exec(g?.getAttribute("transform") ?? "");
      return m ? parseFloat(m[1]) : 0;
    };
    const before = zoom();
    expect(before).toBeGreaterThan(0);

    // A double-click that lands on a pin must not zoom — the pin owns activation.
    const marker = container.querySelector('[data-atlas-marker="true"]') as SVGGElement;
    fireEvent.doubleClick(marker, { clientX: 140, clientY: 130 });
    expect(zoom()).toBeCloseTo(before, 5);

    // A double-click on empty map zooms in.
    fireEvent.doubleClick(svg, { clientX: 140, clientY: 130 });
    expect(zoom()).toBeGreaterThan(before);
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

  it("marks the map shell as gesturing during pinch zoom and commits after release", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(true);
      const { container } = renderMap(vi.fn(), [], defaultMapPlaces());
      const shell = container.querySelector(".map-shell") as HTMLElement;
      const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
      svg.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

      await act(async () => {
        fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 130 });
        fireEvent.pointerDown(svg, { pointerId: 2, pointerType: "touch", clientX: 180, clientY: 130 });
        fireEvent.pointerMove(svg, { pointerId: 1, pointerType: "touch", clientX: 90, clientY: 130 });
        fireEvent.pointerMove(svg, { pointerId: 2, pointerType: "touch", clientX: 190, clientY: 130 });
      });
      expect(shell.getAttribute("data-gesturing")).toBe("true");

      await act(async () => {
        fireEvent.pointerUp(svg, { pointerId: 1, pointerType: "touch", clientX: 90, clientY: 130 });
        fireEvent.pointerUp(svg, { pointerId: 2, pointerType: "touch", clientX: 190, clientY: 130 });
      });
      expect(shell.getAttribute("data-gesturing")).toBe("false");
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks the map shell as gesturing once a mouse pan crosses the drag threshold", async () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), [], defaultMapPlaces());
    const shell = container.querySelector(".map-shell") as HTMLElement;
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    await act(async () => {
      fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 140, clientY: 130 });
    });
    expect(shell.getAttribute("data-gesturing")).not.toBe("true");

    await act(async () => {
      fireEvent.pointerMove(svg, { pointerId: 1, pointerType: "mouse", buttons: 1, clientX: 160, clientY: 145 });
    });
    expect(shell.getAttribute("data-gesturing")).toBe("true");

    await act(async () => {
      fireEvent.pointerUp(svg, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 160, clientY: 145 });
    });
    expect(shell.getAttribute("data-gesturing")).toBe("false");
  });

  it("keeps pins on their geographic anchors when zoomed in", () => {
    setCoarsePointer(false);
    const places = [
      makePlace({ id: "solo", name: "Solo Peak", lat: 40, lon: -100, tier: "A" }),
    ];
    const { container } = renderMap(vi.fn(), [], places);
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    const zoomGroup = svg.querySelector("g[style*='will-change']") as SVGGElement;
    expect(zoomGroup).toBeTruthy();
    const before = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(zoomGroup.getAttribute("transform") ?? "");
    expect(before).toBeTruthy();
    const k0 = parseFloat(before![3]!);

    fireEvent.click(screen.getByRole("button", { name: "Zoom in (+)" }));

    const after = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(zoomGroup.getAttribute("transform") ?? "");
    expect(after).toBeTruthy();
    const k1 = parseFloat(after![3]!);
    expect(k1).toBeGreaterThan(k0);

    const marker = container.querySelector('[data-marker-id="solo"]') as SVGGElement;
    expect(marker.getAttribute("data-has-leader")).toBe("false");
    const markerTransform = marker.getAttribute("transform") ?? "";
    const pin = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(markerTransform);
    expect(pin).toBeTruthy();
    const px = parseFloat(pin![1]!);
    const py = parseFloat(pin![2]!);
    const vx = parseFloat(after![1]!);
    const vy = parseFloat(after![2]!);
    const expectedScreenX = vx + k1 * px;
    const expectedScreenY = vy + k1 * py;

    // Counter-scale wrapper keeps screen anchor tied to map projection math.
    const innerScale = marker.querySelector("g[transform^=\"scale(\"]")?.getAttribute("transform") ?? "";
    expect(innerScale).toMatch(new RegExp(`scale\\(${1 / k1}\\)`));

    // If pins used a parent scale(1/k) from the origin, screen position would be vx+px (wrong at k>1).
    expect(Math.abs(expectedScreenX - (vx + px))).toBeGreaterThan(1);
    expect(Math.abs(expectedScreenY - (vy + py))).toBeGreaterThan(1);
  });

  it("keeps the keyboard-focused tooltip compact after dwell", async () => {
    vi.useFakeTimers();
    try {
      setCoarsePointer(false);
      renderMap(vi.fn(), [], defaultMapPlaces());
      const marker = document.querySelector('[data-marker-id="a"]') as SVGGElement;
      fireEvent.focus(marker);

      const preview = screen.getByRole("tooltip");
      expect(preview).toHaveAttribute("data-variant", "compact");
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(preview).toHaveAttribute("data-variant", "compact");
      expect(preview).not.toHaveTextContent("Climate snapshot");
      expect(preview.querySelector(".tc-map-hover-title")).toBeTruthy();
      expect(preview.querySelector(".text-ice")).toBeNull();
      expect(preview.querySelector(".text-stone")).toBeNull();
      expect(preview.querySelector(".tc-map-hover-metric__label")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses glyph pin LOD at continent-scale fit zoom", () => {
    setCoarsePointer(false);
    const places = [
      makePlace({ id: "nw", name: "Northwest", lat: 48, lon: -122, tier: "A" }),
      makePlace({ id: "ne", name: "Northeast", lat: 45, lon: -70, tier: "B" }),
      makePlace({ id: "sw", name: "Southwest", lat: 32, lon: -116, tier: "B" }),
      makePlace({ id: "se", name: "Southeast", lat: 28, lon: -82, tier: "C" }),
      makePlace({ id: "mx", name: "Mexico City", lat: 19.4, lon: -99.1, tier: "A" }),
    ];
    const { container } = renderMap(vi.fn(), [], places);
    // Zoom out to the floor so pin chrome LOD stays glyph-only.
    for (let i = 0; i < 12; i += 1) {
      const zoomOut = screen.getByRole("button", { name: /Zoom out|Minimum zoom/ });
      if ((zoomOut as HTMLButtonElement).disabled) break;
      fireEvent.click(zoomOut);
    }
    const marker = container.querySelector('[data-marker-id="nw"]') as SVGGElement | null;
    expect(marker).toBeTruthy();
    expect(marker).toHaveAttribute("data-pin-lod", "glyph");
    expect(marker?.querySelector(".map-marker__signature-aura")).toBeNull();
  });

  it("promotes rank-trail tone after zooming past the quiet threshold", async () => {
    setCoarsePointer(false);
    const { container } = renderMap(vi.fn(), ["a", "b"]);
    const trail = container.querySelector(".map-rank-trail");
    expect(trail).toHaveAttribute("data-tone", "quiet");

    for (let i = 0; i < 14; i += 1) {
      const zoomIn = screen.getByRole("button", { name: /Zoom in|Maximum zoom/ });
      if ((zoomIn as HTMLButtonElement).disabled) break;
      fireEvent.click(zoomIn);
    }
    // settledView lags gesture zoom by ~120ms before trail tone recomputes.
    await waitFor(() => {
      expect(container.querySelector(".map-rank-trail")).toHaveAttribute("data-tone", "full");
    });
  });

  it("uses map-chrome coord readout styling instead of paper panel tokens", () => {
    setCoarsePointer(false);
    renderMap();
    const readout = document.querySelector(".tc-map-coord-readout");
    expect(readout).toBeTruthy();
    expect(readout?.className).not.toMatch(/panel-thin|text-frost/);
  });

  it("offers empty-map recovery when filters leave zero pins", () => {
    setCoarsePointer(false);
    const onEmptyRecovery = vi.fn();
    renderMap(vi.fn(), [], [], { onEmptyRecovery, emptyRecoveryLabel: "Reset Explorer" });
    expect(screen.getByText("No places on the map")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset Explorer" }));
    expect(onEmptyRecovery).toHaveBeenCalledTimes(1);
  });

  it("shows a scroll escape on hybrid fine-pointer devices with any coarse pointer", () => {
    setPointerMedia({ coarse: false, anyCoarse: true });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
    renderMap();
    expect(screen.getByRole("button", { name: "Switch map to page scrolling" })).toBeInTheDocument();
  });

  it("hands wheel events to the page at maximum zoom instead of trapping scroll", () => {
    setCoarsePointer(false);
    const { container } = renderMap();
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    expect(svg).toBeTruthy();

    for (let i = 0; i < 40; i += 1) {
      const zoomIn = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-in"]');
      if (!zoomIn || zoomIn.disabled) break;
      fireEvent.click(zoomIn);
    }

    const transform = () => container.querySelector("svg.atlas-svg > g")?.getAttribute("transform") ?? "";
    const before = transform();
    const event = new WheelEvent("wheel", { deltaY: -120, bubbles: true, cancelable: true });
    const prevented = !svg.dispatchEvent(event);
    expect(prevented).toBe(false);
    expect(transform()).toBe(before);
  });

  it("hands wheel events to the page at minimum zoom instead of trapping scroll", () => {
    setCoarsePointer(false);
    const { container } = renderMap();
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;

    for (let i = 0; i < 40; i += 1) {
      const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      if (!zoomOut || zoomOut.disabled) break;
      fireEvent.click(zoomOut);
    }

    const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    const prevented = !svg.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it("keeps mid-range wheel zoom owned by the map", () => {
    setCoarsePointer(false);
    const { container } = renderMap();
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    // Back off from any tight fit-all zoom so wheel-in is still consumable.
    for (let i = 0; i < 6; i += 1) {
      const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      if (!zoomOut || zoomOut.disabled) break;
      fireEvent.click(zoomOut);
    }
    Object.defineProperty(svg, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 820, height: 520, right: 820, bottom: 520, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const event = new WheelEvent("wheel", {
      deltaY: -80,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
    const prevented = !svg.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  it("uses one roving tab stop across clusters and keeps arrow parity", async () => {
    setCoarsePointer(true);
    // Spread places across NA so low-zoom clustering yields multiple targets.
    const places = Array.from({ length: 28 }, (_, i) =>
      makePlace({
        id: `c${i}`,
        name: `Cluster Place ${i}`,
        lat: 25 + (i % 7) * 5,
        lon: -120 + Math.floor(i / 7) * 12,
        tier: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
      }),
    );
    const { container } = renderMap(vi.fn(), [], places);
    await waitFor(() => {
      expect(container.querySelectorAll(".map-cluster").length).toBeGreaterThan(1);
    });

    const focusTargets = Array.from(
      container.querySelectorAll<SVGGElement>("[data-atlas-focus-target='true']"),
    );
    expect(focusTargets.length).toBeGreaterThan(1);
    const tabZero = focusTargets.filter(el => el.getAttribute("tabindex") === "0");
    expect(tabZero.length).toBe(1);

    const clusters = Array.from(container.querySelectorAll<SVGGElement>(".map-cluster"));
    expect(clusters.every(c => c.getAttribute("tabindex") === "0")).toBe(false);

    const start = tabZero[0]!;
    start.focus();
    fireEvent.keyDown(start, { key: "ArrowRight" });
    await waitFor(() => {
      const nextZero = Array.from(
        container.querySelectorAll<SVGGElement>("[data-atlas-focus-target='true']"),
      ).find(el => el.getAttribute("tabindex") === "0");
      expect(nextZero).toBeTruthy();
      expect(nextZero).not.toBe(start);
    });
  });

  it("re-anchors the hover tooltip after zoom so screen percent tracks the pin", async () => {
    setCoarsePointer(false);
    const { container } = renderMap();
    // Start from a zoomed-out frame so + still moves the view.
    for (let i = 0; i < 4; i += 1) {
      const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      if (!zoomOut || zoomOut.disabled) break;
      fireEvent.click(zoomOut);
    }
    const marker = container.querySelector('[data-atlas-marker="true"]') as SVGGElement;
    fireEvent.pointerEnter(marker, { pointerType: "mouse" });
    const tooltip = screen.getByRole("tooltip") as HTMLElement;
    const beforeTop = tooltip.style.top;

    const zoomIn = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-in"]');
    expect(zoomIn).toBeTruthy();
    fireEvent.click(zoomIn!);
    await waitFor(() => {
      const after = screen.getByRole("tooltip") as HTMLElement;
      expect(after.style.top).not.toBe(beforeTop);
    });
  });

  it("centers an externally selected pin without requiring a second map click", async () => {
    setCoarsePointer(false);
    const { container, rerender } = render(
      <UnitProvider>
        <AtlasMap places={defaultMapPlaces()} onSelect={vi.fn()} />
      </UnitProvider>,
    );
    const transformOf = () => {
      const g = container.querySelector("svg.atlas-svg > g");
      return g?.getAttribute("transform") ?? "";
    };
    await waitFor(() => expect(transformOf()).toMatch(/scale\(/));
    const before = transformOf();

    rerender(
      <UnitProvider>
        <AtlasMap places={defaultMapPlaces()} selectedId="b" onSelect={vi.fn()} />
      </UnitProvider>,
    );
    await waitFor(() => expect(transformOf()).not.toBe(before));
    expect(transformOf()).toMatch(/scale\(/);
  });

  it("preserves context when selecting an already-visible pin from the map", async () => {
    setCoarsePointer(false);
    function Harness() {
      const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
      return (
        <UnitProvider>
          <AtlasMap
            places={defaultMapPlaces()}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        </UnitProvider>
      );
    }
    const { container } = render(<Harness />);
    const transformOf = () => container.querySelector("svg.atlas-svg > g")?.getAttribute("transform") ?? "";
    await waitFor(() => expect(transformOf()).toMatch(/scale\(/));

    for (let i = 0; i < 5; i += 1) {
      const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      if (!zoomOut || zoomOut.disabled) break;
      fireEvent.click(zoomOut);
    }
    const before = transformOf();
    const scaleBefore = Number((before.match(/scale\(([^)]+)\)/) ?? [])[1] ?? "0");

    const marker = container.querySelector('[data-marker-id="a"]') as SVGGElement;
    fireEvent.click(marker);

    await waitFor(() => {
      expect(container.querySelector('[data-marker-id="a"]')).toBeTruthy();
    });
    const after = transformOf();
    const scaleAfter = Number((after.match(/scale\(([^)]+)\)/) ?? [])[1] ?? "0");
    // Map-initiated selection should not jump to the single-point ~2.85× center fit.
    expect(scaleAfter).toBeLessThan(2.5);
    expect(Math.abs(scaleAfter - scaleBefore)).toBeLessThan(0.35);
  });

  it("releases wheel zoom while Scroll page mode is active on hybrid devices", () => {
    setPointerMedia({ coarse: false, anyCoarse: true });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 1 });
    const { container } = renderMap();
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    const transformOf = () => container.querySelector("svg.atlas-svg > g")?.getAttribute("transform") ?? "";

    fireEvent.click(screen.getByRole("button", { name: "Switch map to page scrolling" }));
    expect(screen.getByRole("button", { name: "Switch map to direct interaction" })).toBeInTheDocument();

    const before = transformOf();
    const event = new WheelEvent("wheel", { deltaY: -120, bubbles: true, cancelable: true });
    const prevented = !svg.dispatchEvent(event);
    expect(prevented).toBe(false);
    expect(transformOf()).toBe(before);
  });

  it("ignores map keyboard zoom while the cluster picker is open", () => {
    setCoarsePointer(true);
    const clusterPlaces = [
      makePlace({ id: "kb-a", name: "KB Alpha", tier: "A", lat: 40, lon: -100 }),
      makePlace({ id: "kb-b", name: "KB Beta", tier: "A", lat: 40, lon: -100 }),
      ...Array.from({ length: 18 }, (_, i) =>
        makePlace({ id: `kb-z-${i}`, name: `KB Gamma ${i}`, tier: "C", lat: 40, lon: -100 }),
      ),
    ];
    const { container } = renderMap(vi.fn(), [], clusterPlaces);
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    const transformOf = () => container.querySelector("svg.atlas-svg > g")?.getAttribute("transform") ?? "";

    // Control: with the map focused and no picker, keyboard zoom must move the view.
    svg.focus();
    const beforeOpen = transformOf();
    fireEvent.keyDown(svg, { key: "=" });
    expect(transformOf()).not.toBe(beforeOpen);

    fireEvent.click(screen.getByRole("button", { name: /20 nearby microclimates/ }));
    expect(screen.getByRole("dialog", { name: "Choose a microclimate from this cluster" })).toBeInTheDocument();

    const before = transformOf();
    // Dispatch on the SVG so the target check would otherwise allow zoom —
    // the clusterPickerOpenRef guard must still no-op.
    fireEvent.keyDown(svg, { key: "=" });
    fireEvent.keyDown(svg, { key: "+" });
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(transformOf()).toBe(before);
  });

  it("updates the DOM transform during pinch without waiting for React commit until release", async () => {
    setCoarsePointer(true);
    const { container } = renderMap(vi.fn(), [], defaultMapPlaces());
    const svg = container.querySelector("svg.atlas-svg") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 280, bottom: 260, width: 280, height: 260, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const zoomGroup = () => container.querySelector("g[style*='will-change']") as SVGGElement;
    const parseK = () => {
      const m = /scale\(([\d.]+)\)/.exec(zoomGroup()?.getAttribute("transform") ?? "");
      return m ? parseFloat(m[1]!) : NaN;
    };

    // Back off from the tight fit-all zoom so pinch-in still has headroom.
    for (let i = 0; i < 8; i += 1) {
      const zoomOut = container.querySelector<HTMLButtonElement>('[data-map-control="zoom-out"]');
      if (!zoomOut || zoomOut.disabled) break;
      fireEvent.click(zoomOut);
    }
    const k0 = parseK();
    expect(k0).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 130 });
      fireEvent.pointerDown(svg, { pointerId: 2, pointerType: "touch", clientX: 160, clientY: 130 });
      fireEvent.pointerMove(svg, { pointerId: 1, pointerType: "touch", clientX: 70, clientY: 130 });
      fireEvent.pointerMove(svg, { pointerId: 2, pointerType: "touch", clientX: 190, clientY: 130 });
    });

    const kMid = parseK();
    expect(kMid).toBeGreaterThan(k0);

    await act(async () => {
      fireEvent.pointerUp(svg, { pointerId: 1, pointerType: "touch", clientX: 70, clientY: 130 });
      fireEvent.pointerUp(svg, { pointerId: 2, pointerType: "touch", clientX: 190, clientY: 130 });
    });

    await waitFor(() => {
      expect(parseK()).toBeCloseTo(kMid, 5);
    });
  });
});
