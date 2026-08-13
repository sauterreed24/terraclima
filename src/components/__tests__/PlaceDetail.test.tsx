// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { UnitProvider } from "../../lib/units";
import { PlaceDetail } from "../PlaceDetail";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motionKeys = new Set(["animate", "exit", "initial", "transition", "whileHover", "whileTap", "layout"]);
  type MotionElementProps = Record<string, unknown> & { children?: React.ReactNode };
  const serializeMotionProp = (value: unknown) => {
    if (value === undefined) return undefined;
    return JSON.stringify(value);
  };
  const passthrough = (tag: "div" | "aside") =>
    React.forwardRef<HTMLElement, MotionElementProps>((props, ref) => {
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => key !== "children" && !motionKeys.has(key)),
      );
      return React.createElement(
        tag,
        {
          ...domProps,
          ref,
          "data-motion-animate": serializeMotionProp(props.animate),
          "data-motion-exit": serializeMotionProp(props.exit),
          "data-motion-initial": serializeMotionProp(props.initial),
        },
        props.children as React.ReactNode,
      );
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
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("PlaceDetail growability rationale", () => {
  it("names the loaded drawer as a climate dossier for assistive technology", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Sequim climate dossier" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sequim", level: 2 })).toBeInTheDocument();
    expect(document.querySelector("figure")).toBeTruthy();
    expect(document.querySelector("figure img")).toBeTruthy();
    expect(document.querySelector("figure img")).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("falls back to the temperature palette when a place photo fails to load", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    const img = document.querySelector("figure img");
    expect(img).toBeTruthy();
    fireEvent.error(img!);
    expect(document.querySelector("figure .tc-hero-fallback")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /photo unavailable; showing its January-to-December temperature palette/i }),
    ).toBeInTheDocument();
  });

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
    expect(screen.getByRole("heading", { name: "Why it feels different" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nearby contrast" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A short history" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open this area on a live map (OpenStreetMap)" }),
    ).toHaveClass("tc-detail-map-link");
    expect(screen.getByText("The year, season by season")).toBeInTheDocument();
    for (const season of ["Winter", "Spring", "Summer", "Autumn"]) {
      expect(screen.getByText(season)).toBeInTheDocument();
    }

    // Who-it-fits framing.
    expect(screen.getByText("Why people visit")).toBeInTheDocument();
    expect(screen.getByText("Who lives here happily")).toBeInTheDocument();
    expect(screen.getByText("Who might not")).toBeInTheDocument();

    // The dossier is segmented into five reading chapters — the chapter
    // names appear both as reading-nav top-level links and as in-body zone
    // dividers between chapters.
    expect(screen.getAllByText("Live or Visit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Climate & Land").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Risks & Future").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evidence & Methods").length).toBeGreaterThan(0);

    expect(document.querySelector("figure")).toBeTruthy();
    expect(document.querySelector("figure img")).toBeTruthy();
    expect(document.querySelector("figure .tc-hero-fallback")).toBeFalsy();

    const glance = document.getElementById("pd-at-a-glance");
    const feel = document.getElementById("pd-place-feel");
    const signature = document.getElementById("pd-signature");
    expect(glance?.tagName).toBe("DETAILS");
    expect(feel?.tagName).toBe("DETAILS");
    expect(signature?.tagName).toBe("DETAILS");
    expect(glance).not.toHaveAttribute("open");
    expect(feel).not.toHaveAttribute("open");
    expect(signature).not.toHaveAttribute("open");
  });
});

