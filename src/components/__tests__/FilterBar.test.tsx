// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "../FilterBar";
import { UnitContext, type UnitState } from "../../lib/units";
import { createEmptyFilterState, type FilterState, type RankingProfile } from "../../lib/scoring";

afterEach(() => cleanup());

const DEG = "\u00b0";

function assertNoStaleConstraints(state: FilterState): void {
  expect(state.maxSummerHighC).toBeUndefined();
  expect(state.minWinterLowC).toBeUndefined();
  expect(state.minGrowability).toBeUndefined();
  expect(state.maxFireRisk).toBeUndefined();
  expect(state.maxOverallRisk).toBeUndefined();
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
        filters={opts.filters ?? createEmptyFilterState()}
        setFilters={opts.setFilters ?? vi.fn()}
        ranking={opts.ranking ?? "hidden-gems"}
        setRanking={opts.setRanking ?? vi.fn()}
      />
    </UnitContext.Provider>,
  );
}

describe("FilterBar Live Finder temperature constraints", () => {
  it("summarizes the active Explorer lens before the control groups", () => {
    const filters = createEmptyFilterState();
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
    expect(within(lens).getByText("Garden 65+")).toBeInTheDocument();
  });

  it("renders threshold choices in Fahrenheit when the app is in Fahrenheit mode", () => {
    renderFilterBar("F");

    expect(screen.getByRole("combobox", { name: "Summer cap" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `<= 72${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `<= 79${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= 23${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= 32${DEG}F` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= 36${DEG}F` })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "<= 22C" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: ">= -5C" })).not.toBeInTheDocument();
  });

  it("renders threshold choices in Celsius when the app is in Celsius mode", () => {
    renderFilterBar("C");

    expect(screen.getByRole("combobox", { name: "Winter floor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `<= 22${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `<= 26${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= -5${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= 0${DEG}C` })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: `>= 2${DEG}C` })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: `<= 72${DEG}F` })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: `>= 23${DEG}F` })).not.toBeInTheDocument();
  });

  it("changes Live Finder threshold constraints from compact menus", () => {
    const setFilters = vi.fn();
    const filters = createEmptyFilterState();
    renderFilterBar("C", { filters, setFilters });

    fireEvent.change(screen.getByRole("combobox", { name: "Summer cap" }), {
      target: { value: "22" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Fire ceiling" }), {
      target: { value: "moderate" },
    });

    const summerUpdater = setFilters.mock.calls[0][0] as (f: FilterState) => FilterState;
    const fireUpdater = setFilters.mock.calls[1][0] as (f: FilterState) => FilterState;

    expect(summerUpdater(filters).maxSummerHighC).toBe(22);
    expect(fireUpdater(filters).maxFireRisk).toBe("moderate");
  });
});

describe("FilterBar ranking menu", () => {
  it("changes the active ranking from the compact Rank by menu", () => {
    const setRanking = vi.fn();
    renderFilterBar("F", {
      ranking: "hidden-gems",
      setRanking,
    });

    const rankMenu = screen.getByRole("combobox", { name: "Rank by" });

    expect(rankMenu).toHaveValue("hidden-gems");
    expect(screen.getByText("Current list and map: Hidden gems")).toBeInTheDocument();

    fireEvent.change(rankMenu, { target: { value: "most-comfortable" } });

    expect(setRanking).toHaveBeenCalledWith("most-comfortable");
  });
});

describe("FilterBar lifestyle bundles", () => {
  it("renders guided Fit Finder paths before manual Live Finder signals", () => {
    renderFilterBar("F");

    expect(screen.getByText("Fit Finder")).toBeInTheDocument();
    expect(screen.getByText(/Start with what you are escaping or seeking/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cool Summer Refuge/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Winter Sun/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Low Fire \/ Smoke/ })).toBeInTheDocument();
    expect(screen.getByText("Live Finder signals")).toBeInTheDocument();
  });

  it("discloses each path's applied ranking and Live Finder constraints", () => {
    renderFilterBar("C");

    const coolPath = screen.getByRole("button", { name: /Cool Summer Refuge/ });
    expect(coolPath).toHaveAttribute("aria-describedby", expect.stringContaining("-applies"));
    expect(within(coolPath).getByText("Applies")).toBeInTheDocument();
    expect(coolPath).toHaveTextContent("Rank: Coolest summers");
    expect(coolPath).toHaveTextContent("Fit: Cool");
    expect(coolPath).toHaveTextContent(`Summer <= 26${DEG}C`);

    const winterSunPath = screen.getByRole("button", { name: /Winter Sun/ });
    expect(winterSunPath).toHaveTextContent("Rank: Sunniest winters");
    expect(winterSunPath).toHaveTextContent("Fit: Mild");
    expect(winterSunPath).toHaveTextContent("Fit: Sun");
    expect(winterSunPath).toHaveTextContent(`Winter >= -5${DEG}C`);

    cleanup();
    renderFilterBar("F");

    const remotePath = screen.getByRole("button", { name: /Remote Work/ });
    expect(remotePath).toHaveTextContent("Rank: Remote-work ready");
    expect(remotePath).toHaveTextContent("Fit: Cool");
    expect(remotePath).toHaveTextContent("Fit: Low fire");
    expect(remotePath).toHaveTextContent(`Summer <= 79${DEG}F`);
  });

  it("uses the active bundle as the current lens receipt when all bundle controls match", () => {
    const exactGarden = createEmptyFilterState();
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
    const exactRemote = createEmptyFilterState();
    exactRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    exactRemote.maxSummerHighC = 26;

    renderFilterBar("F", {
      filters: exactRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByTitle("Cool, productive summers. Low fire & smoke. Mild winters. Ranked by remote-work readiness.")).toHaveAttribute("data-active", "true");

    cleanup();

    const staleRemote = createEmptyFilterState();
    staleRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    staleRemote.maxSummerHighC = 22;

    renderFilterBar("F", {
      filters: staleRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByTitle("Cool, productive summers. Low fire & smoke. Mild winters. Ranked by remote-work readiness.")).toHaveAttribute("data-active", "false");
  });

  it("clears stale Live Finder constraints when applying a lifestyle bundle", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: /Garden & Grow/ }));

    expect(setRanking).toHaveBeenCalledWith("best-growability");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const previous = createEmptyFilterState();
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

  it("keeps cool-summer guidance separate from snow-country guidance", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: /Cool Summer Refuge/ }));

    expect(setRanking).toHaveBeenCalledWith("coolest-summers");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const next = updater(createEmptyFilterState());

    expect(next.fitPresets).toEqual(new Set(["cool-summers"]));
    expect(next.maxSummerHighC).toBe(26);
    expect(next.fitPresets?.has("snow-country")).toBe(false);
    expect(next.fitPresets?.has("four-seasons")).toBe(false);
  });

  it("applies Winter Sun as a sunny-winter and mild-winter screen", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: /Winter Sun/ }));

    expect(setRanking).toHaveBeenCalledWith("sunniest-winters");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const next = updater(createEmptyFilterState());

    expect(next.fitPresets).toEqual(new Set(["sunny-winters", "mild-winters"]));
    expect(next.minWinterLowC).toBe(-5);
    expect(next.maxSummerHighC).toBeUndefined();
    expect(next.minGrowability).toBeUndefined();
  });
});

