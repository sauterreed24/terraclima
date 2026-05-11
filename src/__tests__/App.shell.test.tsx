// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

/** Avoid dynamic topojson imports + async map setup leaking past test teardown. */
vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

vi.mock("../components/ClimateTripsView", () => ({
  ClimateTripsView: () => <div data-testid="climate-trips-view">Climate Trips mocked</div>,
}));

vi.mock("../components/CompareView", () => ({
  CompareView: ({ places, open }: { places: Array<{ id: string }>; open: boolean }) =>
    open && places.length > 0 ? (
      <div role="dialog" aria-label={places.length === 1 ? "1 place saved to compare" : `${places.length} places side by side`} />
    ) : null,
}));

function renderApp() {
  return render(
    <UnitProvider>
      <App />
    </UnitProvider>,
  );
}

describe("App shell", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders primary branding inside UnitProvider", () => {
    const { container } = renderApp();
    const header = container.querySelector("header.tc-header-bar");
    expect(header).not.toBeNull();
    expect(header!.textContent).toMatch(/Terraclima/);
    expect(header!.textContent).toMatch(/North American Microclimate Atlas/);
  }, 15000);

  it("renders Trips in the primary navigation", () => {
    renderApp();
    expect(screen.getAllByRole("button", { name: "Trips" }).length).toBeGreaterThan(0);
  }, 15000);

  it("opens the Trips view from navigation", async () => {
    renderApp();
    fireEvent.click(screen.getAllByRole("button", { name: "Trips" })[0]);
    expect(await screen.findByTestId("climate-trips-view")).toBeInTheDocument();
  }, 15000);

  it("loads ?v=trips directly", async () => {
    window.history.replaceState(null, "", "/?v=trips");
    renderApp();
    expect(await screen.findByTestId("climate-trips-view")).toBeInTheDocument();
  }, 15000);

  it("falls back to Explorer for unknown view values", () => {
    window.history.replaceState(null, "", "/?v=garbage");
    renderApp();
    expect(screen.queryByTestId("climate-trips-view")).toBeNull();
    expect(screen.getByTestId("atlas-map-stub")).toBeInTheDocument();
  }, 15000);

  it("falls back to Explorer for retired Pro links", () => {
    window.history.replaceState(null, "", "/?v=pro");
    renderApp();
    expect(screen.queryByText("Pro")).not.toBeInTheDocument();
    expect(screen.queryByTestId("climate-trips-view")).toBeNull();
    expect(screen.getByTestId("atlas-map-stub")).toBeInTheDocument();
  }, 15000);

  it("surfaces the active ranking leaders in the Explorer hero", () => {
    window.history.replaceState(null, "", "/?col=places-that-feel-like-another-country&r=live-fit");

    renderApp();

    expect(screen.getByText("Current rank")).toBeInTheDocument();
    expect(screen.getByText(/Leading matches by/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rank 1\./ }).length).toBeGreaterThan(0);
  }, 15000);

  it("copies the current Explorer URL for sharing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?q=monterey&r=live-fit");

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Copy current Explorer view" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("q")).toBe("monterey");
    expect(copied.searchParams.get("r")).toBe("live-fit");
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  }, 15000);

  it("opens compare immediately for shared URLs with two or more valid places", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
  }, 15000);

  it("keeps a one-place compare URL saved without opening the compare dialog", () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");

    renderApp();

    expect(screen.queryByRole("dialog", { name: "1 place side by side" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open compare (1 place)" }).length).toBeGreaterThan(0);
  }, 15000);

  it("exposes only the visible close button in the mobile site menu", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open site menu" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close menu" })).toHaveLength(1));
  }, 15000);

  it("exposes only the visible close button in the mobile filter sheet", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close filters" })).toHaveLength(1));
    expect(screen.getByLabelText("Search places by name, region, or archetype")).toHaveAttribute("placeholder", "Search places");
  }, 15000);
});