describe("PlaceDetail residency fit context", () => {
  it("keeps active Fit Finder path and Live Finder constraints visible in the residency brief", () => {
    const place = PLACES_BY_ID["real-catorce-mx"] ?? PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          liveFitFilters={{
            fitPresets: new Set(["mild-winters", "dry-air"]),
            maxSummerHighC: 26,
            minWinterLowC: -5,
          }}
          residencyFitContext={{
            rankingLabel: "Best shoulder seasons",
            bundleLabel: "Mexico / Southwest",
            bundleCue: "Dry highland options",
          }}
        />
      </UnitProvider>,
    );

    const context = screen.getByLabelText("Active fit context");
    expect(context).toHaveTextContent("Current screen");
    expect(context).toHaveTextContent("Mexico / Southwest path (Dry highland options)");
    expect(context).toHaveTextContent("Best shoulder seasons");
    expect(context).toHaveTextContent("Scored for Mild winters + Dry air");
    expect(context).toHaveTextContent("summer <= 79°F");
    expect(context).toHaveTextContent("winter >= 23°F");
  });

  it("names the active ranking lens for manual Live Finder constraints", () => {
    const place = PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          liveFitFilters={{ maxOverallRisk: "moderate" }}
          residencyFitContext={{ rankingLabel: "Live-here fit" }}
        />
      </UnitProvider>,
    );

    const context = screen.getByLabelText("Active fit context");
    expect(context).toHaveTextContent("Live-here fit lens");
    expect(context).toHaveTextContent("Scored for manual Live Finder constraints");
    expect(context).toHaveTextContent("overall risk <= Moderate");
  });

  it("does not add context clutter to plain direct dossiers", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          residencyFitContext={{ rankingLabel: "Live-here fit" }}
        />
      </UnitProvider>,
    );

    expect(screen.queryByLabelText("Active fit context")).toBeNull();
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

  it("moves initial focus to the close control when the drawer mounts", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const close = screen.getByRole("button", { name: "Close profile" });
    expect(document.activeElement).toBe(close);
    expect(close).toHaveAttribute("title", "Close profile");
  });

  it("describes horizontally scrollable dossier navigation strips", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const mobileReadingNav = document.querySelector(".tc-reading-nav-mobile");
    expect(mobileReadingNav).toHaveAccessibleDescription("Swipe or scroll horizontally to browse more dossier chapters.");
    expect(screen.getByLabelText("Jump within field dossier")).toHaveAccessibleDescription(
      "Swipe or scroll horizontally to browse more field dossier chapters.",
    );
  });

  it("surfaces the decision lens in the reading nav once its chapter is open", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    expect(document.querySelector("#pd-residency-brief")).toHaveTextContent("Residency brief");

    // Only the five chapter links show initially; nested section links
    // (like "Decision lens") stay collapsed until their chapter is active.
    expect(screen.queryAllByRole("link", { name: "Decision lens" })).toHaveLength(0);

    const chapterLinks = screen.getAllByRole("link", { name: "Live or Visit" });
    expect(chapterLinks.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(chapterLinks[0]);

    expect(screen.getAllByRole("link", { name: "Decision lens" })).toHaveLength(2);
    expect(document.querySelector(".tc-reading-nav-mobile a[href='#pd-residency-brief']")).toBeInTheDocument();
    expect(document.querySelector(".tc-reading-nav-desktop a[href='#pd-residency-brief']")).toBeInTheDocument();
  });

  it("scrolls dossier navigation inside the drawer", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const drawer = document.querySelector<HTMLElement>("[data-place-detail]");
    const residency = document.querySelector<HTMLElement>("#pd-residency-brief");
    const desktopResidencyLink = document.querySelector<HTMLAnchorElement>(
      ".tc-reading-nav-desktop a[href='#pd-residency-brief']",
    );
    expect(drawer).toBeTruthy();
    expect(residency).toBeTruthy();
    expect(desktopResidencyLink).toBeTruthy();

    const scrollTo = vi.fn();
    drawer!.scrollTop = 100;
    Object.defineProperty(drawer, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(drawer, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 20, bottom: 720, left: 0, right: 900, width: 900, height: 700 }),
    });
    Object.defineProperty(residency, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 350, bottom: 650, left: 0, right: 700, width: 700, height: 300 }),
    });

    fireEvent.click(desktopResidencyLink!);

    expect(scrollTo).toHaveBeenCalledWith({ top: 418, behavior: "auto" });
    expect(window.location.hash).toBe("");

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "Jump to Sequim residency brief" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 418, behavior: "auto" });
  });

  it("keeps animated drawer entry in the viewport on first paint", () => {
    const place = PLACES_BY_ID["morelia-mx"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry />
      </UnitProvider>,
    );

    const drawer = document.querySelector("[data-place-detail]");
    expect(drawer).not.toHaveAttribute("data-motion-initial", expect.stringContaining("\"x\""));
    expect(drawer).not.toHaveAttribute("data-motion-animate", expect.stringContaining("\"x\""));
    expect(drawer).toHaveAttribute("data-motion-initial", expect.stringContaining("\"opacity\""));
  });

  it("moves deep-link focus to the shared field-dossier chapter", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();
    window.history.replaceState(null, "", "/?p=sequim-wa#deep-sequim-hydrology");
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const target = document.getElementById("deep-sequim-hydrology");
    const heading = target?.querySelector("[data-deep-chapter-title]");
    expect(target).toHaveAttribute("aria-labelledby", heading?.id);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
    expect(scrollTo).toHaveBeenCalled();
  });

  it("scrolls to a legacy pre-reorg #pd-* section hash on open", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();
    // "#pd-risk" is a stable anchor id that predates the five-chapter reorg
    // (it now lives inside the Risks & Future chapter).
    window.history.replaceState(null, "", "/?p=sequim-wa#pd-risk");
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    expect(document.getElementById("pd-risk")).toBeTruthy();
    expect(scrollTo).toHaveBeenCalled();
    // The hash itself is left untouched (unlike stale #deep-* hashes) since
    // the section it points to always exists once the drawer has rendered.
    expect(window.location.hash).toBe("#pd-risk");
  });

  it("opens a collapsed score section when the drawer loads on its #pd-* hash", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();
    window.history.replaceState(null, "", "/?p=sequim-wa#pd-signature");
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const signature = document.getElementById("pd-signature");
    expect(signature?.tagName).toBe("DETAILS");
    expect(signature).toHaveAttribute("open");
    expect(scrollTo).toHaveBeenCalled();
    expect(window.location.hash).toBe("#pd-signature");
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
    expect(addBtn).toHaveAttribute("title", `Add ${place.name} to compare`);

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
    expect(removeBtn).toHaveAttribute("title", `Remove ${place.name} from compare`);
    expect(removeBtn).toHaveClass("compare-toggle--active");
  });

  it("surfaces shortlist and compare actions inside the residency brief", () => {
    const place = PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();
    const onCompareToggle = vi.fn();
    const onBookmarkToggle = vi.fn();

    const { rerender } = render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          onCompareToggle={onCompareToggle}
          inCompareIds={new Set()}
          bookmarked={false}
          onBookmarkToggle={onBookmarkToggle}
        />
      </UnitProvider>,
    );

    expect(screen.getByLabelText(`Residency actions for ${place.name}`)).toHaveTextContent("Scout handoff");

    const pinBtn = screen.getByRole("button", { name: `Pin ${place.name} to your shortlist from residency brief` });
    expect(pinBtn).toHaveAttribute("title", `Pin ${place.name} to your shortlist from residency brief`);
    fireEvent.click(pinBtn);
    expect(onBookmarkToggle).toHaveBeenCalledWith(place.id);

    const compareBtn = screen.getByRole("button", { name: `Add ${place.name} to Compare from residency brief` });
    expect(compareBtn).toHaveAttribute("aria-pressed", "false");
    expect(compareBtn).toHaveAttribute("title", `Add ${place.name} to Compare from residency brief`);
    fireEvent.click(compareBtn);
    expect(onCompareToggle).toHaveBeenCalledWith(place.id);

    rerender(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          onCompareToggle={onCompareToggle}
          inCompareIds={new Set([place.id])}
          bookmarked={false}
          onBookmarkToggle={onBookmarkToggle}
        />
      </UnitProvider>,
    );
    const activeCompareBtn = screen.getByRole("button", { name: `Remove ${place.name} from Compare from residency brief` });
    expect(activeCompareBtn).toHaveAttribute("title", `Remove ${place.name} from Compare from residency brief`);
    expect(activeCompareBtn).toHaveClass("compare-toggle--active");
  });

  it("does not render residency actions when the dossier has no action callbacks", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    expect(screen.queryByLabelText(`Residency actions for ${place.name}`)).toBeNull();
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
      expect(chip).toHaveAttribute("aria-label", expect.stringMatching(/^Explain .+/));
      expect(chip).toHaveAttribute("title", chip.getAttribute("aria-label"));
    }
  });

  it("renders the glossary reveal close control with its touch-target class", () => {
    const place = PLACES_BY_ID["eureka-ca"] ?? PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    const chip = Array.from(document.querySelectorAll<HTMLButtonElement>(
      'button.tc-driver-chip[data-tone="ochre"][aria-expanded]',
    ))[0];
    expect(chip).toBeTruthy();

    fireEvent.click(chip!);

    expect(chip!).toHaveAttribute("aria-expanded", "true");
    const closeGlossary = screen.getByRole("button", { name: "Close glossary explanation" });
    expect(closeGlossary).toHaveClass("tc-driver-glossary-close");
    expect(closeGlossary).toHaveAttribute("title", "Close glossary explanation");
  });

  it("closes only the driver glossary on Escape and returns focus to the chip", () => {
    vi.useFakeTimers();
    const place = PLACES_BY_ID["eureka-ca"] ?? PLACES_BY_ID["yuma-az"];
    expect(place).toBeTruthy();
    const onClose = vi.fn();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={onClose} />
      </UnitProvider>,
    );
    vi.runOnlyPendingTimers();

    const chip = Array.from(document.querySelectorAll<HTMLButtonElement>(
      'button.tc-driver-chip[data-tone="ochre"][aria-expanded]',
    ))[0];
    expect(chip).toBeTruthy();

    fireEvent.click(chip!);
    expect(chip!).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Close glossary explanation" })).toBeInTheDocument();

    expect(fireEvent.keyDown(chip!, { key: "Escape" })).toBe(false);
    vi.runOnlyPendingTimers();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: `${place!.name} climate dossier` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close glossary explanation" })).not.toBeInTheDocument();
    expect(chip!).toHaveAttribute("aria-expanded", "false");
    expect(chip!).toHaveFocus();
  });

  it("wires header bookmark and compare toggles", () => {
    const place = PLACES_BY_ID["sequim-wa"]!;
    const onBookmarkToggle = vi.fn();
    const onCompareToggle = vi.fn();

    render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          bookmarked={false}
          onBookmarkToggle={onBookmarkToggle}
          onCompareToggle={onCompareToggle}
          inCompareIds={new Set()}
          animateEntry={false}
        />
      </UnitProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: `Pin ${place.name} to your shortlist` }));
    expect(onBookmarkToggle).toHaveBeenCalledWith(place.id);

    fireEvent.click(screen.getByRole("button", { name: `Add ${place.name} to compare` }));
    expect(onCompareToggle).toHaveBeenCalledWith(place.id);
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
    expect(screen.getByRole("note")).toHaveTextContent(/recent observed normals/i);
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

