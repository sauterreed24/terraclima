// @vitest-environment jsdom
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import type { LiveFitFilters, LiveFitPresetId } from "../../lib/live-fit";
import { UnitProvider } from "../../lib/units";
import { CompareView } from "../CompareView";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MotionDiv(
      { children, ...props },
      ref,
    ) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  useReducedMotion: () => true,
}));

vi.mock("../charts/MicroclimateFingerprint", () => ({
  MicroclimateFingerprint: ({ compactLabels }: { compactLabels?: boolean }) => (
    <div data-testid="fingerprint-chart" data-compact-labels={String(Boolean(compactLabels))} />
  ),
}));

vi.mock("../charts/ClimateRibbon", () => ({
  ClimateRibbon: () => <div data-testid="climate-ribbon" />,
}));

afterEach(() => cleanup());

function renderCompare({
  onCopyView,
  onRemove = () => undefined,
  onOpenPlace,
  shareStatus,
  liveFitFilters,
}: {
  onCopyView?: () => void;
  onRemove?: (id: string) => void;
  onOpenPlace?: (id: string) => void;
  shareStatus?: "idle" | "copied" | "failed";
  liveFitFilters?: LiveFitFilters;
} = {}) {
  render(
    <UnitProvider>
      <CompareView
        places={PLACES.slice(0, 4)}
        open
        onClose={() => undefined}
        onRemove={onRemove}
        onOpenPlace={onOpenPlace}
        onCopyView={onCopyView}
        shareStatus={shareStatus}
        liveFitFilters={liveFitFilters}
      />
    </UnitProvider>,
  );
}

describe("CompareView", () => {
  it("surfaces comparison highlights before the column matrix", () => {
    renderCompare();

    expect(screen.getByLabelText("Comparison highlights")).toBeInTheDocument();
    expect(screen.getByText("Coolest summer")).toBeInTheDocument();
    expect(screen.getByText("Mildest winter")).toBeInTheDocument();
    expect(screen.getByText("Best live-here fit")).toBeInTheDocument();
    expect(screen.getByText("Top livability")).toBeInTheDocument();
    expect(screen.getByText("Lowest risk load")).toBeInTheDocument();
    expect(screen.getByText("Best growability")).toBeInTheDocument();
    expect(screen.getAllByText("Live-here fit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Livability").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Felt comfort").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("fingerprint-chart").every(chart => chart.dataset.compactLabels === "true")).toBe(true);
  });

  it("announces the comparison count for screen readers when the set changes", () => {
    const { rerender } = render(
      <UnitProvider>
        <CompareView places={PLACES.slice(0, 2)} open onClose={() => undefined} onRemove={() => undefined} />
      </UnitProvider>,
    );
    expect(screen.getByText("Now comparing 2 places.")).toBeInTheDocument();

    rerender(
      <UnitProvider>
        <CompareView places={PLACES.slice(0, 3)} open onClose={() => undefined} onRemove={() => undefined} />
      </UnitProvider>,
    );
    expect(screen.getByText("Now comparing 3 places.")).toBeInTheDocument();
  });

  it("adds a decision read and copyable comparison handoff", () => {
    const onCopyView = vi.fn();
    const onOpenPlace = vi.fn();
    renderCompare({ onCopyView, onOpenPlace });

    expect(screen.getByLabelText("Comparison decision read")).toBeInTheDocument();
    expect(screen.getByText("Decision read")).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(screen.getByText("Broadest fit")).toBeInTheDocument();
    expect(screen.getByText("Lowest risk")).toBeInTheDocument();
    expect(screen.getByText("Comfort leader")).toBeInTheDocument();
    expect(screen.getByText("Garden edge")).toBeInTheDocument();
    expect(screen.getByLabelText("Scouting sequence")).toBeInTheDocument();
    expect(screen.getByText("Scout sequence")).toBeInTheDocument();
    expect(screen.getByText(/Start here/)).toBeInTheDocument();
    expect(screen.getByText(/Counterweight/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy comparison link" }));
    expect(onCopyView).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Open first dossier:/ }));
    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /from scouting sequence: Start here/ }));
    expect(onOpenPlace).toHaveBeenCalledTimes(2);
  });

  it("adds a compact mobile key for bioclimatic comparison rows", () => {
    renderCompare();

    expect(screen.getByText("Bioclim key")).toBeInTheDocument();
    expect(screen.getByText("annual aridity")).toBeInTheDocument();
    expect(screen.getByText("continentality")).toBeInTheDocument();
    expect(screen.getByText("growing-season moisture")).toBeInTheDocument();
    expect(screen.getByText("evaporative demand")).toBeInTheDocument();
    expect(screen.getByText("precipitation to PET")).toBeInTheDocument();
  });

  it("scopes remove controls to the compare dialog cards", () => {
    const onRemove = vi.fn();
    renderCompare({ onRemove });

    const dialog = screen.getByRole("dialog", { name: "4 places side by side" });
    const removeButtons = within(dialog).getAllByRole("button", { name: /Remove .* from comparison/ });

    expect(removeButtons).toHaveLength(4);
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(PLACES[0].id);
  });

  it("opens a place profile from the column title when onOpenPlace is provided", () => {
    const onOpenPlace = vi.fn();
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          onOpenPlace={onOpenPlace}
        />
      </UnitProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "2 places side by side" });
    fireEvent.click(within(dialog).getByRole("button", { name: `Open ${PLACES[0].name} profile` }));
    expect(onOpenPlace).toHaveBeenCalledWith(PLACES[0].id);
  });

  it("aligns live-here comparison scores with the active Live Finder filters", () => {
    renderCompare({
      liveFitFilters: {
        fitPresets: new Set<LiveFitPresetId>(["cool-summers"]),
        maxSummerHighC: 22,
      },
    });

    const liveFitHighlight = screen.getByText("Best live-here fit").closest(".compare-insight-strip__item");
    expect(liveFitHighlight).not.toBeNull();
    expect(within(liveFitHighlight as HTMLElement).getByText("92/100")).toBeInTheDocument();
  });

  it("shows a scenario honesty banner when comparing under a future climate layer", () => {
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          scenario="ssp585"
        />
      </UnitProvider>,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/SSP5-8.5/);
    expect(screen.getByRole("note")).toHaveTextContent(/Place dossiers still show present-day normals/);
  });

  it("omits the scenario banner for present-day compare", () => {
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          scenario="now"
        />
      </UnitProvider>,
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
