// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

const APP_SHELL_TIMEOUT_MS = 30000;
const DEG = "\u00b0";
const CELSIUS_LABEL = "Use Celsius temperatures";
const METRIC_DISTANCE_LABEL = "Use kilometers, meters, and millimeters";

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
    onRemove,
    onCopyView,
    shareStatus,
    liveFitFilters,
    candidates,
    comparisonLens,
    onComparisonLensChange,
    occluded,
    onOpenPlace,
    scenario,
  }: {
    places: Array<{ id: string }>;
    open: boolean;
    onClose: () => void;
    onRemove: (id: string) => void;
    onCopyView?: () => void;
    shareStatus?: "idle" | "shared" | "copied" | "failed";
    candidates?: Array<{ place: { id: string } }>;
    comparisonLens?: string;
    onComparisonLensChange?: (lens: "risk") => void;
    liveFitFilters?: {
      fitPresets?: Set<string>;
      maxSummerHighC?: number;
    };
    occluded?: boolean;
    onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
    scenario?: string;
  }) =>
    open && places.length > 0 ? (
      <div
        role="dialog"
        aria-label={places.length === 1 ? "1 place saved to compare" : `${places.length} places side by side`}
        aria-hidden={occluded ? "true" : undefined}
        data-testid="compare-view-mock"
        data-scenario={scenario ?? "now"}
      >
        <button type="button" aria-label="Close comparison" onClick={onClose}>
          Close comparison
        </button>
        {places.map(place => (
          <button
            key={place.id}
            type="button"
            aria-label={`Remove ${place.id} from comparison`}
            onClick={() => onRemove(place.id)}
          >
            Remove {place.id}
          </button>
        ))}
        {onOpenPlace
          ? places.map(place => (
              <button
                key={`open-${place.id}`}
                type="button"
                aria-label={`Open ${place.id} from comparison`}
                onClick={event => onOpenPlace(place.id, { trigger: event.currentTarget })}
              >
                Open {place.id}
              </button>
            ))
          : null}
        <div data-testid="compare-place-ids">{places.map(place => place.id).join(",")}</div>
        <div data-testid="compare-lens">{comparisonLens}</div>
        <div data-testid="compare-candidate-count">{candidates?.length ?? 0}</div>
        {onComparisonLensChange ? (
          <button type="button" aria-label="Set risk comparison lens" onClick={() => onComparisonLensChange("risk")}>
            Risk lens
          </button>
        ) : null}
        {onCopyView ? (
          <button type="button" aria-label="Copy or share comparison link" onClick={onCopyView}>
            {shareStatus === "shared" ? "Shared" : shareStatus === "copied" ? "Link copied" : shareStatus === "failed" ? "Manual copy" : "Copy comparison"}
          </button>
        ) : null}
        {scenario && scenario !== "now" ? (
          <div data-testid="compare-scenario-banner">Projected layer: {scenario}</div>
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
    animateEntry,
    scenario,
    place,
  }: {
    onClose: () => void;
    occluded?: boolean;
    animateEntry?: boolean;
    scenario?: string;
    place?: { id: string };
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
      data-animate-entry={animateEntry ? "true" : "false"}
      data-place-id={place?.id}
      data-scenario={scenario ?? "now"}
    >
      {residencyFitContext ? (
        <div data-testid="place-detail-fit-context">
          {residencyFitContext.bundleLabel ? `${residencyFitContext.bundleLabel} / ` : ""}
          {residencyFitContext.bundleCue ? `${residencyFitContext.bundleCue} / ` : ""}
          {residencyFitContext.rankingLabel}
        </div>
      ) : null}
      {scenario && scenario !== "now" ? (
        <div data-testid="place-detail-scenario-honesty">
          Explorer uses {scenario}; dossier stays on recent observed normals
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

/** Opens the hero overflow menu so Copy / Scouting tools are exposed. */
function openHeroMoreMenu() {
  const more = screen.getByRole("button", { name: "More atlas actions" });
  if (more.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(more);
  }
  expect(more).toHaveAttribute("aria-expanded", "true");
}

/** Scout Board / Living Compass / signal rails stay collapsed until asked for. */
function openScoutTools() {
  openHeroMoreMenu();
  const toggle = screen.getByRole("button", { name: "Show scouting tools" });
  fireEvent.click(toggle);
  openHeroMoreMenu();
  expect(screen.getByRole("button", { name: "Hide scouting tools" })).toBeInTheDocument();
}

function clickCopyView() {
  openHeroMoreMenu();
  fireEvent.click(screen.getByRole("button", { name: "Copy or share current Explorer view" }));
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
    vi.unstubAllGlobals();
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

  it("uses a semantic main landmark as the skip-link target", () => {
    const { container } = renderApp();
    const skipLink = screen.getByText("Skip to main content");
    const main = screen.getByRole("main");

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(main).toHaveAttribute("id", "main-content");
    expect(container.querySelector("main#main-content")).toBe(main);
  }, APP_SHELL_TIMEOUT_MS);

  it("gives direct information routes a visible h1 for orientation", () => {
    window.history.replaceState(null, "", "/?v=collections");
    const { unmount } = renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "Collections" })).toBeInTheDocument();
    unmount();

    cleanup();
    window.history.replaceState(null, "", "/?v=learn");
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "Field guide" })).toBeInTheDocument();
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

  it("opens Learn example profiles without leaving the Learn route", async () => {
    window.history.replaceState(null, "", "/?v=learn");
    renderApp();

    const example = await screen.findByRole(
      "button",
      { name: "Open Huachuca Sky Island profile from Learn concept: Microclimate" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    fireEvent.click(example);

    await waitFor(() => {
      expect(screen.getByTestId("place-detail-mock")).toHaveAttribute("data-animate-entry", "true");
      expect(window.location.search).toContain("v=learn");
      expect(window.location.search).toContain("p=huachuca-az");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("opens Collections place profiles without leaving the Collections route", async () => {
    window.history.replaceState(null, "", "/?v=collections");
    renderApp();

    const collectionPlace = await screen.findByRole(
      "button",
      { name: "Open Sequim profile from Rain-Shadow Sanctuaries collection: Easy 77 | Comfort" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    fireEvent.click(collectionPlace);

    await waitFor(() => {
      expect(screen.getByTestId("place-detail-mock")).toHaveAttribute("data-animate-entry", "true");
      expect(window.location.search).toContain("v=collections");
      expect(window.location.search).toContain("p=sequim-wa");
    });

    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByTestId("place-detail-mock")).not.toBeInTheDocument();
      expect(window.location.search).toContain("v=collections");
      expect(window.location.search).not.toContain("p=sequim-wa");
      expect(collectionPlace).toHaveFocus();
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("lands focus on the active collection clear control after pinning from Collections", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]);
    const pinButton = await screen.findByRole(
      "button",
      { name: "Pin Rain-Shadow Sanctuaries collection" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    fireEvent.click(pinButton);

    await waitFor(() => {
      const clear = screen.getByRole("button", { name: /Clear .* collection filter/ });
      expect(clear).toHaveFocus();
      expect(clear).toHaveAttribute("title", clear.getAttribute("aria-label"));
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("moves focus to main content after clearing an active collection scope", async () => {
    window.history.replaceState(null, "", "/?col=rain-shadows");

    renderApp();

    const clear = await screen.findByRole(
      "button",
      { name: "Clear Rain-Shadow Sanctuaries collection filter" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    fireEvent.click(clear);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Clear Rain-Shadow Sanctuaries collection filter" })).not.toBeInTheDocument();
      expect(document.getElementById("main-content")).toHaveFocus();
      expect(window.location.search).toBe("");
    });
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
    openScoutTools();

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
    openScoutTools();

    const scoutBoard = screen.getByLabelText("Desktop relocation workbench");
    const advisorVerdict = screen.getByText("Advisor verdict");
    const compactEvidence = screen.getByLabelText("Compact desktop shortlist evidence");
    const signalRail = screen.getByLabelText(/climate signal leaders/i);
    const currentRank = screen.getByText("Current rank");
    const contextStress = screen.getByText("Context stress test");

    expect(advisorVerdict.closest(".desktop-scout-board")).toBe(scoutBoard);
    expect(compactEvidence.closest(".desktop-scout-board")).toBe(scoutBoard);
    const leaderButton = within(scoutBoard).getByRole("button", { name: /Open .* from the desktop relocation workbench/ });
    expect(leaderButton).toHaveAttribute("title", leaderButton.getAttribute("aria-label"));
    expect(within(compactEvidence).getByText("Decision matrix")).toBeInTheDocument();
    expect(within(compactEvidence).getAllByRole("button", { name: /desktop decision matrix/ }).length).toBe(3);
    const actions = screen.getByLabelText(/Scout actions for/);
    expect(actions.closest(".desktop-scout-board")).toBe(scoutBoard);
    const dossierButton = within(actions).getByRole("button", { name: /Open .* climate dossier from the Scout Board/ });
    const compareButton = within(actions).getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ });
    expect(dossierButton).toBeInTheDocument();
    expect(dossierButton).toHaveAttribute("title", dossierButton.getAttribute("aria-label"));
    expect(compareButton).toBeInTheDocument();
    expect(compareButton).toHaveAttribute("title", "Compare current Scout Board finalists: 4 places");
    const saveButton = within(actions).getByRole("button", { name: /Save 4 Scout Board finalists to your shortlist/ });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toHaveAttribute("title", saveButton.getAttribute("aria-label"));
    const pinButton = within(actions).getByRole("button", { name: /Pin .* to your shortlist/ });
    expect(pinButton).toHaveAttribute("aria-pressed", "false");
    expect(pinButton).toHaveAttribute("title", pinButton.getAttribute("aria-label"));
    expect(scoutBoard.compareDocumentPosition(signalRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoutBoard.compareDocumentPosition(currentRank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoutBoard.compareDocumentPosition(contextStress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, APP_SHELL_TIMEOUT_MS);

  it("starts new sessions with most-unique as the default Explorer ranking", () => {
    mockViewport(1280);
    renderApp();

    expect(screen.getByRole("heading", { name: "Discover microclimates hiding in plain sight" })).toBeInTheDocument();
    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    expect(quickPicks).toBeInTheDocument();
    expect(quickPicks).toHaveTextContent("Most unique");
    const quickPickButtons = within(quickPicks).getAllByRole("button");
    expect(quickPickButtons.map(button => button.getAttribute("aria-label"))).toEqual([
      "Most unique: Rank places by microclimate uniqueness.",
      "Most comfortable: Rank by felt temperature, atmosphere, usable months, hazards, and daily friction.",
      "Hidden gems: Surface lesser-known stops with strong atlas signal.",
      "Cool summers: Find places where peak-season afternoons stay restrained.",
      "Fog & marine: Filter to fog belts, cool maritime coasts, and upwelling shores.",
      "Another country: Pin the climate-dissonance trip: places that feel unlike their map.",
      "Visit now: Rank places by the current month's scouting weather.",
    ]);
    expect(quickPickButtons[0]).toHaveAttribute("title", "Most unique: Rank places by microclimate uniqueness.");
    expect(document.querySelector(".tc-map-stage__caption strong")).toHaveTextContent("Most unique · top 5");
    expect(screen.queryByLabelText("Desktop relocation workbench")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/climate signal leaders/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More atlas actions" })).toBeInTheDocument();
    openHeroMoreMenu();
    expect(screen.getByRole("button", { name: "Show scouting tools" })).toBeInTheDocument();
    expect(screen.queryByText("2050 mid remap")).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("explains and visibly marks the unfiltered comfort lens from a shared Explorer URL", () => {
    mockViewport(390);
    window.history.replaceState(null, "", "/?r=most-comfortable");
    renderApp();

    const hero = document.querySelector<HTMLElement>(".panel-hero");
    expect(hero).not.toBeNull();
    expect(within(hero!).getByText("Comfort lens · full atlas")).toBeInTheDocument();
    expect(within(hero!).getByText(/day-to-day comfort read balancing felt temperature/i)).toBeInTheDocument();
    expect(within(hero!).getByText(/Open a leader to see the score and first tradeoff/i)).toBeInTheDocument();

    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    expect(within(quickPicks).getByRole("button", { name: /Most comfortable:/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(quickPicks).getByRole("button", { name: /Most unique:/ })).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector(".tc-map-stage__caption strong")).toHaveTextContent("Most comfortable · top 5");
  }, APP_SHELL_TIMEOUT_MS);

  it("labels the comfort lens as filtered when a shared URL narrows the atlas", () => {
    mockViewport(390);
    window.history.replaceState(null, "", "/?r=most-comfortable&c=Canada");
    renderApp();

    const hero = document.querySelector<HTMLElement>(".panel-hero");
    expect(hero).not.toBeNull();
    expect(within(hero!).getByText("Comfort lens · filtered view")).toBeInTheDocument();
    expect(within(hero!).queryByText("Comfort lens · full atlas")).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces the current Scout Brief leader in the Explorer hero", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const receipt = await screen.findByLabelText(/Current scout read:/);
    expect(receipt).toHaveTextContent("Current scout read");
    expect(receipt).toHaveTextContent(/\/100 Most unique/);
    expect(receipt).toHaveTextContent("compare-ready finalists");
    expect(receipt).toHaveTextContent("Verify first");
    expect(within(receipt).getByRole("button", { name: /Open current scout dossier:/ })).toBeInTheDocument();

    fireEvent.click(within(receipt).getByRole("button", { name: /Compare 4 current scout finalists/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps a pinned Climate Trips route travel-oriented in the Explorer hero", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?col=places-that-feel-like-another-country");

    renderApp();

    const receipt = await screen.findByLabelText("Active trip route: Places That Feel Like Another Country");
    expect(receipt).toHaveTextContent("Trip route active");
    expect(receipt).toHaveTextContent("tourism appeal");
    expect(receipt).toHaveTextContent("stops in view");
    expect(receipt).toHaveTextContent("Field check");
    expect(screen.queryByLabelText(/Current scout read:/)).not.toBeInTheDocument();
    expect(within(receipt).getByRole("button", { name: /Open trip lead:/ })).toBeInTheDocument();

    fireEvent.click(within(receipt).getByRole("button", {
      name: "Compare 4 trip stops for Places That Feel Like Another Country",
    }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces a future scenario remap when the Explorer opens on a 2050 layer", () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?scn=ssp245&r=live-fit");

    renderApp();

    expect(screen.getByText("2050 mid remap")).toBeInTheDocument();
    expect(screen.getByText(/2050 mid reranks live-here fit against projected 2041-2060 normals/i)).toBeInTheDocument();
    expect(screen.getByLabelText("2050 mid remap summary")).toHaveTextContent(/2050.*SSP2-4\.5/);
    const projectedLeaders = screen.getByLabelText("2050 mid projected leaders");
    expect(within(projectedLeaders).getAllByRole("button", { name: /projected 2050 mid rank/ }).length).toBeGreaterThan(0);
    expect(projectedLeaders).toHaveTextContent("Summer");
    expect(document.body).toHaveTextContent(/ranked by 2050 mid .* Live-here fit/);
  }, APP_SHELL_TIMEOUT_MS);

  it("applies the hero Cool summers path as a discovery ranking", async () => {
    mockViewport(1280);
    renderApp();

    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    fireEvent.click(within(quickPicks).getByRole("button", { name: /Cool summers/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("r")).toBe("coolest-summers");
      expect(params.get("fit")).toBeNull();
      expect(params.get("sh")).toBeNull();
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("summarizes the active Fit Finder path in the Explorer hero", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?r=coolest-summers&fit=cool-summers&sh=26");
    renderApp();

    const receipt = await screen.findByLabelText("Active Fit Finder path: Cool Summer Refuge");
    expect(receipt).toHaveTextContent("Fit Finder path active");
    expect(receipt).toHaveTextContent("Cool Summer Refuge");
    expect(receipt).toHaveTextContent("Rank by Coolest summers");
    expect(receipt).toHaveTextContent(new RegExp(`summer <= (26${DEG}C|79${DEG}F)`));
    expect(within(receipt).getByRole("button", { name: /Open first scout dossier:/ })).toBeInTheDocument();

    fireEvent.click(within(receipt).getByRole("button", { name: /Compare 4 Fit Finder leaders/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("summarizes the active Fit Finder path in the map caption", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?r=coolest-summers&fit=cool-summers&sh=26");
    renderApp();

    await screen.findByLabelText("Active Fit Finder path: Cool Summer Refuge");

    const caption = document.querySelector(".tc-map-stage__caption");
    expect(caption).toHaveAttribute("data-mode", "fit-path");
    expect(caption).toHaveTextContent("Fit path map");
    expect(caption).toHaveTextContent("Cool Summer Refuge");
    expect(caption).toHaveTextContent(/Scout lead .+ \/ 4 finalists/);
    expect(caption).toHaveAccessibleName(/Map follows the active Cool Summer Refuge Fit Finder path/);
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

  it("keeps the mobile Explorer hero compact and defers dense panels until Scout tools open", () => {
    mockViewport(390);
    renderApp();

    const hero = document.querySelector(".panel-hero");
    const map = screen.getByTestId("atlas-map-stub");

    expect(hero).not.toBeNull();
    expect(hero).toHaveAttribute("data-compact", "false");
    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    expect(quickPicks).toBeInTheDocument();
    expect(quickPicks).toHaveAccessibleDescription("Swipe or scroll horizontally to browse more discovery paths.");
    const surpriseMe = screen.getByRole("button", { name: "Open a unique microclimate from the current filtered list" });
    const mapFirst = screen.getByRole("button", { name: "Compact atlas intro for the map" });
    expect(mapFirst).toHaveTextContent("Map first");
    fireEvent.click(mapFirst);
    expect(hero).toHaveAttribute("data-compact", "true");
    expect(screen.getByRole("button", { name: "Expand atlas intro" })).toHaveTextContent("Expand intro");
    // Latched compact must survive scroll/resize noise from the map-first heuristic.
    fireEvent.scroll(window);
    fireEvent(window, new Event("resize"));
    expect(hero).toHaveAttribute("data-compact", "true");
    fireEvent.click(screen.getByRole("button", { name: "Expand atlas intro" }));
    expect(hero).toHaveAttribute("data-compact", "false");
    fireEvent.click(screen.getByRole("button", { name: "Compact atlas intro for the map" }));
    expect(hero).toHaveAttribute("data-compact", "true");
    openHeroMoreMenu();
    const copyView = screen.getByRole("button", { name: "Copy or share current Explorer view" });
    expect(copyView.closest(".hero-action-stack")).not.toBeNull();
    expect(copyView).toHaveAttribute("title", "Copy or share current Explorer view");
    expect(surpriseMe).toHaveAttribute("title", "Open a unique microclimate from the current filtered list");
    expect(screen.queryByRole("button", { name: "Jump to Scout Brief synthesis" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/climate signal leaders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Livability lens/)).not.toBeInTheDocument();

    openScoutTools();

    const currentRank = screen.getByText("Current rank");
    const scoutBrief = screen.getByRole("region", { name: "Scout brief" });
    const signalRail = screen.getByLabelText(/climate signal leaders/i);
    openHeroMoreMenu();
    const scoutBriefJump = screen.getByRole("button", { name: "Jump to Scout Brief synthesis" });
    expect(scoutBriefJump.closest(".hero-action-stack")).not.toBeNull();
    expect(scoutBriefJump).toHaveAttribute("title", "Jump to Scout Brief synthesis");
    expect(signalRail).toBeInTheDocument();
    expect(signalRail).toHaveAccessibleDescription("Swipe or scroll horizontally to browse more current climate signal leaders.");
    expect(screen.getByLabelText("Scenario leaders for the current place context")).toHaveAccessibleDescription(
      "Swipe or scroll horizontally to browse alternate context leaders and apply a different scouting lens.",
    );
    expect(screen.getByText(/Livability lens/)).toBeInTheDocument();
    const livabilityRankOneChips = screen.getAllByRole("button", { name: /Livability rank 1\./ });
    expect(livabilityRankOneChips.length).toBeGreaterThan(0);
    livabilityRankOneChips.forEach(chip => {
      expect(chip).toHaveAttribute("title", chip.getAttribute("aria-label"));
    });
    expect(hero!.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map.compareDocumentPosition(currentRank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map.compareDocumentPosition(scoutBrief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scoutBrief).toHaveAttribute("id", "explorer-scout-brief");
    expect(scoutBrief).toHaveAttribute("tabindex", "-1");
    fireEvent.click(scoutBriefJump);
    expect(scoutBrief).toHaveFocus();
    expect(screen.getByText("Advisor verdict")).toBeInTheDocument();
    const scoutBriefSection = scoutBrief.closest(".scout-brief");
    expect(scoutBriefSection).not.toBeNull();
    const openLeader = within(scoutBriefSection as HTMLElement).getByRole("button", { name: /Open scout brief leader/ });
    const leaderCard = within(scoutBriefSection as HTMLElement).getByRole("button", { name: /current best match/ });
    const compareLeaders = within(scoutBriefSection as HTMLElement).getByRole("button", { name: "Compare current leaders: 4 places" });
    const saveFinalists = within(scoutBriefSection as HTMLElement).getByRole("button", { name: /Save 4 Scout Brief finalists to your shortlist/ });
    expect(openLeader).toHaveAttribute("title", openLeader.getAttribute("aria-label"));
    expect(leaderCard).toHaveAttribute("title", leaderCard.getAttribute("aria-label"));
    expect(compareLeaders).toHaveAttribute("title", "Compare current leaders: 4 places");
    expect(saveFinalists).toHaveAttribute("title", "Save 4 Scout Brief finalists to your shortlist");
  }, APP_SHELL_TIMEOUT_MS);

  it("anchors the desktop Scout brief jump to the relocation workbench", () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const scoutBriefJump = screen.getByRole("button", { name: "Jump to Scout Brief synthesis" });
    const workbench = screen.getByLabelText("Desktop relocation workbench");
    expect(workbench).toHaveAttribute("id", "explorer-scout-brief");
    expect(workbench).toHaveAttribute("tabindex", "-1");
    fireEvent.click(scoutBriefJump);
    expect(workbench).toHaveFocus();
    expect(document.querySelectorAll("#explorer-scout-brief")).toHaveLength(1);
  }, APP_SHELL_TIMEOUT_MS);

  it("applies Fog & marine and Another country discovery quick picks", async () => {
    mockViewport(1280);
    renderApp();

    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    fireEvent.click(within(quickPicks).getByRole("button", { name: /Fog & marine/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("r")).toBe("coolest-summers");
      expect(params.get("a")).toMatch(/fog-belt-coast/);
      expect(params.get("a")).toMatch(/cool-summer-maritime/);
    });

    fireEvent.click(within(quickPicks).getByRole("button", { name: /Another country/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("col")).toBe("places-that-feel-like-another-country");
    });
    expect(await screen.findByLabelText("Active trip route: Places That Feel Like Another Country")).toBeInTheDocument();
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
    openScoutTools();

    fireEvent.click(screen.getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the Compare opener after closing Compare", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const opener = screen.getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ });
    fireEvent.click(opener);
    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close comparison" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("hands Compare → dossier focus without racing the Compare restore retries", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const opener = screen.getByRole("button", { name: /Compare current Scout Board finalists: 4 places/ });
    fireEvent.click(opener);
    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();

    const openFromCompare = screen.getByRole("button", { name: "Open death-valley-ca from comparison" });
    fireEvent.click(openFromCompare);

    const profile = await screen.findByRole("dialog", { name: "Place profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect(screen.queryByRole("dialog", { name: "4 places side by side" })).not.toBeInTheDocument();

    // Delayed Compare restore (80ms / 240ms) must not steal focus back to the Compare launcher.
    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 280));
    });
    expect(profile).toBeInTheDocument();
    expect(document.activeElement).not.toBe(opener);

    fireEvent.click(within(profile).getByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Place profile" })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(opener);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("hands Compare → dossier focus under a 2050 scenario without mixing focus restores", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?scn=ssp245&cmp=sequim-wa,portal-az");
    renderApp();

    const compare = await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect(compare).toHaveAttribute("data-scenario", "ssp245");
    expect(screen.getByTestId("compare-scenario-banner")).toHaveTextContent(/ssp245/i);

    const openFromCompare = screen.getByRole("button", { name: "Open sequim-wa from comparison" });
    fireEvent.click(openFromCompare);

    const profile = await screen.findByRole("dialog", { name: "Place profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect(screen.queryByRole("dialog", { name: "2 places side by side" })).not.toBeInTheDocument();
    expect(profile).toHaveAttribute("data-scenario", "ssp245");
    expect(screen.getByTestId("place-detail-scenario-honesty")).toHaveTextContent(/recent observed normals/i);

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 280));
    });
    expect(profile).toBeInTheDocument();

    fireEvent.click(within(profile).getByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Place profile" })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect(new URLSearchParams(window.location.search).get("scn")).toBe("ssp245");
  }, APP_SHELL_TIMEOUT_MS);

  it("canonicalizes place-id aliases into shared dossier URLs", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?p=san-miguel-mx");
    renderApp();

    const profile = await screen.findByRole("dialog", { name: "Place profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    expect(profile).toHaveAttribute("data-place-id", "san-miguel-de-allende-mx");
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("p")).toBe("san-miguel-de-allende-mx");
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("localizes Climate Signal rail tooltips in Fahrenheit mode", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const rail = await screen.findByLabelText(/climate signal leaders/i, undefined, { timeout: APP_SHELL_TIMEOUT_MS });
    const notes = rail.querySelectorAll(".climate-signal-rail__note");
    expect(notes.length).toBeGreaterThan(0);
    for (const note of Array.from(notes)) {
      const title = note.getAttribute("title") ?? "";
      expect(title).not.toMatch(/\d+\s*°C|\d+\s*°\s*C|\bCelsius\b/i);
      expect(title).not.toMatch(/\b\d+\s*m\b(?!\w)/);
    }
  }, APP_SHELL_TIMEOUT_MS);

  it("saves current Scout Board finalists into the shortlist in ranked order", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const actions = screen.getByLabelText(/Scout actions for/);
    fireEvent.click(within(actions).getByRole("button", { name: /Save 4 Scout Board finalists to your shortlist/ }));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("terraclima.bookmarks.v1") ?? "[]") as string[];
      expect(saved).toHaveLength(4);
    });
    expect(screen.getByText(/Saved 4 new finalists/)).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("terraclima.bookmarks.v1") ?? "[]") as string[];
    expect(screen.getByLabelText("Shortlist scout packet status")).toHaveTextContent("Scout packet ready");

    fireEvent.click(screen.getByRole("button", { name: "Open Compare Workbench for 4 pinned places from your shortlist" }));

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent(saved.join(","));
  }, APP_SHELL_TIMEOUT_MS);

  it("pins the desktop Scout Board leader into the shortlist", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const actions = screen.getByLabelText(/Scout actions for/);
    const pinButton = within(actions).getByRole("button", { name: /Pin .* to your shortlist/ });
    expect(pinButton).toHaveAttribute("title", pinButton.getAttribute("aria-label"));
    fireEvent.click(pinButton);

    await waitFor(() => expect(pinButton).toHaveAttribute("aria-pressed", "true"));
    const pinnedButton = within(actions).getByRole("button", { name: /Unpin .* from your shortlist/ });
    expect(pinnedButton).toHaveTextContent("Pinned");
    expect(pinnedButton).toHaveAttribute("title", pinnedButton.getAttribute("aria-label"));
    const dismiss = screen.getByRole("button", { name: "Dismiss message" });
    expect(dismiss).toHaveAttribute("title", "Dismiss message");
    fireEvent.click(dismiss);
    expect(screen.queryByText(/Pinned .* to your shortlist/)).not.toBeInTheDocument();
    expect(screen.getByText(/Your shortlist · 1/)).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares distinct context leaders from the stress test", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    const contextRail = screen.getByLabelText("Scenario leaders for the current place context");
    const currentContextOpen = within(contextRail).getByRole("button", { name: /Open .* from Current setup/ });
    expect(currentContextOpen).toHaveAttribute("title", currentContextOpen.getAttribute("aria-label"));

    fireEvent.click(screen.getByRole("button", { name: /Compare context top picks/ }));

    expect(await screen.findByRole("dialog", { name: /places side by side/ }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("applies alternate context presets from the Explorer hero", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

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

    clickCopyView();

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("q")).toBe("monterey");
    expect(copied.searchParams.get("r")).toBe("live-fit");
    const copiedButton = await screen.findByRole("button", { name: "Copied current Explorer view link" });
    expect(copiedButton).toHaveTextContent("Link copied");
    expect(copiedButton).toHaveAttribute("title", "Copied current Explorer view link");
  }, APP_SHELL_TIMEOUT_MS);

  it("offers a selectable share URL when browser copy APIs are blocked", async () => {
    const originalExecCommand = document.execCommand;
    const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false) as unknown as typeof document.execCommand;
    window.history.replaceState(null, "", "/?q=monterey&temp=C&dist=metric");

    try {
      renderApp();

      clickCopyView();

      const failedButton = await screen.findByRole("button", { name: "Retry copy or use the selected manual Explorer URL" });
      expect(failedButton).toHaveTextContent("Manual copy");
      const manualUrl = await screen.findByRole("textbox", { name: "Shareable Explorer URL for manual copy" });
      const manualValue = (manualUrl as HTMLInputElement).value;
      expect(manualValue).toContain("q=monterey");
      expect(manualValue).toContain("temp=C");
      expect(manualValue).toContain("dist=metric");
      await waitFor(() => expect(manualUrl).toHaveFocus());
      await new Promise(resolve => window.setTimeout(resolve, 2400));
      expect(screen.getByRole("textbox", { name: "Shareable Explorer URL for manual copy" })).toHaveValue(manualValue);
      expect(screen.getByRole("button", { name: "Retry copy or use the selected manual Explorer URL" })).toBeInTheDocument();
    } finally {
      document.execCommand = originalExecCommand;
    }
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the Surprise me opener after closing its random profile", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      renderApp();

      const opener = screen.getByRole("button", { name: "Open a unique microclimate from the current filtered list" });
      expect(opener).toHaveAttribute("title", "Open a unique microclimate from the current filtered list");
      fireEvent.click(opener);

      await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
        await new Promise(resolve => window.setTimeout(resolve, 300));
      });

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Close profile" })).not.toBeInTheDocument();
      }, { timeout: APP_SHELL_TIMEOUT_MS });
      await waitFor(() => {
        expect(document.activeElement).toBe(opener);
      }, { timeout: APP_SHELL_TIMEOUT_MS });
    } finally {
      randomSpy.mockRestore();
    }
  }, APP_SHELL_TIMEOUT_MS);

  it("reports native share completion without claiming the link was copied", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    window.history.replaceState(null, "", "/?q=monterey");

    renderApp();

    clickCopyView();

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sharedButton = await screen.findByRole("button", { name: "Shared current Explorer view" });
    expect(sharedButton).toHaveTextContent("Shared");
    expect(sharedButton).toHaveAttribute("title", "Shared current Explorer view");
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("stays idle when the native share sheet is dismissed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("user cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share });

    renderApp();

    clickCopyView();

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      openHeroMoreMenu();
      const copyView = screen.getByRole("button", { name: "Copy or share current Explorer view" });
      expect(copyView).toHaveTextContent("Copy view");
      expect(copyView).toHaveAttribute("title", "Copy or share current Explorer view");
    });
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
    expect(screen.queryByText("Manual copy")).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("preserves unit choices in copied Explorer URLs", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?q=wenatchee");

    renderApp();

    fireEvent.click(screen.getByRole("button", { name: CELSIUS_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL }));

    await waitFor(() => {
      expect(window.location.search).toContain("temp=C");
      expect(window.location.search).toContain("dist=metric");
    });

    clickCopyView();

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("q")).toBe("wenatchee");
    expect(copied.searchParams.get("temp")).toBe("C");
    expect(copied.searchParams.get("dist")).toBe("metric");
  }, APP_SHELL_TIMEOUT_MS);

  it("hydrates unit choices from a shared URL", () => {
    window.history.replaceState(null, "", "/?temp=C&dist=metric");

    renderApp();

    expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveAttribute("aria-pressed", "true");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the chosen units when navigating Back to an entry without unit params", async () => {
    window.history.replaceState(null, "", "/?temp=C&dist=metric");
    renderApp();

    expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveAttribute("aria-pressed", "true");

    // Simulate Back to a history entry created before the unit toggle: its URL
    // carries no temp/dist param. Units are a sticky global preference, so the
    // navigation must not silently revert them (and overwrite the saved value).
    window.history.replaceState(null, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveAttribute("aria-pressed", "true");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps live-fit ranking in shared URLs when live-fit controls are active", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?r=live-fit&fit=cool-summers");

    renderApp();

    clickCopyView();

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("r")).toBe("live-fit");
    expect(copied.searchParams.get("fit")).toBe("cool-summers");
  }, APP_SHELL_TIMEOUT_MS);

  it("opens compare immediately for shared URLs with two or more valid places", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("isolates the app shell while a shared compare URL is open, then restores it on close", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa");
    const { container } = renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
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

  it("opens deep-linked place profiles without the offscreen entry animation", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toHaveAttribute("data-animate-entry", "false");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps a bare profile deep link clean when a different ranking is persisted locally", async () => {
    window.localStorage.setItem("terraclima.ranking.v1", "most-comfortable");
    window.history.replaceState(null, "", "/?p=sequim-wa");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).toBe("?p=sequim-wa");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the Explorer URL clean after closing a bare profile deep link with a persisted ranking", async () => {
    window.localStorage.setItem("terraclima.ranking.v1", "most-comfortable");
    window.history.replaceState(null, "", "/?p=sequim-wa");

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Place profile" })).not.toBeInTheDocument();
      expect(window.location.search).toBe("");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("moves focus to main content after closing a bare profile deep link", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Place profile" })).not.toBeInTheDocument();
      expect(document.getElementById("main-content")).toHaveFocus();
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps an explicit profile ranking in the Explorer URL after closing the deep link", async () => {
    window.localStorage.setItem("terraclima.ranking.v1", "coolest-summers");
    window.history.replaceState(null, "", "/?p=sequim-wa&r=most-comfortable");

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Close profile" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Place profile" })).not.toBeInTheDocument();
      expect(window.location.search).toBe("?r=most-comfortable");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("writes an explicit ?hb= home base through to localStorage on hydrate", async () => {
    window.history.replaceState(null, "", "/?hb=sequim-wa");

    renderApp();

    await screen.findByRole(
      "status",
      { name: "Explorer home base: Sequim" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    expect(JSON.parse(window.localStorage.getItem("terraclima.home-base.v1") ?? "null")).toBe("sequim-wa");
  }, APP_SHELL_TIMEOUT_MS);

  it("purges an unresolved home-base id from localStorage on hydrate", async () => {
    window.localStorage.setItem("terraclima.home-base.v1", JSON.stringify("not-a-real-place-id"));
    window.history.replaceState(null, "", "/");

    renderApp();

    await waitFor(() => {
      expect(window.localStorage.getItem("terraclima.home-base.v1")).toBeNull();
      expect(screen.queryByRole("status", { name: /Explorer home base:/ })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("moves focus to main content after clearing the Explorer home-base anchor", async () => {
    window.history.replaceState(null, "", "/?hb=sequim-wa");

    renderApp();

    const clearHome = await screen.findByRole(
      "button",
      { name: "Stop comparing against Sequim (clear home base)" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    expect(clearHome).toHaveAttribute("title", clearHome.getAttribute("aria-label"));
    fireEvent.click(clearHome);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Stop comparing against Sequim (clear home base)" })).not.toBeInTheDocument();
      expect(document.getElementById("main-content")).toHaveFocus();
      expect(window.location.search).toBe("");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces and clears the active home-base anchor from the Explorer hero", async () => {
    window.history.replaceState(null, "", "/?hb=sequim-wa");

    renderApp();

    const receipt = await screen.findByRole(
      "status",
      { name: "Explorer home base: Sequim" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    expect(receipt).toHaveTextContent("Home base: Sequim");
    expect(receipt).toHaveTextContent("Cards, dossiers, and Compare read climate deltas against this anchor.");
    expect(screen.queryByRole("button", { name: "Find your home-base analog using Explorer search" })).not.toBeInTheDocument();
    openScoutTools();
    const scoutReceipt = screen.getByLabelText(/Current scout read:/);
    expect(receipt.compareDocumentPosition(scoutReceipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const clearHome = within(receipt).getByRole("button", {
      name: "Stop comparing against Sequim from the Explorer hero (clear home base)",
    });
    expect(clearHome).toHaveAttribute("title", clearHome.getAttribute("aria-label"));
    fireEvent.click(clearHome);

    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Explorer home base: Sequim" })).not.toBeInTheDocument();
      expect(document.getElementById("main-content")).toHaveFocus();
      expect(window.location.search).toBe("");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("offers a hero shortcut to find a home-base analog", async () => {
    mockViewport(1280);
    renderApp();

    const findHomeBase = await screen.findByRole(
      "button",
      { name: "Find your home-base analog using Explorer search" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    expect(findHomeBase).toHaveTextContent("Find home base");
    expect(findHomeBase).toHaveAttribute("title", findHomeBase.getAttribute("aria-label"));

    fireEvent.click(findHomeBase);

    const search = screen.getByRole("textbox", { name: "Search places by name, region, or archetype" });
    expect(search).toHaveFocus();
  }, APP_SHELL_TIMEOUT_MS);

  it("opens mobile filters for Find home base and restores focus to that hero action", async () => {
    mockViewport(390);
    renderApp();

    const findHomeBase = await screen.findByRole(
      "button",
      { name: "Find your home-base analog using Explorer search" },
      { timeout: APP_SHELL_TIMEOUT_MS },
    );
    fireEvent.click(findHomeBase);

    const sheet = await screen.findByRole("dialog", { name: "Filters & ranking" });
    expect(sheet).toHaveAttribute("open");
    const search = within(sheet).getByRole("textbox", { name: "Search places by name, region, or archetype" });
    await waitFor(() => expect(search).toHaveFocus(), { timeout: 2000 });

    fireEvent.click(within(sheet).getByRole("button", { name: "Close filters" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Filters & ranking" })).not.toBeInTheDocument();
      expect(findHomeBase).toHaveFocus();
    }, { timeout: 2000 });
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the drawer entry animation for user-opened place profiles", async () => {
    mockViewport(1280);
    renderApp();
    openScoutTools();

    fireEvent.click(screen.getAllByRole("button", { name: /Rank 1\./ })[0]);

    expect(await screen.findByRole("dialog", { name: "Place profile" })).toHaveAttribute("data-animate-entry", "true");
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

    expect(await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    await waitFor(() => {
      const detail = container.querySelector("[data-testid='place-detail-mock']");
      expect(detail).not.toBeNull();
      expect(detail).toHaveAttribute("aria-hidden", "true");
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("copies comparison URLs from the compare dialog", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa&temp=C&dist=metric");

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Copy or share comparison link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("cmp")).toBe("sequim-wa,port-townsend-wa");
    expect(copied.searchParams.get("temp")).toBe("C");
    expect(copied.searchParams.get("dist")).toBe("metric");
    await waitFor(() => expect(screen.getAllByText("Link copied").length).toBeGreaterThan(0));
  }, APP_SHELL_TIMEOUT_MS);

  it("hydrates, changes, and shares the comparison priority lens", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa&clens=move&temp=C");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-lens")).toHaveTextContent("move");

    fireEvent.click(screen.getByRole("button", { name: "Set risk comparison lens" }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("clens")).toBe("risk");
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy or share comparison link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("cmp")).toBe("sequim-wa,port-townsend-wa");
    expect(copied.searchParams.get("clens")).toBe("risk");
    expect(copied.searchParams.get("temp")).toBe("C");
  }, APP_SHELL_TIMEOUT_MS);

  it("clears all filters from URL and restores results after empty-results clear", async () => {
    window.history.replaceState(
      null,
      "",
      "/?r=live-fit&fit=cool-summers&sh=22&wl=2&grow=75&fire=low&risk=moderate&q=zzzznonexistent",
    );

    renderApp();

    expect(screen.getByText("Nothing matches that search and those filters")).toBeInTheDocument();
    const recovery = screen.getByRole("group", { name: "Ways to recover matching places" });
    expect(within(recovery).getByRole("button", { name: /Clear search/ })).toBeInTheDocument();
    expect(within(recovery).getByRole("button", { name: /Relax Live Finder/ })).toBeInTheDocument();
    expect(within(recovery).getByRole("button", { name: /Reset Explorer/ })).toBeInTheDocument();

    fireEvent.click(within(recovery).getByRole("button", { name: /Reset Explorer/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("fit")).toBeNull();
      expect(params.get("sh")).toBeNull();
      expect(params.get("wl")).toBeNull();
      expect(params.get("grow")).toBeNull();
      expect(params.get("fire")).toBeNull();
      expect(params.get("risk")).toBeNull();
      expect(params.get("q")).toBeNull();
      // Auto live-fit from constraints must not stick after a full Explorer reset.
      expect(params.get("r")).toBeNull();
      expect(screen.queryByText("Nothing matches that search and those filters")).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("clears curated collection with filters when Reset Explorer runs", async () => {
    mockViewport(1280);
    window.history.replaceState(
      null,
      "",
      "/?col=rain-shadows&fit=cool-summers&q=zzzznonexistent",
    );

    renderApp();

    expect(screen.getByRole("button", { name: /Clear .* collection filter/ })).toBeInTheDocument();
    const recovery = screen.getByRole("group", { name: "Ways to recover matching places" });
    fireEvent.click(within(recovery).getByRole("button", { name: /Reset Explorer/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("col")).toBeNull();
      expect(params.get("fit")).toBeNull();
      expect(params.get("q")).toBeNull();
      expect(screen.queryByRole("button", { name: /Clear .* collection filter/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Nothing matches that search and those filters")).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("Lens Receipt Clear all clears curated collection together with filters", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?col=rain-shadows&fit=cool-summers&c=USA");

    renderApp();

    expect(screen.getByRole("button", { name: /Clear .* collection filter/ })).toBeInTheDocument();
    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    fireEvent.click(within(lens).getByRole("button", { name: "Clear all filters" }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("col")).toBeNull();
      expect(params.get("fit")).toBeNull();
      expect(params.get("c")).toBeNull();
      expect(screen.queryByRole("button", { name: /Clear .* collection filter/ })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("preserves explicit live-fit ranking on popstate after auto live-fit snapshot", async () => {
    mockViewport(1280);
    window.history.replaceState(null, "", "/?r=most-comfortable&fit=cool-summers");

    renderApp();

    const lens = await screen.findByRole("region", { name: "Current Explorer lens" }, { timeout: APP_SHELL_TIMEOUT_MS });
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("r")).toBe("live-fit");
      expect(within(lens).getByText("Live-here fit")).toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    // Simulate Back/Forward to a history entry that explicitly requests
    // live-fit without Live Finder constraints.
    window.history.replaceState(null, "", "/?r=live-fit");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("r")).toBe("live-fit");
      expect(params.get("fit")).toBeNull();
      expect(within(lens).getByText("Live-here fit")).toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("restores the pre-constraint URL ranking after auto live-fit chip dismiss", async () => {
    mockViewport(1280);
    // Persisted preference differs from the shared URL ranking so a naive
    // loadPersistedRanking() restore would leave the wrong lens.
    window.localStorage.setItem("terraclima.ranking.v1", "coolest-summers");
    window.history.replaceState(null, "", "/?r=most-comfortable&fit=cool-summers");

    renderApp();

    const lens = await screen.findByRole("region", { name: "Current Explorer lens" }, { timeout: APP_SHELL_TIMEOUT_MS });
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("r")).toBe("live-fit");
      expect(within(lens).getByText("Live-here fit")).toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    fireEvent.click(within(lens).getByRole("button", { name: "Remove filter: 1 Live Finder preset" }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("fit")).toBeNull();
      expect(params.get("r")).toBe("most-comfortable");
      expect(window.localStorage.getItem("terraclima.ranking.v1")).toBe("coolest-summers");
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("relaxes Live Finder constraints from the empty state without losing the search", async () => {
    window.history.replaceState(
      null,
      "",
      "/?r=live-fit&fit=cool-summers&sh=22&wl=2&grow=75&fire=low&risk=moderate&q=zzzznonexistent",
    );

    renderApp();

    const recovery = screen.getByRole("group", { name: "Ways to recover matching places" });
    fireEvent.click(within(recovery).getByRole("button", { name: /Relax Live Finder/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("fit")).toBeNull();
      expect(params.get("sh")).toBeNull();
      expect(params.get("wl")).toBeNull();
      expect(params.get("grow")).toBeNull();
      expect(params.get("fire")).toBeNull();
      expect(params.get("risk")).toBeNull();
      expect(params.get("q")).toBe("zzzznonexistent");
      expect(screen.getByText("No places match “zzzznonexistent”")).toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("clears geography from the empty state while preserving the query", async () => {
    window.history.replaceState(
      null,
      "",
      "/?c=Mexico&a=sky-island-refuge&q=zzzznonexistent",
    );

    renderApp();

    const recovery = screen.getByRole("group", { name: "Ways to recover matching places" });
    fireEvent.click(within(recovery).getByRole("button", { name: /Clear region \/ terrain/ }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("c")).toBeNull();
      expect(params.get("a")).toBeNull();
      expect(params.get("q")).toBe("zzzznonexistent");
      expect(screen.getByText("No places match “zzzznonexistent”")).toBeInTheDocument();
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
    const recovery = screen.getByRole("group", { name: "Ways to recover matching places" });
    expect(within(recovery).getByRole("button", { name: /Clear search/ })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("surfaces immediate hero recovery when a search leaves zero visible places", async () => {
    window.history.replaceState(null, "", "/?q=zzzznonexistent");

    renderApp();

    const heroRecovery = screen.getByRole("group", { name: "Immediate zero-result recovery" });
    expect(heroRecovery).toHaveTextContent('No matches for "zzzznonexistent"');
    expect(heroRecovery).toHaveTextContent("Recover here before scrolling");
    expect(within(heroRecovery).getByRole("button", { name: "Reset Explorer from hero recovery" })).toBeInTheDocument();

    fireEvent.click(within(heroRecovery).getByRole("button", { name: "Clear search from hero recovery" }));

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("q")).toBeNull();
      expect(screen.queryByRole("group", { name: "Immediate zero-result recovery" })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("passes active Live Finder filters into shared compare views", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,portal-az&r=live-fit&fit=cool-summers&sh=22");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-live-filters")).toHaveTextContent("cool-summers / summer 22");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps a one-place compare URL saved without opening the compare dialog", () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");

    renderApp();

    expect(screen.queryByRole("dialog", { name: "1 place side by side" })).not.toBeInTheDocument();
    const compareTriggers = screen.getAllByRole("button", { name: "Open compare (1 place)" });
    expect(compareTriggers.length).toBeGreaterThan(0);
    compareTriggers.forEach(trigger => {
      expect(trigger).toHaveClass("tc-compare-open-trigger");
      expect(trigger).toHaveAttribute("title", "Open compare (1 place)");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("opens one-place Compare setup from the mobile Explorer hero action", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");

    renderApp();

    const heroCompare = screen.getByRole("button", { name: "Open compare setup from Explorer hero (1 place)" });
    expect(heroCompare.closest(".hero-action-stack")).not.toBeNull();
    expect(heroCompare).toHaveAttribute("title", "Open compare setup from Explorer hero (1 place)");

    fireEvent.click(heroCompare);

    expect(await screen.findByRole("dialog", { name: "1 place saved to compare" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent("sequim-wa");
    fireEvent.click(screen.getByRole("button", { name: "Close comparison" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(heroCompare);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("closes Compare when its final saved place is removed", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");
    renderApp();

    const heroCompare = screen.getByRole("button", { name: "Open compare setup from Explorer hero (1 place)" });
    fireEvent.click(heroCompare);
    expect(await screen.findByRole("dialog", { name: "1 place saved to compare" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove sequim-wa from comparison" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "1 place saved to compare" })).not.toBeInTheDocument();
      expect(document.querySelector("[data-app-shell]")).not.toHaveAttribute("aria-hidden");
      expect(new URLSearchParams(window.location.search).has("cmp")).toBe(false);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the visible site-menu trigger after opening Compare from the mobile menu", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa");

    renderApp();

    const menuTrigger = screen.getAllByRole("button", { name: "Open site menu" })[0]!;
    fireEvent.click(menuTrigger);

    const menu = await screen.findByRole("dialog", { name: "Navigate" });
    const menuCompare = within(menu).getByRole("button", { name: "Open compare (1 place)" });
    expect(menuCompare).toHaveAttribute("title", "Open compare (1 place)");
    fireEvent.click(menuCompare);

    expect(await screen.findByRole("dialog", { name: "1 place saved to compare" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(menu).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Close comparison" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(menuTrigger);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("exposes only the visible close button in the mobile site menu", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open site menu" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "Navigate" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.querySelector("button[aria-hidden='true']")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close menu" })).toHaveLength(1));
    const close = screen.getByRole("button", { name: "Close menu" });
    expect(close).toHaveClass("tc-site-menu-dialog__close");
    expect(close).toHaveAttribute("title", "Close menu");
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(dialog);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  }, APP_SHELL_TIMEOUT_MS);

  it("labels the mobile site-menu trigger as a close action while expanded", async () => {
    renderApp();

    const menuTrigger = screen.getAllByRole("button", { name: "Open site menu" })[0]!;
    expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    expect(menuTrigger).toHaveAttribute("title", "Open site menu");

    fireEvent.click(menuTrigger);

    const dialog = await screen.findByRole("dialog", { name: "Navigate" });
    expect(menuTrigger).toHaveAccessibleName("Close site menu");
    expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
    expect(menuTrigger).toHaveAttribute("title", "Close site menu");

    fireEvent.click(menuTrigger);

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(menuTrigger).toHaveAccessibleName("Open site menu");
    expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    expect(menuTrigger).toHaveAttribute("title", "Open site menu");
  }, APP_SHELL_TIMEOUT_MS);

  it("isolates Explorer content while the mobile site menu is open", async () => {
    const { container } = renderApp();

    const skipLink = screen.getByText("Skip to main content");
    const appContent = container.querySelector("[data-app-content]");
    const footerRegion = container.querySelector("[data-footer-region]");
    expect(skipLink).not.toHaveAttribute("aria-hidden");
    expect(skipLink).not.toHaveAttribute("inert");
    expect(appContent).not.toBeNull();
    expect(appContent).not.toHaveAttribute("aria-hidden");
    expect(appContent).not.toHaveAttribute("inert");
    expect(footerRegion).not.toBeNull();
    expect(footerRegion).not.toHaveAttribute("aria-hidden");
    expect(footerRegion).not.toHaveAttribute("inert");

    fireEvent.click(screen.getAllByRole("button", { name: "Open site menu" })[0]!);

    const dialog = await screen.findByRole("dialog", { name: "Navigate" });
    await waitFor(() => {
      expect(skipLink).toHaveAttribute("aria-hidden", "true");
      expect(skipLink).toHaveAttribute("inert");
      expect(appContent).toHaveAttribute("aria-hidden", "true");
      expect(appContent).toHaveAttribute("inert");
      expect(footerRegion).toHaveAttribute("aria-hidden", "true");
      expect(footerRegion).toHaveAttribute("inert");
    });
    expect(dialog).not.toHaveAttribute("aria-hidden");
    expect(dialog).not.toHaveAttribute("inert");

    fireEvent.click(within(dialog).getByRole("button", { name: "Close menu" }));

    await waitFor(() => {
      expect(dialog).not.toHaveAttribute("open");
      expect(skipLink).not.toHaveAttribute("aria-hidden");
      expect(skipLink).not.toHaveAttribute("inert");
      expect(appContent).not.toHaveAttribute("aria-hidden");
      expect(appContent).not.toHaveAttribute("inert");
      expect(footerRegion).not.toHaveAttribute("aria-hidden");
      expect(footerRegion).not.toHaveAttribute("inert");
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("exposes only the visible close button in the mobile filter sheet", async () => {
    renderApp();

    const trigger = screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]!;
    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog", { name: "Filters & ranking" })).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close filters" })).toHaveLength(1));
    expect(screen.getByLabelText("Search places by name, region, or archetype")).toHaveAttribute("placeholder", "Search places");
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps the map climate layer control in the mobile filter sheet only", async () => {
    mockViewport(390);
    renderApp();
    expect(screen.queryByRole("group", { name: "Climate scenario layer" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]!);
    expect(await screen.findByRole("dialog", { name: "Filters & ranking" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Climate scenario layer" })).toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("isolates page chrome and Explorer content while the mobile filter sheet is open", async () => {
    const { container } = renderApp();

    const topBarRegion = container.querySelector("[data-topbar-region]");
    const appViewContent = container.querySelector("[data-app-view-content]");
    const footerRegion = container.querySelector("[data-footer-region]");
    const triggerShell = container.querySelector("[data-filter-sheet-trigger-shell]");

    expect(topBarRegion).not.toBeNull();
    expect(appViewContent).not.toBeNull();
    expect(footerRegion).not.toBeNull();
    expect(triggerShell).not.toBeNull();

    const trigger = screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]!;
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Filters & ranking" });
    await waitFor(() => {
      expect(topBarRegion).toHaveAttribute("aria-hidden", "true");
      expect(topBarRegion).toHaveAttribute("inert");
      expect(appViewContent).toHaveAttribute("aria-hidden", "true");
      expect(appViewContent).toHaveAttribute("inert");
      expect(footerRegion).toHaveAttribute("aria-hidden", "true");
      expect(footerRegion).toHaveAttribute("inert");
      expect(triggerShell).toHaveAttribute("aria-hidden", "true");
      expect(triggerShell).toHaveAttribute("inert");
    });
    expect(dialog).not.toHaveAttribute("aria-hidden");
    expect(dialog).not.toHaveAttribute("inert");

    fireEvent.click(within(dialog).getByRole("button", { name: "Close filters" }));

    await waitFor(() => {
      expect(dialog).not.toHaveAttribute("open");
      expect(topBarRegion).not.toHaveAttribute("aria-hidden");
      expect(topBarRegion).not.toHaveAttribute("inert");
      expect(appViewContent).not.toHaveAttribute("aria-hidden");
      expect(appViewContent).not.toHaveAttribute("inert");
      expect(footerRegion).not.toHaveAttribute("aria-hidden");
      expect(footerRegion).not.toHaveAttribute("inert");
      expect(triggerShell).not.toHaveAttribute("aria-hidden");
      expect(triggerShell).not.toHaveAttribute("inert");
      expect(trigger).toHaveFocus();
    });
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the shortcuts opener after closing help", async () => {
    renderApp();

    const opener = screen.getByRole("button", { name: "Show keyboard shortcuts and tips" });
    expect(opener).toHaveAttribute("title", "Show keyboard shortcuts and tips");
    expect(screen.getByRole("button", { name: "Show keyboard shortcuts" })).toHaveAttribute(
      "title",
      "Show keyboard shortcuts",
    );
    fireEvent.click(opener);

    expect(await screen.findByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close keyboard shortcuts help" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    });
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
    try {
      expect(() => {
        fireEvent.click(screen.getByRole("button", { name: "Unpin Sequim from your shortlist" }));
      }).not.toThrow();
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpin Sequim from your shortlist" })).not.toBeInTheDocument();
  }, APP_SHELL_TIMEOUT_MS);

  it("moves focus to main content after removing the last pinned rail place", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa"]),
    );
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Unpin Sequim from your shortlist" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Unpin Sequim from your shortlist" })).not.toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveFocus();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("keeps focus on the next pinned rail remove button when more shortlist places remain", async () => {
    mockViewport(1280);
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa", "forks-wa"]),
    );
    renderApp();

    const sequimRemove = screen.getByRole("button", { name: "Unpin Sequim from your shortlist" });
    sequimRemove.focus();
    expect(sequimRemove).toHaveFocus();
    fireEvent.click(sequimRemove);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Unpin Sequim from your shortlist" })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    const nextRemove = await screen.findByRole("button", {
      name: "Unpin Port Townsend from your shortlist",
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    await waitFor(() => {
      expect(nextRemove).toHaveFocus();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("opens Compare setup from a one-place shortlist while keeping the decision cue hidden", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa"]),
    );

    renderApp();

    const readiness = screen.getByLabelText("Shortlist scout packet status");
    expect(readiness).toHaveTextContent("Scout setup ready");
    expect(readiness).toHaveTextContent("Open Compare setup to plan the missing contrast");
    expect(screen.queryByLabelText("Shortlist packet decision cue")).not.toBeInTheDocument();

    const compareSetup = screen.getByRole("button", { name: "Open Compare Workbench setup for Sequim from your shortlist" });
    expect(compareSetup).toHaveAttribute("title", compareSetup.getAttribute("aria-label"));
    fireEvent.click(compareSetup);

    expect(await screen.findByRole("dialog", { name: "1 place saved to compare" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent("sequim-wa");
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
    const firstDossier = within(packet).getByRole("button", { name: /Open first shortlist dossier:/ });
    const contrastDossier = within(packet).getByRole("button", { name: /Open shortlist contrast dossier:/ });
    expect(firstDossier).toBeInTheDocument();
    expect(firstDossier).toHaveAttribute("title", firstDossier.getAttribute("aria-label"));
    expect(contrastDossier).toBeInTheDocument();
    expect(contrastDossier).toHaveAttribute("title", contrastDossier.getAttribute("aria-label"));
    expect(screen.getByLabelText(/Pinned places/)).toHaveAccessibleDescription(
      "Swipe or scroll horizontally to browse saved shortlist places; each place also has an unpin control.",
    );
    const openSequim = screen.getByRole("button", { name: "Open Sequim from your shortlist" });
    const unpinSequim = screen.getByRole("button", { name: "Unpin Sequim from your shortlist" });
    expect(openSequim).toHaveClass("hero-mini-rail__chip-open");
    expect(openSequim).toHaveAttribute("title", "Open Sequim from your shortlist");
    expect(unpinSequim).toHaveClass("hero-mini-rail__chip-remove");
    expect(unpinSequim).toHaveAttribute("title", "Unpin Sequim from your shortlist");
    const comparePinned = screen.getByRole("button", { name: "Open Compare Workbench for 2 pinned places from your shortlist" });
    expect(comparePinned).toHaveAttribute("title", comparePinned.getAttribute("aria-label"));
  }, APP_SHELL_TIMEOUT_MS);

  it("places returning-user continuity after the map and outside the Explorer hero", () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa"]),
    );
    window.localStorage.setItem(
      "terraclima.recent-places.v1",
      JSON.stringify(["forks-wa"]),
    );
    const { container } = renderApp();

    const explorerMain = container.querySelector(".tc-explorer-main");
    const hero = container.querySelector(".panel-hero");
    const map = container.querySelector(".tc-map-stage");
    const continuity = container.querySelector(".tc-explorer-continuity");

    expect(explorerMain).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(map).not.toBeNull();
    expect(continuity).not.toBeNull();
    expect(continuity).toHaveClass("panel-thin");
    expect(continuity?.parentElement).toBe(explorerMain);
    expect(hero?.contains(continuity)).toBe(false);
    expect(hero!.compareDocumentPosition(map!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(map!.compareDocumentPosition(continuity!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, APP_SHELL_TIMEOUT_MS);

  it("compares pinned shortlist finalists in pinned order", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa", "portal-az"]),
    );
    renderApp();

    const comparePinned = screen.getByRole("button", { name: "Open Compare Workbench for 3 pinned places from your shortlist" });
    expect(comparePinned).toHaveAttribute("title", comparePinned.getAttribute("aria-label"));
    fireEvent.click(comparePinned);

    expect(await screen.findByRole("dialog", { name: "3 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent("sequim-wa,port-townsend-wa,portal-az");
  }, APP_SHELL_TIMEOUT_MS);

  it("opens a 5-place shortlist with four active slots and all pins as workbench candidates", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa", "portal-az", "real-catorce-mx", "valle-de-bravo-mx"]),
    );
    renderApp();

    const comparePinned = screen.getByRole("button", { name: "Open Compare Workbench for 4 pinned places from your shortlist" });
    expect(comparePinned).toHaveAttribute("title", comparePinned.getAttribute("aria-label"));
    fireEvent.click(comparePinned);

    expect(await screen.findByRole("dialog", { name: "4 places side by side" }, { timeout: APP_SHELL_TIMEOUT_MS })).toBeInTheDocument();
    expect(screen.getByTestId("compare-place-ids")).toHaveTextContent("sequim-wa,port-townsend-wa,portal-az,real-catorce-mx");
    expect(Number(screen.getByTestId("compare-candidate-count").textContent ?? "0")).toBeGreaterThanOrEqual(5);
  }, APP_SHELL_TIMEOUT_MS);

  it("renders the recently viewed rail when recents exist in localStorage", () => {
    window.localStorage.setItem(
      "terraclima.recent-places.v1",
      JSON.stringify(["sequim-wa"]),
    );
    renderApp();
    expect(screen.getByText(/Recently viewed · 1/)).toBeInTheDocument();
    expect(screen.getByLabelText("Recently opened place profiles")).toHaveAccessibleDescription(
      "Swipe or scroll horizontally to browse recently opened place profiles.",
    );
    const recentSequim = screen.getByRole("button", { name: /Open Sequim \(recently viewed\)/ });
    expect(recentSequim).toBeInTheDocument();
    expect(recentSequim).toHaveAttribute("title", "Open Sequim (recently viewed)");
    expect(screen.getByRole("button", { name: "Clear recently viewed list (1 place shown)" })).toHaveAttribute(
      "title",
      "Clear recently viewed list (1 place shown)",
    );
  }, APP_SHELL_TIMEOUT_MS);

  it("moves focus to main content after clearing the recently viewed rail", async () => {
    window.localStorage.setItem(
      "terraclima.recent-places.v1",
      JSON.stringify(["sequim-wa"]),
    );
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Clear recently viewed list (1 place shown)" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Clear recently viewed list (1 place shown)" })).not.toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveFocus();
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the recently viewed opener after closing its profile", async () => {
    window.localStorage.setItem(
      "terraclima.recent-places.v1",
      JSON.stringify(["sequim-wa"]),
    );
    renderApp();

    const opener = screen.getByRole("button", { name: /Open Sequim \(recently viewed\)/ });
    fireEvent.click(opener);
    await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
      await new Promise(resolve => window.setTimeout(resolve, 300));
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close profile" })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("returns focus to the shortlist opener after closing its profile", async () => {
    window.localStorage.setItem(
      "terraclima.bookmarks.v1",
      JSON.stringify(["sequim-wa", "port-townsend-wa"]),
    );
    renderApp();

    const opener = screen.getByRole("button", { name: /Open Sequim from your shortlist/ });
    fireEvent.click(opener);
    await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
      await new Promise(resolve => window.setTimeout(resolve, 300));
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close profile" })).not.toBeInTheDocument();
    }, { timeout: APP_SHELL_TIMEOUT_MS });

    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    }, { timeout: APP_SHELL_TIMEOUT_MS });
  }, APP_SHELL_TIMEOUT_MS);

  it("does not mark deep-linked place history as in-app navigation after URL sync", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Close profile" }, { timeout: APP_SHELL_TIMEOUT_MS }));
    expect((window.history.state as { tcPlace?: boolean } | null)?.tcPlace).toBeFalsy();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);
    await screen.findByLabelText("Search places by name, region, or archetype", {}, { timeout: APP_SHELL_TIMEOUT_MS });
    fireEvent.click(screen.getAllByRole("button", { name: "Filter to United States places" })[0]);

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

  it("restores a body-opened mobile search shortcut to the visible Filters trigger", async () => {
    mockViewport(390);
    renderApp();

    const trigger = screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]!;
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const sheet = await screen.findByRole("dialog", { name: "Filters & ranking" }, { timeout: APP_SHELL_TIMEOUT_MS });
    const search = within(sheet).getByRole("textbox", { name: "Search places by name, region, or archetype" });
    await waitFor(() => expect(search).toHaveFocus(), { timeout: APP_SHELL_TIMEOUT_MS });

    fireEvent.click(within(sheet).getByRole("button", { name: "Close filters" }));
    await waitFor(() => expect(trigger).toHaveFocus(), { timeout: APP_SHELL_TIMEOUT_MS });
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
