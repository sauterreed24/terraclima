// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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

function renderFilterBar(
  temp: UnitState["temp"],
  opts: {
    filters?: FilterState;
    ranking?: RankingProfile;
    setFilters?: ComponentProps<typeof FilterBar>["setFilters"];
    setRanking?: ComponentProps<typeof FilterBar>["setRanking"];
  } = {},
) {
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
        filters={opts.filters ?? emptyFilters()}
        setFilters={opts.setFilters ?? vi.fn()}
        ranking={opts.ranking ?? "hidden-gems"}
        setRanking={opts.setRanking ?? vi.fn()}
      />
    </UnitContext.Provider>,
  );
}

describe("FilterBar Live Finder temperature constraints", () => {
  it("summarizes the active Explorer lens before the control groups", () => {
    const filters = emptyFilters();
    filters.fitPresets = new Set(["gardenable"]);
    filters.minGrowability = 65;

    renderFilterBar("F", {
      filters,
      ranking: "hidden-gems",
    });

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    expect(lens).toHaveTextContent("Hidden gems");
    expect(lens).toHaveTextContent("2 living signals active");
    expect(screen.getByText("1 Live Finder preset")).toBeInTheDocument();
    expect(screen.getByText("Garden 65+")).toBeInTheDocument();
  });

  it("renders threshold chips in Fahrenheit when the app is in Fahrenheit mode", () => {
    renderFilterBar("F");

    expect(screen.getByRole("button", { name: `<= 72${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `<= 79${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 23${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 32${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 36${DEG}F` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "<= 22C" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ">= -5C" })).not.toBeInTheDocument();
  });

  it("renders threshold chips in Celsius when the app is in Celsius mode", () => {
    renderFilterBar("C");

    expect(screen.getByRole("button", { name: `<= 22${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `<= 26${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= -5${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 0${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `>= 2${DEG}C` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `<= 72${DEG}F` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `>= 23${DEG}F` })).not.toBeInTheDocument();
  });
});

describe("FilterBar lifestyle bundles", () => {
  it("uses the active bundle as the current lens receipt when all bundle controls match", () => {
    const exactGarden = emptyFilters();
    exactGarden.fitPresets = new Set(["gardenable"]);
    exactGarden.minGrowability = 65;

    renderFilterBar("F", {
      filters: exactGarden,
      ranking: "best-growability",
    });

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    expect(lens).toHaveTextContent("Best growability");
    expect(lens).toHaveTextContent("Garden & Grow");
    expect(lens).toHaveTextContent("Long growing season");
  });

  it("only marks a lifestyle bundle active when all bundle-owned live filters match", () => {
    const exactRemote = emptyFilters();
    exactRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    exactRemote.maxSummerHighC = 26;

    renderFilterBar("F", {
      filters: exactRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByRole("button", { name: "Remote Work" })).toHaveAttribute("aria-pressed", "true");

    cleanup();

    const staleRemote = emptyFilters();
    staleRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    staleRemote.maxSummerHighC = 22;

    renderFilterBar("F", {
      filters: staleRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByRole("button", { name: "Remote Work" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clears stale Live Finder constraints when applying a lifestyle bundle", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: "Garden & Grow" }));

    expect(setRanking).toHaveBeenCalledWith("best-growability");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const previous = emptyFilters();
    previous.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    previous.maxSummerHighC = 26;
    previous.minWinterLowC = 0;
    previous.minGrowability = 75;
    previous.maxFireRisk = "low";
    previous.maxOverallRisk = "low";

    const next = updater(previous);

    expect(next.fitPresets).toEqual(new Set(["gardenable"]));
    expect(next.maxSummerHighC).toBeUndefined();
    expect(next.minWinterLowC).toBeUndefined();
    expect(next.minGrowability).toBe(65);
    expect(next.maxFireRisk).toBeUndefined();
    expect(next.maxOverallRisk).toBeUndefined();
  });
});
