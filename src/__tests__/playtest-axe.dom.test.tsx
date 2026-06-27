// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { CompareView } from "../components/CompareView";
import { CollectionsView } from "../components/CollectionsView";
import { LazyRouteErrorBoundary } from "../components/LazyRouteErrorBoundary";
import { LearnMode } from "../components/LearnMode";
import { PlaceDetail } from "../components/PlaceDetail";
import { RouteLoadingFallback } from "../components/RouteLoadingFallback";
import { PwaUpdateBanner } from "../components/chrome/PwaUpdateBanner";
import { PLACES, PLACES_BY_ID } from "../data/places";
import { UnitProvider } from "../lib/units";
import { assertNoSeriousAxeViolations } from "../test-helpers/axe-audit";

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" role="region" aria-label="Map stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" role="region" aria-label="Place grid stub" />,
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: {
      aside: React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) =>
        React.createElement("aside", { ...props, ref }, props.children)),
      div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) =>
        React.createElement("div", { ...props, ref }, props.children)),
    },
    useReducedMotion: () => true,
  };
});

vi.mock("../components/charts/MicroclimateFingerprint", () => ({
  MicroclimateFingerprint: () => <div data-testid="fingerprint-chart" />,
}));

vi.mock("../components/charts/ClimateRibbon", () => ({
  ClimateRibbon: () => <div data-testid="climate-ribbon" />,
}));

afterEach(cleanup);

describe("playtest axe — serious/critical WCAG 2.1 A/AA", () => {
  it("passes on the Explorer shell", async () => {
    window.history.replaceState(null, "", "/");
    const { container } = render(
      <UnitProvider>
        <App />
      </UnitProvider>,
    );
    await assertNoSeriousAxeViolations(container);
  });

  it("passes on CompareView", async () => {
    const { container } = render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 3)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          homePlace={PLACES_BY_ID["sequim-wa"]}
          scenario="ssp245"
        />
      </UnitProvider>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await assertNoSeriousAxeViolations(container);
  });

  it("passes on PlaceDetail", async () => {
    const place = PLACES_BY_ID["sequim-wa"]!;
    const { container } = render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );
    await assertNoSeriousAxeViolations(container);
  });

  it("passes on CollectionsView and LearnMode", async () => {
    const collections = render(
      <UnitProvider>
        <CollectionsView onOpenPlace={() => undefined} onPick={() => undefined} />
      </UnitProvider>,
    );
    await assertNoSeriousAxeViolations(collections.container);

    cleanup();

    const learn = render(
      <UnitProvider>
        <LearnMode onOpenPlace={() => undefined} />
      </UnitProvider>,
    );
    await assertNoSeriousAxeViolations(learn.container);
  });

  it("passes on chrome loading and recovery surfaces", async () => {
    const loading = render(<RouteLoadingFallback label="Climate Trips" />);
    await assertNoSeriousAxeViolations(loading.container);
    cleanup();

    const banner = render(<PwaUpdateBanner onRefresh={() => undefined} onDismiss={() => undefined} />);
    await assertNoSeriousAxeViolations(banner.container);
    cleanup();

    class ChunkFail extends React.Component {
      render() {
        throw new Error("Failed to fetch dynamically imported module");
      }
    }
    const boundary = render(
      <LazyRouteErrorBoundary routeLabel="Climate Trips">
        <ChunkFail />
      </LazyRouteErrorBoundary>,
    );
    await assertNoSeriousAxeViolations(boundary.container);
  });
});
