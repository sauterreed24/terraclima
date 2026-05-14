// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UNIT_STORAGE_KEY, UnitProvider } from "../lib/units";

const APP_SHELL_TIMEOUT_MS = 30000;
const DEG = "\u00b0";

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
  CompareView: ({
    places,
    open,
    onCopyView,
    shareStatus,
    liveFitFilters,
  }: {
    places: Array<{ id: string }>;
    open: boolean;
    onCopyView?: () => void;
    shareStatus?: "idle" | "copied" | "failed";
    liveFitFilters?: {
      fitPresets?: Set<string>;
      maxSummerHighC?: number;
    };
  }) =>
    open && places.length > 0 ? (
      <div role="dialog" aria-label={places.length === 1 ? "1 place saved to compare" : `${places.length} places side by side`}>
        {onCopyView ? (
          <button type="button" aria-label="Copy comparison link" onClick={onCopyView}>
            {shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Copy failed" : "Copy comparison"}
          </button>
        ) : null}
        {(liveFitFilters?.fitPresets?.size ?? 0) > 0 || liveFitFilters?.maxSummerHighC != null ? (
          <div data-testid="compare-live-filters">
            {[...(liveFitFilters?.fitPresets ?? new Set())].join(",") || "no presets"}
            {liveFitFilters?.maxSummerHighC != null ? ` / summer ${liveFitFilters.maxSummerHighC}` : ""}
          </div>
        ) : null}
      </div>
    ) : null,
}));

