// @vitest-environment jsdom
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import type { LiveFitFilters, LiveFitPresetId } from "../../lib/live-fit";
import { UnitProvider } from "../../lib/units";
import type { Place } from "../../types";
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
  onClose = () => undefined,
  onRemove = () => undefined,
  onOpenPlace,
  shareStatus,
  liveFitFilters,
  places = PLACES.slice(0, 4),
}: {
  onCopyView?: () => void;
  onClose?: () => void;
  onRemove?: (id: string) => void;
  onOpenPlace?: (id: string) => void;
  shareStatus?: "idle" | "copied" | "failed";
  liveFitFilters?: LiveFitFilters;
  places?: Place[];
} = {}) {
  render(
    <UnitProvider>
      <CompareView
        places={places}
        open
        onClose={onClose}
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
    expect(screen.getByLabelText("Finalist decision table")).toBeInTheDocument();
    expect(screen.getByText("Finalist table")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Visit")).toBeInTheDocument();
    expect(screen.getByText("Watch first")).toBeInTheDocument();
    expect(screen.getByText("Start here")).toBeInTheDocument();
    const scoutSequence = screen.getByLabelText("Scouting sequence");
    expect(scoutSequence).toBeInTheDocument();
    expect(screen.getByText("Scout sequence")).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Start here/)).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Counterweight/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy comparison link" }));
    expect(onCopyView).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Open first dossier:/ }));
    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /from scouting sequence: Start here/ }));
    expect(onOpenPlace).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getAllByRole("button", { name: /from finalist decision table/ })[0]);
    expect(onOpenPlace).toHaveBeenCalledTimes(3);
  });

  it("renders one finalist decision table row per compared place", () => {
    renderCompare({ onOpenPlace: vi.fn() });

    const table = screen.getByRole("table", { name: "Decision table for saved compare finalists" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(PLACES.slice(0, 4).length + 1);
    for (const place of PLACES.slice(0, 4)) {
      expect(within(table).getByRole("button", { name: `Open ${place.name} from finalist decision table` })).toBeInTheDocument();
    }
    expect(within(table).getAllByText(/\/100 fit/)).toHaveLength(4);
    expect(within(table).getAllByText(/\/100 risk/)).toHaveLength(4);
  });

  it("turns a single saved finalist into a guided shortlist setup", () => {
    const onOpenPlace = vi.fn();
    const onClose = vi.fn();
    const anchor = PLACES[0]!;
    renderCompare({ places: [anchor], onOpenPlace, onClose });

    expect(screen.getByRole("dialog", { name: "1 place saved to compare" })).toBeInTheDocument();
    expect(screen.getByLabelText("Single finalist compare setup")).toBeInTheDocument();
    expect(screen.getByText("Shortlist setup")).toBeInTheDocument();
    expect(screen.getByText(/is saved as the anchor finalist/)).toBeInTheDocument();
    expect(screen.getByText(/Add a peer or counterweight/)).toBeInTheDocument();
    expect(screen.getByText("Anchor signal")).toBeInTheDocument();
    expect(screen.getByText("First contrast")).toBeInTheDocument();
    expect(screen.getByText("Counterweight")).toBeInTheDocument();
    expect(screen.queryByLabelText("Comparison decision read")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Review anchor dossier: ${anchor.name}` }));
    expect(onOpenPlace).toHaveBeenCalledWith(anchor.id);
    fireEvent.click(screen.getByRole("button", { name: "Keep scouting" }));
    expect(onClose).toHaveBeenCalledTimes(1);
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

  it("explains the active comparison scoring lens when Live Finder filters shape Compare", () => {
    renderCompare({
      liveFitFilters: {
        fitPresets: new Set<LiveFitPresetId>(["cool-summers", "dry-air"]),
        maxSummerHighC: 22,
        maxFireRisk: "elevated",
      },
    });

    const lens = screen.getByLabelText("Comparison scoring lens");
    expect(lens).toHaveTextContent("Score lens");
    expect(lens).toHaveTextContent("Fit and finalist scores are being read through Cool summers and Dry air");
    expect(lens).toHaveTextContent("summer <= 72°F");
    expect(lens).toHaveTextContent("fire <= elevated");
    expect(lens).toHaveTextContent("present-day normals");
    expect(lens).toHaveTextContent("screening lens");
  });

  it("keeps default present-day Compare free of the scoring lens receipt", () => {
    renderCompare();

    expect(screen.queryByLabelText("Comparison scoring lens")).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Comparison scoring lens")).toHaveTextContent(/SSP5-8.5/);
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
