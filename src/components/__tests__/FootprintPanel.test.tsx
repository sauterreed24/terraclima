// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FootprintPanel } from "../FootprintPanel";
import { PLACE_COUNTS } from "../../data/places";

afterEach(cleanup);

describe("FootprintPanel", () => {
  it("renders the three-country headline + per-tier stat blocks", () => {
    render(<FootprintPanel />);
    expect(screen.getByRole("heading", { name: "The atlas in three countries" })).toBeInTheDocument();
    // Every per-country and per-tier label appears once.
    for (const label of ["USA", "Canada", "Mexico", "Flagship", "Spotlight", "Index"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("surfaces the live corpus counts so the panel never drifts from the data", () => {
    render(<FootprintPanel />);
    const expected = [
      String(PLACE_COUNTS.usa),
      String(PLACE_COUNTS.canada),
      String(PLACE_COUNTS.mexico),
      String(PLACE_COUNTS.tierA),
      String(PLACE_COUNTS.tierB),
      String(PLACE_COUNTS.tierC),
    ];
    for (const v of expected) {
      expect(screen.getAllByText(v).length).toBeGreaterThan(0);
    }
  });
});
