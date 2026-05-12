// @vitest-environment jsdom
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
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

function renderCompare() {
  render(
    <UnitProvider>
      <CompareView
        places={PLACES.slice(0, 4)}
        open
        onClose={() => undefined}
        onRemove={() => undefined}
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
});
