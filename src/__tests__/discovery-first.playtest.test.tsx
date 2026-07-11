// @vitest-environment jsdom
/**
 * End-to-end discovery-first playtest: cold start → unique ranking → Surprise →
 * dossier archetype guide → scout tools stay deferred until asked.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";
import { DEFAULT_RANKING } from "../lib/app-ranking-preference";

const TIMEOUT = 30000;

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
  CompareView: () => null,
}));

function renderApp() {
  return render(
    <UnitProvider>
      <App />
    </UnitProvider>,
  );
}

function openHeroMoreMenu() {
  const more = screen.getByRole("button", { name: "More atlas actions" });
  if (more.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(more);
  }
  expect(more).toHaveAttribute("aria-expanded", "true");
}

describe("Discovery-first playtest", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("cold-starts on most-unique with discovery CTAs and deferred scout chrome", async () => {
    expect(DEFAULT_RANKING).toBe("most-unique");
    renderApp();

    expect(screen.getByRole("heading", { name: "Discover microclimates hiding in plain sight" })).toBeInTheDocument();
    expect(document.querySelector(".tc-map-stage__caption strong")).toHaveTextContent("Most unique · top 5");
    expect(screen.getByRole("button", { name: "Open a unique microclimate from the current filtered list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More atlas actions" })).toBeInTheDocument();
    openHeroMoreMenu();
    expect(screen.getByRole("button", { name: "Show scouting tools" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Desktop relocation workbench")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/climate signal leaders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Livability lens/)).not.toBeInTheDocument();

    const params = new URLSearchParams(window.location.search);
    expect(params.get("r")).toBeNull();
  }, TIMEOUT);

  it("Surprise opens a dossier with an archetype field guide", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      renderApp();

      fireEvent.click(screen.getByRole("button", { name: "Open a unique microclimate from the current filtered list" }));

      await screen.findByRole("button", { name: "Close profile" }, { timeout: TIMEOUT });
      const guide = await screen.findByRole("region", { name: /field guide/i }, { timeout: TIMEOUT });
      expect(guide).toBeInTheDocument();
      expect(guide).toHaveAttribute("id", "place-archetype-guide");
      expect(guide.textContent?.length ?? 0).toBeGreaterThan(40);
      expect(screen.getByRole("heading", { name: "Why this climate is different here" })).toBeInTheDocument();
      expect(screen.getByRole("complementary", { name: "First-session climate journey" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Versus your home base" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Climate twins" })).toBeInTheDocument();
      expect(screen.getByLabelText("Climate twins teaser")).toBeInTheDocument();
    } finally {
      randomSpy.mockRestore();
    }
  }, TIMEOUT);

  it("Surprise → set home → unlocks versus-home deltas and keeps twins in the spine", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      renderApp();

      fireEvent.click(screen.getByRole("button", { name: "Open a unique microclimate from the current filtered list" }));
      await screen.findByRole("button", { name: "Close profile" }, { timeout: TIMEOUT });

      expect(screen.getByRole("heading", { name: "Why this climate is different here" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Versus your home base" })).toBeInTheDocument();

      const setHomeButtons = screen.getAllByRole("button", { name: /Set .+ as your home base for climate deltas/ });
      fireEvent.click(setHomeButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Your home base" })).toBeInTheDocument();
      }, { timeout: TIMEOUT });

      expect(screen.getByRole("heading", { name: "Climate twins" })).toBeInTheDocument();
      expect(screen.getByLabelText("Climate twins teaser")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Twin, but —/i }).length).toBeGreaterThan(0);
    } finally {
      randomSpy.mockRestore();
    }
  }, TIMEOUT);

  it("Hidden gems quick pick updates ranking without opening scout tools", async () => {
    renderApp();

    const quickPicks = screen.getByRole("group", { name: "Discovery quick picks" });
    fireEvent.click(within(quickPicks).getByRole("button", { name: /Hidden gems/ }));

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("r")).toBe("hidden-gems");
    }, { timeout: TIMEOUT });

    expect(document.querySelector(".tc-map-stage__caption strong")).toHaveTextContent(/Hidden gems/i);
    expect(screen.queryByLabelText("Desktop relocation workbench")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More atlas actions" })).toBeInTheDocument();
  }, TIMEOUT);
});
