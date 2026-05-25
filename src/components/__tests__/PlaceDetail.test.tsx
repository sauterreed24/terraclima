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

    expect(screen.getByRole("heading", { name: "Soil & growability" })).toBeInTheDocument();
    expect(screen.getByText("Why this score?")).toBeInTheDocument();
    expect(screen.getByText(/^Bioclim basis: Selianinov HTC/)).toBeInTheDocument();
    expect(screen.getByText(/Thornthwaite PET .* frame this 74\/100 score/)).toBeInTheDocument();
    expect(screen.getByText(/read irrigation, soil storage, and drought trend/)).toBeInTheDocument();
  });
});
