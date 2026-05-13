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
  MicroclimateFingerprint: () => <div data-testid="fingerprint-chart" />,
}));

vi.mock("../charts/ClimateRibbon", () => ({
  ClimateRibbon: () => <div data-testid="climate-ribbon" />,
}));

afterEach(() => cleanup());

function renderCompare({
  onCopyView,
  shareStatus,
  liveFitFilters,
}: {
  onCopyView?: () => void;
  shareStatus?: "idle" | "copied" | "failed";
  liveFitFilters?: LiveFitFilters;
} = {}) {
  render(
    <UnitProvider>
      <CompareView
        places={PLACES.slice(0, 4)}
        open
        onClose={() => undefined}
        onRemove={() => undefined}
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
  });

  it("adds a decision read and copyable comparison handoff", () => {
    const onCopyView = vi.fn();
    renderCompare({ onCopyView });

    expect(screen.getByLabelText("Comparison decision read")).toBeInTheDocument();
    expect(screen.getByText("Decision read")).toBeInTheDocument();
    expect(screen.getByText("Broadest fit")).toBeInTheDocument();
    expect(screen.getByText("Lowest risk")).toBeInTheDocument();
    expect(screen.getByText("Comfort leader")).toBeInTheDocument();
    expect(screen.getByText("Garden edge")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy comparison link" }));
    expect(onCopyView).toHaveBeenCalledTimes(1);
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
});
