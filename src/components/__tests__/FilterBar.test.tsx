// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "../FilterBar";
import { UnitContext, type UnitState } from "../../lib/units";
import type { FilterState, RankingProfile } from "../../lib/scoring";

afterEach(() => cleanup());

const DEG = "\u00b0";

function emptyFilters(): FilterState {
  return {
    countries: new Set(),
    archetypes: new Set(),
    fitPresets: new Set(),
    search: "",
  };
}

function renderFilterBar(temp: UnitState["temp"]) {
  const units: UnitState = {
    temp,
    dist: temp === "C" ? "metric" : "imperial",
    setTemp: vi.fn(),
    setDist: vi.fn(),
    toggle: vi.fn(),
  };
  return render(
    <UnitContext.Provider value={units}>
      <FilterBar
        filters={emptyFilters()}
        setFilters={vi.fn()}
        ranking={"hidden-gems" as RankingProfile}
        setRanking={vi.fn()}
      />
    </UnitContext.Provider>,
  );
}

describe("FilterBar Live Finder temperature constraints", () => {
  it("renders threshold chips in Fahrenheit when the app is in Fahrenheit mode", () => {
    renderFilterBar("F");

    expect(screen.getByRole("button", { name: `<= 72${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `<= 79${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 23${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 32${DEG}F` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "<= 22C" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ">= -5C" })).not.toBeInTheDocument();
  });

  it("renders threshold chips in Celsius when the app is in Celsius mode", () => {
    renderFilterBar("C");

    expect(screen.getByRole("button", { name: `<= 22${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `<= 26${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= -5${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 0${DEG}C` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `<= 72${DEG}F` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `>= 23${DEG}F` })).not.toBeInTheDocument();
  });
});
