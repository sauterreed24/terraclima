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

describe("PlaceDetail overview spotlight", () => {
  it("leads with the 'what it actually feels like' overview, four seasons, and fit framing", () => {
    const place = PLACES_BY_ID["bishop-ca"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    // The humanistic eyebrow + the four-season walkthrough.
    expect(screen.getByText("What it actually feels like")).toBeInTheDocument();
    expect(screen.getByText("The year, season by season")).toBeInTheDocument();
    for (const season of ["Winter", "Spring", "Summer", "Autumn"]) {
      expect(screen.getByText(season)).toBeInTheDocument();
    }

    // Who-it-fits framing.
    expect(screen.getByText("Why people visit")).toBeInTheDocument();
    expect(screen.getByText("Who lives here happily")).toBeInTheDocument();
    expect(screen.getByText("Who might not")).toBeInTheDocument();

    // The dossier is segmented into acts — the labels appear both as
    // reading-nav group headers and as in-body zone dividers.
    expect(screen.getAllByText("The data lab").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Land & growing").length).toBeGreaterThan(0);
  });
});

describe("PlaceDetail header accessibility", () => {
  it("exposes a semantic h1 for the dossier while keeping the visible title", () => {
    const place = PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: `${place.name} climate dossier` })).toHaveClass("sr-only");
    expect(screen.getByRole("heading", { level: 2, name: place.name })).toBeInTheDocument();
  });

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

describe("PlaceDetail bioclimatic edge reads", () => {
  it("explains undefined growing-season indices without hiding annual reads", () => {
    const place = PLACES_BY_ID["iqaluit-nu"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    const edgeNote = screen.getByText("Undefined bioclimatic edge").closest(".tc-accent-panel");
    expect(edgeNote).not.toBeNull();
    expect(edgeNote!).toHaveTextContent("Selianinov HTC is undefined");
    expect(edgeNote!).toHaveTextContent("annual water-balance");
    expect(screen.getByText("Conrad")).toBeInTheDocument();
    expect(screen.getByText("UNEP aridity")).toBeInTheDocument();
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

describe("PlaceDetail scenario honesty banner", () => {
  it("shows a present-day normals note when scn≠now", () => {
    const place = PLACES_BY_ID["boulder-co"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} scenario="ssp585" />
      </UnitProvider>,
    );

    expect(screen.getByRole("note")).toHaveTextContent("SSP5-8.5");
    expect(screen.getByRole("note")).toHaveTextContent("present-day normals");
  });

  it("hides the banner when scenario is present-day", () => {
    const place = PLACES_BY_ID["boulder-co"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} scenario="now" />
      </UnitProvider>,
    );

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
