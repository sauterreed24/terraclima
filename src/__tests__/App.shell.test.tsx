// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

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
    onClose,
    onCopyView,
    shareStatus,
    liveFitFilters,
    occluded,
  }: {
    places: Array<{ id: string }>;
    open: boolean;
    onClose: () => void;
    onCopyView?: () => void;
    shareStatus?: "idle" | "copied" | "failed";
    liveFitFilters?: {
      fitPresets?: Set<string>;
      maxSummerHighC?: number;
    };
    occluded?: boolean;
  }) =>
    open && places.length > 0 ? (
      <div
        role="dialog"
        aria-label={places.length === 1 ? "1 place saved to compare" : `${places.length} places side by side`}
        aria-hidden={occluded ? "true" : undefined}
        data-testid="compare-view-mock"
      >
        <button type="button" aria-label="Close comparison" onClick={onClose}>
          Close comparison
        </button>
        <div data-testid="compare-place-ids">{places.map(place => place.id).join(",")}</div>
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
  PlaceDetail: ({
    onClose,
    occluded,
    residencyFitContext,
  }: {
    onClose: () => void;
    occluded?: boolean;
    residencyFitContext?: {
      rankingLabel: string;
      bundleLabel?: string | null;
      bundleCue?: string | null;
    };
  }) => (
    <div
      role="dialog"
      aria-label="Place profile"
      aria-hidden={occluded ? "true" : undefined}
      data-testid="place-detail-mock"
    >
      {residencyFitContext ? (
        <div data-testid="place-detail-fit-context">
          {residencyFitContext.bundleLabel ? `${residencyFitContext.bundleLabel} / ` : ""}
          {residencyFitContext.bundleCue ? `${residencyFitContext.bundleCue} / ` : ""}
          {residencyFitContext.rankingLabel}
        </div>
      ) : null}
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

function mockViewport(widthPx: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = query.match(/\(min-width:\s*(\d+)px\)/)?.[1];
    const maxWidth = query.match(/\(max-width:\s*(\d+)px\)/)?.[1];
    const matchesMin = minWidth ? widthPx >= Number(minWidth) : true;
    const matchesMax = maxWidth ? widthPx <= Number(maxWidth) : true;
    return {
      matches: matchesMin && matchesMax,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as unknown as typeof window.matchMedia;
}

describe("App shell", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  it("applies dark theme when the Dark control is selected", async () => {
    renderApp();
    const darkBtn = screen.getAllByRole("button", { name: /Dark theme/i })[0];
    fireEvent.click(darkBtn);
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
    expect(darkBtn).toHaveAttribute("aria-pressed", "true");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps lens receipt surfaces moonlit in dark theme", async () => {
    renderApp();
    fireEvent.click(screen.getAllByRole("button", { name: /Dark theme/i })[0]);
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
    const lens = document.querySelector(".lens-receipt");
    expect(lens).not.toBeNull();
    const bg = getComputedStyle(lens!).backgroundColor;
    expect(bg).not.toMatch(/rgb\(25[0-5],\s*25[0-5]/);
    const rMatch = bg.match(/rgba?\(\s*(\d+)/);
    if (rMatch) {
      expect(Number(rMatch[1])).toBeLessThan(140);
    }
  }, APP_SHELL_TIMEOUT_MS);

  it("renders primary branding inside UnitProvider", () => {
    const { container } = renderApp();
    const header = container.querySelector("header.tc-header-bar");
    expect(header).not.toBeNull();
    expect(header!.textContent).toMatch(/Terraclima/);
    expect(header!.textContent).toMatch(/North American Microclimate Atlas/);
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the app shell from becoming the desktop sticky dock scroll container", () => {
    const { container } = renderApp();
    const shell = container.querySelector(".tc-app-shell");

    expect(shell).not.toBeNull();
    expect(shell!.className).not.toContain("overflow-x-hidden");
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
    mockViewport(1280);
    window.history.replaceState(null, "", "/?col=places-that-feel-like-another-country&r=live-fit");

    renderApp();

    expect(screen.getByText("Current rank")).toBeInTheDocument();
    expect(screen.getByLabelText("Desktop relocation workbench")).toBeInTheDocument();
    expect(document.querySelector(".panel-hero .scout-brief")).toBeNull();
    expect(screen.getByText("Context stress test")).toBeInTheDocument();
    expect(screen.getByText(/distinct leaders across/)).toBeInTheDocument();
    expect(screen.getAllByText("Decision matrix").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Advisor verdict").length).toBeGreaterThan(0);
    expect(screen.getByText(/not a moving recommendation/)).toBeInTheDocument();
    expect(screen.getByText(/Screening confidence/)).toBeInTheDocument();
    expect(screen.getAllByText("Scout day plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Start here").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scout .*:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Field check").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Field check:/ }).length).toBeGreaterThan(0);
    expect(screen.getByText("Best for")).toBeInTheDocument();
    expect(screen.getByText("Pause if")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Apply context:/ }).length).toBeGreaterThan(3);
    expect(screen.getAllByText("Easy months").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Felt comfort").length).toBeGreaterThan(0);
    expect(screen.getByText(/Leading matches by/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rank 1\./ }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("prioritizes the desktop scout verdict before broader compass diagnostics", () => {
    mockViewport(1280);
    renderApp();

    const scoutBoard = screen.getByLabelText("Desktop relocation workbench");
    const advisorVerdict = screen.getByText("Advisor verdict");
    const compactEvidence = screen.getByLabelText("Compact desktop shortlist evidence");
    const signalRail = screen.getByLabelText(/climate signal leaders/i);
    const currentRank = screen.getByText("Current rank");
    const contextStress = screen.getByText("Context stress test");

    expect(advisorVerdict.closest(".desktop-scout-board")).toBe(scoutBoard);
    expect(compactEvidence.closest(".desktop-scout-board")).toBe(scoutBoard);
    expect(within(compactEvidence).getByText("Decision matrix")).toBeInTheDocument();
    expect(within(compactEvidence).getAllByRole("button", { name: /desktop decision matrix/ }).length).toBe(3);
    const actions = screen.getByLabelText(/Scout actions for/);
    expect(actions.closest(".desktop-scout-board")).toBe(scoutBoard);
    expect(within(actions).getByRole("button", { name: /Open .* climate dossier from the Scout Board/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Save 4 Scout Board finalists to your shortlist/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Pin .* to your shortlist/ })).toHaveAttribute("aria-pressed", "false");
    expect(scoutBoard.compareDocumentPosition(signalRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoutBoard.compareDocumentPosition(currentRank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoutBoard.compareDocumentPosition(contextStress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, APP_SHELL_TIMEOUT_MS);

  it("starts new sessions with live-here fit as the default Explorer ranking", () => {
    mockViewport(1280);
    renderApp();

    expect(screen.getByRole("heading", { name: "Find your climate fit before you scout" })).toBeInTheDocument();
    const quickPicks = screen.getByRole("group", { name: "Climate-fit quick picks" });
    expect(quickPicks).toBeInTheDocument();
    expect(quickPicks).toHaveTextContent("Cool summers");
    expect(document.querySelector(".tc-map-stage__caption strong")).toHaveTextContent("Live-here fit · top 5");
    expect(screen.getByLabelText("Top five places for the selected ranking profile: Live-here fit")).toBeInTheDocument();
    expect(screen.getByLabelText("Desktop relocation workbench")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rank 1\./ }).length).toBeGreaterThan(0);
  }, APP_SHELL_TIMEOUT_MS);

  it("applies the hero Cool summers path without snow-country filters", async () => {
    mockViewport(1280);
    renderApp();

    const quickPicks = screen.getByRole("group", { name: "Climate-fit quick picks" });
    fireEvent.click(within(quickPicks).getByRole("button", { name: /Cool summers/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("r")).toBe("coolest-summers");
      expect(params.get("fit")).toBe("cool-summers");
      expect(params.get("sh")).toBe("26");
      expect(params.get("fit")).not.toContain("snow-country");
      expect(params.get("fit")).not.toContain("four-seasons");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("summarizes the active Fit Finder path in the Explorer hero", async () => {
    mockViewport(1280);
    renderApp();

    const quickPicks = screen.getByRole("group", { name: "Climate-fit quick picks" });
    fireEvent.click(within(quickPicks).getByRole("button", { name: /Cool summers/ }));

    const receipt = await screen.findByLabelText("Active Fit Finder path: Cool Summer Refuge");
    expect(receipt).toHaveTextContent("Fit Finder path active");
    expect(receipt).toHaveTextContent("Cool Summer Refuge");
    expect(receipt).toHaveTextContent("Rank by Coolest summers");
    expect(receipt).toHaveTextContent(new RegExp(`summer <= (26${DEG}C|79${DEG}F)`));
    expect(within(receipt).getByRole("button", { name: /Open first scout dossier:/ })).toBeInTheDocument();

    fireEvent.click(within(receipt).getByRole("button", { name: /Compare 4 Fit Finder leaders/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("passes the active Fit Finder path and ranking context into shared place dossiers", async () => {
    mockViewport(1280);
    window.history.replaceState(
      null,
      "",
      "/?p=real-catorce-mx&c=Mexico%2CUSA&a=eternal-spring-highland%2Chigh-desert-escape%2Cmild-winter-foothills%2Cmonsoon-edge%2Csky-island-refuge%2Cvolcanic-upland&r=best-shoulder-seasons&fit=dry-air%2Cmild-winters&sh=26&wl=-5&temp=C&dist=metric",
    );

    renderApp();

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toBeInTheDocument();
    expect(screen.getByTestId("place-detail-fit-context")).toHaveTextContent("Mexico / Southwest");
    expect(screen.getByTestId("place-detail-fit-context")).toHaveTextContent("Dry highland options");
    expect(screen.getByTestId("place-detail-fit-context")).toHaveTextContent("Best shoulder seasons");

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("temp")).toBe("C");
      expect(params.get("dist")).toBe("metric");
      expect(params.get("r")).toBe("best-shoulder-seasons");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the mobile Explorer hero compact and defers dense panels until after the map", () => {
    mockViewport(390);
    renderApp();

    const hero = document.querySelector(".panel-hero");
    const map = screen.getByTestId("atlas-map-stub");
    const currentRank = screen.getByText("Current rank");
    const scoutBrief = screen.getByText("Scout brief");

    expect(hero).not.toBeNull();
    expect(screen.getByRole("group", { name: "Climate-fit quick picks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy current Explorer view" }).closest(".hero-action-stack")).not.toBeNull();
    expect(screen.getByLabelText(/climate signal leaders/i)).toBeInTheDocument();
    expect(screen.getByText(/Livability lens/)).toBeInTheDocument();
    expect(hero!.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map.compareDocumentPosition(currentRank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map.compareDocumentPosition(scoutBrief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Advisor verdict")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save 4 Scout Brief finalists to your shortlist/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the map leader caption synchronized with the selected ranking", () => {
    window.history.replaceState(null, "", "/?r=best-growability");

    renderApp();

    const caption = document.querySelector(".tc-map-stage__caption strong");
    expect(caption).toHaveTextContent("Best growability · top 5");
    expect(caption).toHaveAttribute("title", "Best growability · top 5");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the mobile Live Finder trigger outside the animated view subtree", () => {
    renderApp();

    const trigger = screen.getByRole("button", { name: /Open Explorer filters and ranking/ });
    expect(trigger.closest(".view-enter")).toBeNull();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares current Explorer leaders from the desktop scout board", async () => {
    mockViewport(1280);
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("saves current Scout Board finalists into the shortlist in ranked order", async () => {
    mockViewport(1280);
    renderApp();

    const actions = screen.getByLabelText(/Scout actions for/);
    fireEvent.click(within(actions).getByRole("button", { name: /Save 4 Scout Board finalists to your shortlist/ }));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("terraclima.bookmarks.v1") ?? "[]") as string[];
      expect(saved).toHaveLength(4);
    });
    expect(screen.getByText(/Saved 4 new finalists/)).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("terraclima.bookmarks.v1") ?? "[]") as string[];
    expect(screen.getByLabelText("Shortlist scout packet status")).toHaveTextContent("Scout packet ready");

    fireEvent.click(screen.getByRole("button", { name: "Compare 4 pinned places from your shortlist" }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent(saved.join(","));
  }, APP_SHELL_TIMEOUT_MS);

  it("pins the desktop Scout Board leader into the shortlist", async () => {
    mockViewport(1280);
    renderApp();

    const actions = screen.getByLabelText(/Scout actions for/);
    const pinButton = within(actions).getByRole("button", { name: /Pin .* to your shortlist/ });
    fireEvent.click(pinButton);

    await waitFor(() => expect(pinButton).toHaveAttribute("aria-pressed", "true"));
    expect(within(actions).getByRole("button", { name: /Unpin .* from your shortlist/ })).toHaveTextContent("Pinned");
    expect(screen.getByText(/Your shortlist · 1/)).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares distinct context leaders from the stress test", async () => {
    mockViewport(1280);
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Compare context top picks/ }));

    expect(await screen.findByRole("dialog", { name: /places side by side/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("applies alternate context presets from the Explorer hero", async () => {
    mockViewport(1280);
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

  it("keeps the chosen units when navigating Back to an entry without unit params", async () => {
    window.history.replaceState(null, "", "/?temp=C&dist=metric");
    renderApp();

    expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "true");

    // Simulate Back to a history entry created before the unit toggle: its URL
    // carries no temp/dist param. Units are a sticky global preference, so the
    // navigation must not silently revert them (and overwrite the saved value).
    window.history.replaceState(null, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "true");
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

  it("isolates the app shell while a shared compare URL is open, then restores it on close", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa");
    const { container } = renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
    const shell = container.querySelector("[data-app-shell]");
    expect(shell).not.toBeNull();

    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));
    expect(shell).toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "Close comparison" }));

    await waitFor(() => expect(shell).not.toHaveAttribute("aria-hidden"));
    expect(shell).not.toHaveAttribute("inert");
  }, APP_SHELL_TIMEOUT_MS);

  it("isolates the app shell while a place detail deep link is open", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
    const { container } = renderApp();

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toBeInTheDocument();
    const shell = container.querySelector("[data-app-shell]");
    expect(shell).not.toBeNull();

    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));
    expect(shell).toHaveAttribute("inert");
  }, APP_SHELL_TIMEOUT_MS);

  it("preserves a dossier hash during initial open-place URL sync", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa#deep-sequim-hydrology");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.search).toBe("?p=sequim-wa");
      expect(window.location.hash).toBe("#deep-sequim-hydrology");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("marks the place detail layer hidden when compare is stacked above it", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa&cmp=sequim-wa,port-townsend-wa");
    const { container } = renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
    const detail = container.querySelector("[data-testid='place-detail-mock']");
    expect(detail).not.toBeNull();
    expect(detail).toHaveAttribute("aria-hidden", "true");
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

  it("clears all filters from URL and restores results after empty-results clear", async () => {
    window.history.replaceState(
      null,
      "",
      "/?r=live-fit&fit=cool-summers&sh=22&wl=2&grow=75&fire=low&risk=moderate&q=zzzznonexistent",
    );

    renderApp();

    expect(screen.getByText("Nothing matches that search and those filters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("fit")).toBeNull();
      expect(params.get("sh")).toBeNull();
      expect(params.get("wl")).toBeNull();
      expect(params.get("grow")).toBeNull();
      expect(params.get("fire")).toBeNull();
      expect(params.get("risk")).toBeNull();
      expect(params.get("q")).toBeNull();
      expect(screen.queryByText("Nothing matches that search and those filters")).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces the search keyboard shortcut in the desktop tips", async () => {
    window.history.replaceState(null, "", "/");

    renderApp();

    // ⌘K on Mac, "Ctrl K" elsewhere (jsdom is non-Mac) — either way the search
    // shortcut must be discoverable, not just "/".
    expect(screen.getByText(/⌘K|Ctrl K/)).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("shows a search-specific empty state when only a search is active", async () => {
    window.history.replaceState(null, "", "/?q=zzzznonexistent");

    renderApp();

    // Search-only: blame the query, not "filters", and offer to clear the search.
    expect(screen.getByText("No places match “zzzznonexistent”")).toBeInTheDocument();
    // "Clear search" appears both in the empty-results panel and as the in-field
    // search clear (FilterBar) — the affordance is present.
    expect(screen.getAllByRole("button", { name: "Clear search" }).length).toBeGreaterThanOrEqual(1);
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

  it("does not crash when bookmark persistence throws on toggle", () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa"]),
    );
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = ((key: string, value: string) => {
      if (key === "terraclima.bookmarks.v1") throw new Error("quota");
      return originalSetItem(key, value);
    }) as typeof window.localStorage.setItem;

    renderApp();

    expect(screen.getByText(/Your shortlist · 1/)).toBeInTheDocument();
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Unpin Sequim from your shortlist" }));
    }).not.toThrow();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpin Sequim from your shortlist" })).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the shortlist decision cue hidden until at least two finalists are pinned", () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa"]),
    );

    renderApp();

    expect(screen.getByLabelText("Shortlist scout packet status")).toHaveTextContent("Scout packet warming up");
    expect(screen.queryByLabelText("Shortlist packet decision cue")).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("renders the pinned shortlist rail when bookmarks exist in localStorage", () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa"]),
    );
    renderApp();
    expect(screen.getByText(/Your shortlist · 2/)).toBeInTheDocument();
    const readiness = screen.getByLabelText("Shortlist scout packet status");
    expect(readiness).toHaveTextContent("Scout packet ready");
    expect(readiness).toHaveTextContent("Compare 2 finalists or export a Scout plan");
    const packet = screen.getByLabelText("Shortlist packet decision cue");
    expect(packet).toHaveTextContent("Scout packet");
    expect(packet).toHaveTextContent(/Start with/);
    expect(packet).toHaveTextContent("Watch:");
    expect(within(packet).getByRole("button", { name: /Open first shortlist dossier:/ })).toBeInTheDocument();
    expect(within(packet).getByRole("button", { name: /Open shortlist contrast dossier:/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Sequim from your shortlist/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares pinned shortlist finalists in pinned order", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa", "portal-az"]),
    );
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Compare 3 pinned places from your shortlist" }));

    expect(await screen.findByRole("dialog", { name: "3 places side by side" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent("sequim-wa,port-townsend-wa,portal-az");
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

    fireEvent.click(await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS }));
    expect((window.history.state as { tcPlace?: boolean } | null)?.tcPlace).toBeFalsy();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);
    await screen.findByLabelText("Search places by name, region, or archetype", {}, { timeout: APP_SHELL_TIMEOUT_MS });
    fireEvent.click(screen.getAllByRole("button", { name: "USA" })[0]);

    await waitFor(() => {
      expect(window.location.search).toMatch(/c=USA/);
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    expect((window.history.state as { tcPlace?: boolean } | null)?.tcPlace).toBeFalsy();
  }, APP_SHELL_TIMEOUT_MS);

  it("clears a non-empty Explorer search on Escape without closing anything else", async () => {
    renderApp();

    const search = screen.getByLabelText(
      "Search places by name, region, or archetype",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "sequim" } });
    expect(search.value).toBe("sequim");

    search.focus();
    fireEvent.keyDown(search, { key: "Escape" });

    await waitFor(() => {
      expect(search.value).toBe("");
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("focuses the Explorer search on Ctrl+K from outside the dock", async () => {
    renderApp();

    const search = screen.getByLabelText(
      "Search places by name, region, or archetype",
    ) as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(document.activeElement).toBe(search);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("selects existing search text when Ctrl+K focuses the search input", async () => {
    renderApp();

    const search = screen.getByLabelText(
      "Search places by name, region, or archetype",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "rain shadow" } });
    // Move focus away so the shortcut has somewhere to land from.
    (document.body as HTMLElement).focus();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(document.activeElement).toBe(search);
      // Select-on-focus: the entire value is selected so the next keystroke replaces it.
      expect(search.selectionStart).toBe(0);
      expect(search.selectionEnd).toBe("rain shadow".length);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);
});