describe("PlaceDetail home-base anchor", () => {
  it("renders the vs-home section and an active header toggle when a home base is set", () => {
    const place = PLACES_BY_ID["boulder-co"];
    const home = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();
    expect(home).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail
          place={place}
          onClose={() => undefined}
          homePlace={home}
          onHomeBaseToggle={() => undefined}
        />
      </UnitProvider>,
    );

    expect(
      screen.getByRole("heading", { name: `Versus your home base · ${home.name}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Compared with Sequim/)).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: `Set ${place.name} as your home base for climate deltas` });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("title", `Set ${place.name} as your home base for climate deltas`);
  });

  it("flips into the baseline explainer when the open dossier IS the home base", () => {
    const home = PLACES_BY_ID["sequim-wa"];
    const onHomeBaseToggle = vi.fn();

    render(
      <UnitProvider>
        <PlaceDetail
          place={home}
          onClose={() => undefined}
          homePlace={home}
          onHomeBaseToggle={onHomeBaseToggle}
        />
      </UnitProvider>,
    );

    expect(screen.getByRole("heading", { name: "Your home base" })).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", { name: `Clear ${home.name} as your home base` });
    const headerToggle = clearButtons.find(button => button.getAttribute("aria-pressed") === "true");
    expect(headerToggle).toHaveAttribute("aria-pressed", "true");

    const sectionClear = clearButtons.find(button => button.textContent?.includes("Clear home base"));
    expect(sectionClear).toHaveClass("tc-home-base-clear");
    expect(sectionClear).toHaveAttribute("title", `Clear ${home.name} as your home base`);

    fireEvent.click(sectionClear!);
    expect(onHomeBaseToggle).toHaveBeenCalledWith(home.id);
  });

  it("renders a vs-home placeholder when no home base is set", () => {
    const place = PLACES_BY_ID["black-mountain-nc"];

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} onHomeBaseToggle={() => undefined} />
      </UnitProvider>,
    );

    expect(screen.getByRole("heading", { name: "Versus your home base" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "First-session climate journey" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Climate twins" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: `Set ${place.name} as your home base for climate deltas` }).length,
    ).toBeGreaterThanOrEqual(2);
    const sectionAction = screen
      .getAllByRole("button", { name: `Set ${place.name} as your home base for climate deltas` })
      .find(button => button.closest("#pd-vs-home"));
    expect(sectionAction).toHaveClass("min-w-0", "max-w-full", "whitespace-normal");
    expect(sectionAction).not.toHaveClass("shrink-0");
  });

  it("orders mechanism, versus home, and twins before the residency brief", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} onHomeBaseToggle={() => undefined} />
      </UnitProvider>,
    );

    const why = screen.getByRole("heading", { name: "Why this climate is different here" });
    const dossier = screen.getByRole("heading", { name: "Field dossier" });
    const vsHome = screen.getByRole("heading", { name: "Versus your home base" });
    const twins = screen.getByRole("heading", { name: "Climate twins" });
    const residency = document.getElementById("pd-residency-brief");
    expect(residency).not.toBeNull();
    expect(why.compareDocumentPosition(dossier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dossier.compareDocumentPosition(vsHome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(vsHome.compareDocumentPosition(twins) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(twins.compareDocumentPosition(residency!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("PlaceDetail archetype field guide", () => {
  it("surfaces the primary archetype guide for discovery readers", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const guide = document.getElementById("place-archetype-guide");
    expect(guide).toBeTruthy();
    expect(guide).toHaveAttribute("id", "place-archetype-guide");
    expect(guide).toHaveAttribute("hidden");
    expect(guide).toHaveTextContent(/Rain-Shadow Sanctuary/i);
    expect(guide).toHaveTextContent(/field guide/i);
    expect(guide.textContent?.length ?? 0).toBeGreaterThan(40);

    const primaryChip = screen.getByRole("button", { name: /Rain-Shadow Sanctuary:/i });
    expect(primaryChip).toHaveAttribute("aria-expanded", "false");
    expect(primaryChip).toHaveAttribute("aria-controls", "place-archetype-guide");
    fireEvent.click(primaryChip);
    expect(guide).not.toHaveAttribute("hidden");
    expect(primaryChip).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(primaryChip);
    expect(guide).toHaveAttribute("hidden");
    expect(primaryChip).toHaveAttribute("aria-expanded", "false");
  });

  it("localizes eternal-spring field-guide metres and Celsius in Fahrenheit mode", () => {
    const place = PLACES_BY_ID["valle-de-bravo-mx"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} animateEntry={false} />
      </UnitProvider>,
    );

    const primaryChip = screen.getByRole("button", { name: /Eternal-Spring Highland:/i });
    fireEvent.click(primaryChip);

    const guide = screen.getByRole("region", { name: /Eternal-Spring Highland field guide/i });
    expect(guide).toHaveTextContent(/4,921 and 8,202 ft/);
    expect(guide).toHaveTextContent(/72–79°F/);
    expect(guide).toHaveTextContent(/46–57°F/);
    expect(guide).not.toHaveTextContent(/°C/);
    expect(guide).not.toHaveTextContent(/\b1500 and 2500 m\b/);
  });
});

describe("PlaceDetail evidence hierarchy", () => {
  it("exposes a compact Evidence disclosure and screening labels on score sections", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceDetail place={place} onClose={() => undefined} />
      </UnitProvider>,
    );

    const evidence = screen.getByRole("region", { name: "Evidence and how to read this profile" });
    expect(evidence).toBeInTheDocument();
    expect(evidence).toHaveTextContent(/How to read this profile/);
    expect(evidence).toHaveTextContent(/screening/i);

    const toggle = screen.getByRole("button", { name: /How to read this profile/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(evidence).toHaveTextContent(/Confidence vs completeness/);
    expect(evidence).toHaveTextContent(/Sources by type/);

    expect(screen.getAllByText("Screening score").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Derived").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Regional projection").length).toBeGreaterThanOrEqual(1);
  });
});
