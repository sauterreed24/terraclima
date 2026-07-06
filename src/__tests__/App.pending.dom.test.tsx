// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

vi.mock("../hooks/use-climate-processor", () => ({
  useClimateProcessor: () => ({
    rows: [],
    projecting: true,
  }),
}));

afterEach(cleanup);

describe("App pending affordances", () => {
  it("marks the map stage pending while scenario projection is in flight", () => {
    render(
      <UnitProvider>
        <App />
      </UnitProvider>,
    );
    const stage = document.querySelector(".tc-map-stage");
    expect(stage).toHaveAttribute("data-pending", "true");
    expect(stage).toHaveAttribute("aria-busy", "true");
  });
});
