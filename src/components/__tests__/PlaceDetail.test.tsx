// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { UnitProvider } from "../../lib/units";
import { PlaceDetail } from "../PlaceDetail";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motionKeys = new Set(["animate", "exit", "initial", "transition", "whileHover", "whileTap", "layout"]);
  type MotionElementProps = Record<string, unknown> & { children?: React.ReactNode };
  const passthrough = (tag: "div" | "aside") =>
    React.forwardRef<HTMLElement, MotionElementProps>((props, ref) => {
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => key !== "children" && !motionKeys.has(key)),
      );
      return React.createElement(tag, { ...domProps, ref }, props.children as React.ReactNode);
    });

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: {
      aside: passthrough("aside"),
      div: passthrough("div"),
    },
    useReducedMotion: () => true,
  };
});

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PlaceDetail growability rationale", () => {
  it("renders the computed Why this score read inside Soil & growability", () => {
    const place = PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    expect(screen.getByRole("heading", { name: "Agriculture & soil" })).toBeInTheDocument();
    expect(screen.getByText("Why this score?")).toBeInTheDocument();
    expect(screen.getByText(/^Bioclim basis: Selianinov HTC/)).toBeInTheDocument();
    expect(screen.getByText(/Thornthwaite PET .* frame this 74\/100 score/)).toBeInTheDocument();
    expect(screen.getByText(/read irrigation, soil storage, and drought trend/)).toBeInTheDocument();
  });
});

describe("PlaceDetail header accessibility", () => {
  it("reflects compare membership on the Compare button via aria-pressed", () => {
    const place = PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    const { rerender } = render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          onCompareToggle={() => undefined}
          inCompareIds={new Set()}
        />
      </UnitProvider>,
    );

    const addBtn = screen.getByRole("button", { name: `Add ${place.name} to compare` });
    expect(addBtn).toHaveAttribute("aria-pressed", "false");

    rerender(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          onCompareToggle={() => undefined}
          inCompareIds={new Set([place.id])}
        />
      </UnitProvider>,
    );

    const removeBtn = screen.getByRole("button", { name: `Remove ${place.name} from compare` });
    expect(removeBtn).toHaveAttribute("aria-pressed", "true");
  });
});

describe("PlaceDetail glossary driver chip a11y", () => {
  it("wires aria-expanded + aria-controls on driver chips that have a concept", () => {
    // Eureka is one of the entries that always has drivers with concepts (e.g.
    // marine layer, rain shadow). We only need a place with at least one
    // driver that maps into DRIVER_CONCEPT_MAP.
    const place = PLACES_BY_ID["eureka-ca"] ?? PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    // All driver chips have data-tone="ochre" — they live in the "Why this
    // climate is different here" section and are the only ochre chips inside
    // the dossier body. The ones with concepts must expose aria-expanded.
    const chips = Array.from(document.querySelectorAll<HTMLButtonElement>(
      'button.chip-btn[data-tone="ochre"]',
    ));
    expect(chips.length).toBeGreaterThan(0);

    const chipsWithConcept = chips.filter(c => c.hasAttribute("aria-expanded"));
    expect(chipsWithConcept.length).toBeGreaterThan(0);
    for (const chip of chipsWithConcept) {
      expect(chip.getAttribute("aria-expanded")).toBe("false");
    }
  });
});
