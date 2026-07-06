// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { PwaUpdateProvider } from "../components/chrome/PwaUpdateProvider";
import { UnitProvider } from "../lib/units";
import * as pwa from "../lib/pwa";

const APP_RESILIENCE_TIMEOUT_MS = 30000;

const lazyState = vi.hoisted(() => ({
  tripsDelayMs: 0,
  tripsReject: false,
  collectionsDelayMs: 0,
  learnDelayMs: 0,
}));

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

vi.mock("../lib/lazy-views", async () => {
  const React = await import("react");
  const stubView = (testId: string, text: string) => function StubView() {
    return React.createElement("div", { "data-testid": testId }, text);
  };
  const delay = (ms: number) => new Promise<void>(resolve => {
    window.setTimeout(resolve, ms);
  });
  const loadWithOptions = (
    testId: string,
    text: string,
    delayMs: number,
    reject: boolean,
  ) => async () => {
    if (delayMs > 0) await delay(delayMs);
    if (reject) {
      throw new Error("Failed to fetch dynamically imported module: chunk.js");
    }
    return { default: stubView(testId, text) };
  };

  return {
    loadClimateTripsView: () =>
      loadWithOptions("climate-trips-view", "Climate Trips loaded", lazyState.tripsDelayMs, lazyState.tripsReject)(),
    loadCollectionsView: () =>
      loadWithOptions("collections-view", "Collections loaded", lazyState.collectionsDelayMs, false)(),
    loadLearnMode: () =>
      loadWithOptions("learn-view", "Learn loaded", lazyState.learnDelayMs, false)(),
    loadPlaceDetail: () => Promise.resolve({ default: stubView("place-detail", "Detail mocked") }),
    loadCompareView: () => Promise.resolve({ default: stubView("compare-view", "Compare mocked") }),
    preloadPlaceDetail: vi.fn(),
    preloadCompareView: vi.fn(),
  };
});

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

function renderAppWithPwa() {
  return render(
    <UnitProvider>
      <PwaUpdateProvider>
        <App />
      </PwaUpdateProvider>
    </UnitProvider>,
  );
}

describe("App resilience integration", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    mockViewport(1280);
    lazyState.tripsDelayMs = 0;
    lazyState.tripsReject = false;
    lazyState.collectionsDelayMs = 0;
    lazyState.learnDelayMs = 0;
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("shows lazy-route recovery when a cold view chunk fails", async () => {
    lazyState.tripsReject = true;
    window.history.replaceState(null, "", "/?v=trips");
    vi.resetModules();
    const AppFresh = (await import("../App")).default;
    render(
      <UnitProvider>
        <AppFresh />
      </UnitProvider>,
    );

    expect(await screen.findByRole("alert", {}, { timeout: APP_RESILIENCE_TIMEOUT_MS })).toHaveTextContent(
      "Could not load Climate Trips",
    );
    expect(screen.getByRole("button", { name: "Retry download" })).toBeInTheDocument();
    vi.resetModules();
  }, APP_RESILIENCE_TIMEOUT_MS);

  it("shows RouteLoadingFallback skeleton while Climate Trips loads", async () => {
    lazyState.tripsReject = false;
    lazyState.tripsDelayMs = 120;
    render(
      <UnitProvider>
        <App />
      </UnitProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Trips" })[0]!);

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Climate Trips");
    expect(status).toHaveTextContent("Preparing climate trips");

    expect(await screen.findByTestId("climate-trips-view", {}, { timeout: APP_RESILIENCE_TIMEOUT_MS }))
      .toHaveTextContent("Climate Trips loaded");
  }, APP_RESILIENCE_TIMEOUT_MS);

  it("shows RouteLoadingFallback skeleton while Collections and Learn load", async () => {
    lazyState.collectionsDelayMs = 120;
    lazyState.learnDelayMs = 120;
    render(
      <UnitProvider>
        <App />
      </UnitProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Collections" })[0]!);
    expect(await screen.findByRole("status")).toHaveTextContent("Collections");
    expect(await screen.findByTestId("collections-view", {}, { timeout: APP_RESILIENCE_TIMEOUT_MS })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Learn" })[0]!);
    expect(await screen.findByRole("status")).toHaveTextContent("Learn");
    expect(await screen.findByTestId("learn-view", {}, { timeout: APP_RESILIENCE_TIMEOUT_MS })).toBeInTheDocument();
  }, APP_RESILIENCE_TIMEOUT_MS);

  it("wires PwaUpdateProvider to the update banner", async () => {
    let onUpdateAvailable: ((registration: ServiceWorkerRegistration) => void) | undefined;
    vi.spyOn(pwa, "registerServiceWorker").mockImplementation((options = {}) => {
      onUpdateAvailable = options.onUpdateAvailable;
      return { activateUpdate: vi.fn(), unregister: vi.fn() };
    });

    renderAppWithPwa();

    onUpdateAvailable?.({ waiting: null } as ServiceWorkerRegistration);

    expect(await screen.findByRole("region", { name: "Atlas update" })).toHaveTextContent("Atlas update ready");

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Atlas update" })).not.toBeInTheDocument();
    });
  });

  it("engages the 2050 mid scenario layer without leaving a stuck projecting note", async () => {
    renderAppWithPwa();

    fireEvent.click(screen.getByRole("button", { name: "2050 mid" }));

    expect(screen.getByText(/Illustrative 2050 · SSP2-4.5 regional projection/i)).toBeInTheDocument();
    expect(screen.getByText(/2050 mid remap/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText(/^Projecting… /)).not.toBeInTheDocument();
      },
      { timeout: APP_RESILIENCE_TIMEOUT_MS },
    );
  }, APP_RESILIENCE_TIMEOUT_MS);
});