describe("FilterBar clear all filters", () => {
  it("clears search, geography, presets, and Live Finder constraints", () => {
    const setFilters = vi.fn();
    const polluted = createEmptyFilterState();
    polluted.countries = new Set(["USA"]);
    polluted.archetypes = new Set(["mediterranean-pocket"]);
    polluted.fitPresets = new Set(["cool-summers"]);
    polluted.search = "garden";
    polluted.maxSummerHighC = 22;
    polluted.minWinterLowC = 2;
    polluted.minGrowability = 75;
    polluted.maxFireRisk = "low";
    polluted.maxOverallRisk = "moderate";

    renderFilterBar("F", { filters: polluted, setFilters });

    fireEvent.click(screen.getAllByRole("button", { name: "Clear all filters" })[0]);

    expect(setFilters).toHaveBeenCalledTimes(1);
    const next = setFilters.mock.calls[0][0] as FilterState;
    expect(next).toEqual(createEmptyFilterState());
    assertNoStaleConstraints(next);
  });

  it("the in-field × clears only the search text, preserving other filters", () => {
    const setFilters = vi.fn();
    const state = createEmptyFilterState();
    state.search = "garden";
    state.countries = new Set(["USA"]);
    state.fitPresets = new Set(["cool-summers"]);

    renderFilterBar("F", { filters: state, setFilters });

    // The in-field clear is "Clear search", distinct from the lens "Clear all filters".
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(setFilters).toHaveBeenCalledTimes(1);
    const updater = setFilters.mock.calls[0][0] as (f: FilterState) => FilterState;
    const result = updater(state);
    expect(result.search).toBe("");
    expect(result.countries).toEqual(new Set(["USA"]));
    expect(result.fitPresets).toEqual(new Set(["cool-summers"]));
  });

  it("Lens Receipt clear all uses the same reset shape as the search clear control", () => {
    const setFilters = vi.fn();
    const polluted = createEmptyFilterState();
    polluted.search = "sequim";
    polluted.fitPresets = new Set(["cool-summers"]);

    renderFilterBar("F", { filters: polluted, setFilters });

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    fireEvent.click(within(lens).getByRole("button", { name: "Clear all filters" }));

    expect(setFilters).toHaveBeenCalledWith(createEmptyFilterState());
  });
});

describe("FilterBar climate scenario chip", () => {
  it("shows a dismissible chip and projection lens line when scn≠now", () => {
    const onScenarioChange = vi.fn();
    const units: UnitState = {
      temp: "F",
      dist: "imperial",
      setTemp: vi.fn(),
      setDist: vi.fn(),
      toggle: vi.fn(),
    };
    render(
      <UnitContext.Provider value={units}>
        <FilterBar
          filters={createEmptyFilterState()}
          setFilters={vi.fn()}
          ranking="hidden-gems"
          setRanking={vi.fn()}
          scenario="ssp585"
          onScenarioChange={onScenarioChange}
        />
      </UnitContext.Provider>,
    );

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    expect(lens).toHaveTextContent("SSP5-8.5");
    expect(lens).toHaveTextContent("illustrative regional projection");
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: 2050 high" }));
    expect(onScenarioChange).toHaveBeenCalledWith("now");
  });
});
