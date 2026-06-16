// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

const APP_LOADING_TIMEOUT_MS = 30000;

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

vi.mock("../lib/lazy-views", async () => {
  const React = await import("react");
  const pendingPlaceDetail = new Promise<never>(() => undefined);
  const stubView = (testId: string, text: string) => function StubView() {
    return React.createElement("div", { "data-testid": testId }, text);
  };

  return {
    loadClimateTripsView: () => Promise.resolve({ default: stubView("climate-trips-view", "Climate Trips mocked") }),
    loadCollectionsView: () => Promise.resolve({ default: stubView("collections-view", "Collections mocked") }),
    loadLearnMode: () => Promise.resolve({ default: stubView("learn-view", "Learn mocked") }),
    loadPlaceDetail: () => pendingPlaceDetail,
    loadCompareView: () => Promise.resolve({ default: stubView("compare-view", "Compare mocked") }),
    preloadPlaceDetail: vi.fn(),
    preloadCompareView: vi.fn(),
  };
});

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

describe("App place-detail loading boundary", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    mockViewport(390);
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  it("shows a closeable drawer fallback while a direct profile link is loading", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
    const { container } = renderApp();

    const fallback = await screen.findByRole("dialog", { name: "Sequim climate dossier" });
    expect(fallback).toHaveAttribute("data-place-detail-loading");
    expect(fallback).toHaveClass("place-detail-drawer");
    expect(screen.getByRole("status")).toHaveTextContent("Opening Sequim climate dossier");

    const shell = container.querySelector("[data-app-shell]");
    expect(shell).not.toBeNull();
    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));
    expect(shell).toHaveAttribute("inert");

    const close = screen.getByRole("button", { name: "Close profile" });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(close).toHaveAttribute("title", "Close profile");
    expect(window.location.search).toBe("?p=sequim-wa");

    fireEvent.click(close);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Sequim climate dossier" })).toBeNull();
      expect(window.location.search).toBe("");
    });
    expect(shell).not.toHaveAttribute("aria-hidden");
    expect(shell).not.toHaveAttribute("inert");
  }, APP_LOADING_TIMEOUT_MS);

  it("closes the direct profile loading drawer on Escape before the chunk resolves", async () => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
    const { container } = renderApp();

    expect(await screen.findByRole("dialog", { name: "Sequim climate dossier" })).toHaveAttribute("data-place-detail-loading");
    const shell = container.querySelector("[data-app-shell]");
    expect(shell).not.toBeNull();
    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));

    const close = screen.getByRole("button", { name: "Close profile" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    fireEvent.keyDown(close, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Sequim climate dossier" })).toBeNull();
      expect(window.location.search).toBe("");
    });
    expect(shell).not.toHaveAttribute("aria-hidden");
    expect(shell).not.toHaveAttribute("inert");
  }, APP_LOADING_TIMEOUT_MS);
});