vi.mock("../components/PlaceDetail", () => ({
  PlaceDetail: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Place profile">
      <button type="button" aria-label="Close profile" onClick={onClose} />
    </div>
  ),
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
  }, APP_SHELL_TIMEOUT_MS);

  it("renders Trips in the primary navigation", () => {
    renderApp();
    expect(screen.getAllByRole("button", { name: "Trips" }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("opens the Trips view from navigation", async () => {
    renderApp();
    fireEvent.click(screen.getAllByRole("button", { name: "Trips" })[0]);
    expect(await screen.findByTestId("climate-trips-view")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("loads ?v=trips directly", async () => {
    window.history.replaceState(null, "", "/?v=trips");
    renderApp();
    expect(await screen.findByTestId("climate-trips-view")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("falls back to Explorer for unknown view values", () => {
    window.history.replaceState(null, "", "/?v=garbage");
    renderApp();
    expect(screen.queryByTestId("climate-trips-view")).toBeNull();
    expect(screen.getByTestId("atlas-map-stub")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("falls back to Explorer for retired Pro links", () => {
    window.history.replaceState(null, "", "/?v=pro");
    renderApp();
    expect(screen.queryByText("Pro")).not.toBeInTheDocument();
    expect(screen.queryByTestId("climate-trips-view")).toBeNull();
    expect(screen.getByTestId("atlas-map-stub")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces the active ranking leaders in the Explorer hero", () => {
    window.history.replaceState(null, "", "/?col=places-that-feel-like-another-country&r=live-fit");

    renderApp();

    expect(screen.getByText("Current rank")).toBeInTheDocument();
    expect(screen.getByText("Scout brief")).toBeInTheDocument();
    expect(screen.getByText("Context stress test")).toBeInTheDocument();
    expect(screen.getByText(/distinct leaders across/)).toBeInTheDocument();
    expect(screen.getAllByText("Decision matrix").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Apply context:/ }).length).toBeGreaterThan(3);
    expect(screen.getAllByText("Easy months").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Felt comfort").length).toBeGreaterThan(0);
    expect(screen.getByText(/Leading matches by/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rank 1\./ }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("starts new sessions with live-here fit as the default Explorer ranking", () => {
    renderApp();

    expect(screen.getByLabelText("Top five places for the selected ranking profile: Live-here fit")).toBeInTheDocument();
    expect(screen.getByLabelText("Desktop relocation workbench")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rank 1\./ }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("compares current Explorer leaders from the scout brief", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Compare current leaders/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares distinct context leaders from the stress test", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Compare context top picks/ }));

    expect(await screen.findByRole("dialog", { name: /places side by side/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("applies alternate context presets from the Explorer hero", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Apply context: Cool summers" }));

    await waitFor(() => {
      expect(window.location.search).toContain("fit=cool-summers");
      expect(window.location.search).toContain("sh=26");
    });
    expect(screen.getByLabelText("Top five places for the selected ranking profile: Live-here fit")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

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
    expect(copied.searchParams.get("r")).toBeNull();
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("preserves unit choices in copied Explorer URLs", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?q=wenatchee");

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: `${DEG}C` }));
    fireEvent.click(screen.getByRole("button", { name: "km" }));

    await waitFor(() => {
      expect(window.location.search).toContain("temp=C");
      expect(window.location.search).toContain("dist=metric");
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy current Explorer view" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("q")).toBe("wenatchee");
    expect(copied.searchParams.get("temp")).toBe("C");
    expect(copied.searchParams.get("dist")).toBe("metric");
  }, APP_SHELL_TIMEOUT_MS);

  it("hydrates unit choices from a shared URL", () => {
    window.history.replaceState(null, "", "/?temp=C&dist=metric");

    renderApp();

    expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "true");
  }, APP_SHELL_TIMEOUT_MS);

  it("does not clobber metric/Celsius when Back lands on a legacy URL without unit params", async () => {
    window.history.replaceState(null, "", "/?q=wenatchee");
    window.history.pushState(null, "", "/?q=wenatchee&temp=C&dist=metric");

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "true");
    });

    window.history.back();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "true");
    });

    const raw = window.localStorage.getItem(UNIT_STORAGE_KEY);
    expect(raw == null || !raw.includes("\"temp\":\"F\"")).toBe(true);
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps live-fit ranking in shared URLs when live-fit controls are active", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?r=live-fit&fit=cool-summers");

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Copy current Explorer view" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("r")).toBe("live-fit");
    expect(copied.searchParams.get("fit")).toBe("cool-summers");
  }, APP_SHELL_TIMEOUT_MS);

  it("opens compare immediately for shared URLs with two or more valid places", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("copies comparison URLs from the compare dialog", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa&temp=C&dist=metric");

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Copy comparison link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("cmp")).toBe("sequim-wa,port-townsend-wa");
    expect(copied.searchParams.get("temp")).toBe("C");
    expect(copied.searchParams.get("dist")).toBe("metric");
    await waitFor(() => expect(screen.getAllByText("Link copied").length).toBeGreaterThan(0));
  }, APP_SHELL_TIMEOUT_MS);

  it("passes active Live Finder filters into shared compare views", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,portal-az&r=live-fit&fit=cool-summers&sh=22");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-live-filters")).toHaveTextContent("cool-summers / summer 22");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps a one-place compare URL saved without opening the compare dialog", () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");

    renderApp();

    expect(screen.queryByRole("dialog", { name: "1 place side by side" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open compare (1 place)" }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("exposes only the visible close button in the mobile site menu", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open site menu" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close menu" })).toHaveLength(1));
  }, APP_SHELL_TIMEOUT_MS);

  it("exposes only the visible close button in the mobile filter sheet", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close filters" })).toHaveLength(1));
    expect(screen.getByLabelText("Search places by name, region, or archetype")).toHaveAttribute("placeholder", "Search places");
  }, APP_SHELL_TIMEOUT_MS);

  it("renders the pinned shortlist rail when bookmarks exist in localStorage", () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa"]),
    );
    renderApp();
    expect(screen.getByText(/Your shortlist · 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Sequim from your shortlist/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("renders the recently viewed rail when recents exist in localStorage", () => {
    window.localStorage.setItem(
      "terraclima.recent-places.v1",
      JSON.stringify(["sequim-wa"]),
    );
    renderApp();
    expect(screen.getByText(/Recently viewed · 1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Sequim \(recently viewed\)/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("does not mark deep-linked place history as in-app navigation after URL sync", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
    renderApp();

    await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect((window.history.state as { tcPlace?: boolean } | null)?.tcPlace).toBeFalsy();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);
    await screen.findByLabelText("Search places by name, region, or archetype", {}, { timeout: APP_SHELL_TIMEOUT_MS });
    fireEvent.click(screen.getAllByRole("button", { name: "USA" })[0]);

    await waitFor(() => {
      expect(window.location.search).toMatch(/c=USA/);
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    expect((window.history.state as { tcPlace?: boolean } | null)?.tcPlace).toBeFalsy();
  }, APP_SHELL_TIMEOUT_MS);
});
