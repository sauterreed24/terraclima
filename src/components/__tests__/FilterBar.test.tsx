// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type ComponentProps } from "react";
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
  it("clears a focused search on Escape before an owning dialog can close", () => {
    function StatefulFilterBar() {
      const [filters, setFilters] = useState<FilterState>({
        ...createEmptyFilterState(),
        search: "zzzz-no-match",
      });
      const units: UnitState = {
        temp: "C",
        dist: "metric",
        setTemp: vi.fn(),
        setDist: vi.fn(),
        toggle: vi.fn(),
      };
      return (
        <UnitContext.Provider value={units}>
          <FilterBar
            searchInputId="test-search"
            filters={filters}
            setFilters={setFilters}
            ranking="live-fit"
            setRanking={vi.fn()}
            variant="sheet"
          />
        </UnitContext.Provider>
      );
    }

    render(<StatefulFilterBar />);

    const search = screen.getByRole("textbox", { name: "Search places by name, region, or archetype" }) as HTMLInputElement;
    search.focus();

    expect(search.value).toBe("zzzz-no-match");
    expect(fireEvent.keyDown(search, { key: "Escape" })).toBe(false);
    expect(search.value).toBe("");
    expect(search).toHaveFocus();
  });

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
    expect(within(lens).getByRole("button", { name: "Clear all filters" })).toHaveAttribute("title", "Clear all filters");
    expect(within(lens).getByRole("button", { name: "Remove filter: 1 Live Finder preset" })).toHaveAttribute(
      "title",
      "Remove filter: 1 Live Finder preset",
    );
    expect(within(lens).getByRole("button", { name: "Remove filter: Garden 65+" })).toHaveAttribute(
      "title",
      "Remove filter: Garden 65+",
    );
  });

  it("renders threshold choices in Fahrenheit when the app is in Fahrenheit mode", () => {
    renderFilterBar("F");

    expect(screen.getByRole("combobox", { name: "Summer cap" })).toHaveAttribute("title", "Summer cap");
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

    expect(screen.getByRole("combobox", { name: "Winter floor" })).toHaveAttribute("title", "Winter floor");
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
    const escapeLane = screen.getByRole("group", { name: "Escape discomfort" });
    const dailyLane = screen.getByRole("group", { name: "Daily life fit" });
    const terrainLane = screen.getByRole("group", { name: "Terrain & seasons" });
    expect(escapeLane).toHaveTextContent("Heat, gray winters, smoke, humidity.");
    expect(dailyLane).toHaveTextContent("Work, retirement, gardens, quiet towns.");
    expect(terrainLane).toHaveTextContent("Coasts, snow, shoulder seasons, Mexico / Southwest.");
    expect(screen.getByRole("button", { name: /Cool Summer Refuge/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Winter Sun/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mexico \/ Southwest/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Low Fire \/ Smoke/ })).toBeInTheDocument();
    expect(within(escapeLane).getByRole("button", { name: "Apply Cool Summer Refuge Fit Finder path" })).toHaveAttribute(
      "title",
      "Apply Cool Summer Refuge Fit Finder path",
    );
    expect(within(dailyLane).getByRole("button", { name: /Remote Work/ })).toBeInTheDocument();
    expect(within(terrainLane).getByRole("button", { name: /Mexico \/ Southwest/ })).toBeInTheDocument();
    expect(screen.getByText("Live Finder signals")).toBeInTheDocument();
  });

  it("discloses each path's applied ranking and Live Finder constraints", () => {
    renderFilterBar("C");

    const coolPath = screen.getByRole("button", { name: /Cool Summer Refuge/ });
    expect(coolPath).toHaveAttribute("aria-describedby", expect.stringContaining("-applies"));
    expect(within(coolPath).getByText("Rank")).toBeInTheDocument();
    expect(within(coolPath).getByText("Signals")).toBeInTheDocument();
    expect(coolPath).toHaveTextContent("Coolest summers");
    expect(coolPath).toHaveTextContent(`Cool · summer <= 26${DEG}C`);
    const coolAppliesId = coolPath.getAttribute("aria-describedby")?.split(" ").find(id => id.endsWith("-applies"));
    expect(coolAppliesId).toBeTruthy();
    expect(document.getElementById(coolAppliesId!)).toHaveAttribute(
      "aria-label",
      `Cool Summer Refuge applied settings: Rank: Coolest summers · Fit: Cool · Summer <= 26${DEG}C`,
    );

    const winterSunPath = screen.getByRole("button", { name: /Winter Sun/ });
    expect(winterSunPath).toHaveTextContent("Sunniest winters");
    expect(winterSunPath).toHaveTextContent(`Sun · Mild · winter -5${DEG}C+`);
    const winterSunAppliesId = winterSunPath.getAttribute("aria-describedby")?.split(" ").find(id => id.endsWith("-applies"));
    expect(document.getElementById(winterSunAppliesId!)).toHaveAttribute(
      "aria-label",
      `Winter Sun applied settings: Rank: Sunniest winters · Fit: Sun · Fit: Mild · Winter >= -5${DEG}C`,
    );

    const mexicoPath = screen.getByRole("button", { name: /Mexico \/ Southwest/ });
    expect(mexicoPath).toHaveTextContent("Best shoulder seasons");
    expect(mexicoPath).toHaveTextContent(`Dry · Mild · summer <= 26${DEG}C · winter -5${DEG}C+`);
    expect(mexicoPath).toHaveTextContent("Scope");
    expect(mexicoPath).toHaveTextContent("U.S. + Mexico");
    expect(mexicoPath).toHaveTextContent("Eternal-Spring Highland + Volcanic Upland + Sky-Island Refuge + 3 more");
    const mexicoAppliesId = mexicoPath.getAttribute("aria-describedby")?.split(" ").find(id => id.endsWith("-applies"));
    expect(document.getElementById(mexicoAppliesId!)).toHaveAttribute(
      "aria-label",
      `Mexico / Southwest applied settings: Rank: Best shoulder seasons · Fit: Dry · Fit: Mild · Region: U.S. + Mexico · Terrain: Eternal-Spring Highland + Volcanic Upland + Sky-Island Refuge + High-Desert Escape + Monsoon-Edge Zone + Mild-Winter Foothills · Summer <= 26${DEG}C · Winter >= -5${DEG}C`,
    );

    cleanup();
    renderFilterBar("F");

    const remotePath = screen.getByRole("button", { name: /Remote Work/ });
    expect(remotePath).toHaveTextContent("Remote-work ready");
    expect(remotePath).toHaveTextContent(`Cool · Low fire · summer <= 79${DEG}F`);
    const remoteAppliesId = remotePath.getAttribute("aria-describedby")?.split(" ").find(id => id.endsWith("-applies"));
    expect(document.getElementById(remoteAppliesId!)).toHaveAttribute(
      "aria-label",
      `Remote Work applied settings: Rank: Remote-work ready · Fit: Cool · Fit: Low fire · Summer <= 79${DEG}F`,
    );
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

  it("explains the unfiltered Most comfortable ranking instead of calling it ranking only", () => {
    renderFilterBar("F", { ranking: "most-comfortable" });

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    expect(lens).toHaveTextContent("Most comfortable");
    expect(lens).toHaveTextContent("felt temperature, atmospheric ease, usable months, hazard cushion, and lived friction");
    expect(lens).not.toHaveTextContent("Broad atlas scan with ranking only");
  });

  it("only marks a lifestyle bundle active when all bundle-owned live filters match", () => {
    const exactRemote = createEmptyFilterState();
    exactRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    exactRemote.maxSummerHighC = 26;

    renderFilterBar("F", {
      filters: exactRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByRole("button", { name: "Remote Work Fit Finder path is active" })).toHaveAttribute("data-active", "true");

    cleanup();

    const staleRemote = createEmptyFilterState();
    staleRemote.fitPresets = new Set(["cool-summers", "low-fire-smoke"]);
    staleRemote.maxSummerHighC = 22;

    renderFilterBar("F", {
      filters: staleRemote,
      ranking: "best-for-remote-work",
    });

    expect(screen.getByRole("button", { name: "Apply Remote Work Fit Finder path" })).toHaveAttribute("data-active", "false");
  });

  it("marks a geography-scoped path active only when region and terrain filters match", () => {
    const exactMexicoSouthwest = createEmptyFilterState();
    exactMexicoSouthwest.fitPresets = new Set(["dry-air", "mild-winters"]);
    exactMexicoSouthwest.countries = new Set(["USA", "Mexico"]);
    exactMexicoSouthwest.archetypes = new Set([
      "eternal-spring-highland",
      "volcanic-upland",
      "sky-island-refuge",
      "high-desert-escape",
      "monsoon-edge",
      "mild-winter-foothills",
    ]);
    exactMexicoSouthwest.maxSummerHighC = 26;
    exactMexicoSouthwest.minWinterLowC = -5;

    renderFilterBar("F", {
      filters: exactMexicoSouthwest,
      ranking: "best-shoulder-seasons",
    });

    expect(screen.getByRole("button", { name: "Mexico / Southwest Fit Finder path is active" })).toHaveAttribute("data-active", "true");

    cleanup();

    const staleScope = createEmptyFilterState();
    staleScope.fitPresets = new Set(["dry-air", "mild-winters"]);
    staleScope.countries = new Set(["USA"]);
    staleScope.archetypes = new Set(exactMexicoSouthwest.archetypes);
    staleScope.maxSummerHighC = 26;
    staleScope.minWinterLowC = -5;

    renderFilterBar("F", {
      filters: staleScope,
      ranking: "best-shoulder-seasons",
    });

    expect(screen.getByRole("button", { name: "Apply Mexico / Southwest Fit Finder path" })).toHaveAttribute("data-active", "false");
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

  it("clears geography scope when switching from a regional path to a global one", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: /Cool Summer Refuge/ }));

    expect(setRanking).toHaveBeenCalledWith("coolest-summers");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const previous = createEmptyFilterState();
    previous.countries = new Set(["USA", "Mexico"]);
    previous.archetypes = new Set([
      "eternal-spring-highland",
      "volcanic-upland",
      "sky-island-refuge",
      "high-desert-escape",
      "monsoon-edge",
      "mild-winter-foothills",
    ]);
    previous.fitPresets = new Set(["dry-air", "mild-winters"]);
    previous.maxSummerHighC = 26;
    previous.minWinterLowC = -5;

    const next = updater(previous);

    expect(next.countries).toEqual(new Set());
    expect(next.archetypes).toEqual(new Set());
    expect(next.fitPresets).toEqual(new Set(["cool-summers"]));
    expect(next.maxSummerHighC).toBe(26);
    expect(next.minWinterLowC).toBeUndefined();
  });

  it("does not mark a global path active while stale geography filters remain", () => {
    const staleCoolSummer = createEmptyFilterState();
    staleCoolSummer.fitPresets = new Set(["cool-summers"]);
    staleCoolSummer.maxSummerHighC = 26;
    staleCoolSummer.countries = new Set(["USA", "Mexico"]);
    staleCoolSummer.archetypes = new Set(["sky-island-refuge"]);

    renderFilterBar("F", {
      filters: staleCoolSummer,
      ranking: "coolest-summers",
    });

    expect(screen.getByRole("button", { name: "Apply Cool Summer Refuge Fit Finder path" })).toHaveAttribute("data-active", "false");
  });

  it("applies the Mexico / Southwest path as a scoped regional dry-highland screen", () => {
    const setFilters = vi.fn();
    const setRanking = vi.fn();
    renderFilterBar("F", { setFilters, setRanking });

    fireEvent.click(screen.getByRole("button", { name: /Mexico \/ Southwest/ }));

    expect(setRanking).toHaveBeenCalledWith("best-shoulder-seasons");
    const updater = setFilters.mock.calls[0][0] as (filters: FilterState) => FilterState;
    const previous = createEmptyFilterState();
    previous.countries = new Set(["Canada"]);
    previous.archetypes = new Set(["fog-belt-coast"]);
    previous.fitPresets = new Set(["snow-country"]);
    previous.maxOverallRisk = "low";

    const next = updater(previous);

    expect(next.countries).toEqual(new Set(["USA", "Mexico"]));
    expect(next.archetypes).toEqual(new Set([
      "eternal-spring-highland",
      "volcanic-upland",
      "sky-island-refuge",
      "high-desert-escape",
      "monsoon-edge",
      "mild-winter-foothills",
    ]));
    expect(next.fitPresets).toEqual(new Set(["dry-air", "mild-winters"]));
    expect(next.maxSummerHighC).toBe(26);
    expect(next.minWinterLowC).toBe(-5);
    expect(next.minGrowability).toBeUndefined();
    expect(next.maxFireRisk).toBeUndefined();
    expect(next.maxOverallRisk).toBeUndefined();
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

  it("labels compact country chips with explicit filter actions", () => {
    const setFilters = vi.fn();
    const state = createEmptyFilterState();
    state.countries = new Set(["USA"]);

    renderFilterBar("F", { filters: state, setFilters });

    const usa = screen.getByRole("button", { name: "Remove United States country filter" });
    expect(usa).toHaveTextContent("USA");
    expect(usa).toHaveAttribute("title", "Remove United States country filter");
    expect(usa).toHaveAttribute("aria-pressed", "true");

    const mexico = screen.getByRole("button", { name: "Filter to Mexico places" });
    expect(mexico).toHaveAttribute("title", "Filter to Mexico places");
    expect(mexico).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(mexico);

    const updater = setFilters.mock.calls[0][0] as (f: FilterState) => FilterState;
    expect(updater(state).countries).toEqual(new Set(["USA", "Mexico"]));
  });

  it("labels group reset controls and clears only that filter group", () => {
    const setFilters = vi.fn();
    const state = createEmptyFilterState();
    state.countries = new Set(["USA"]);
    state.archetypes = new Set(["mediterranean-pocket", "fog-belt-coast"]);
    state.fitPresets = new Set(["cool-summers", "dry-air"]);
    state.maxSummerHighC = 26;

    renderFilterBar("F", { filters: state, setFilters });

    const clearPresets = screen.getByRole("button", { name: "Clear Live Finder presets" });
    expect(clearPresets).toHaveTextContent("Clear presets");
    expect(clearPresets).toHaveAttribute("title", "Clear Live Finder presets");

    const clearArchetypes = screen.getByRole("button", { name: "Clear 2 archetype filters" });
    expect(clearArchetypes).toHaveTextContent("clear · 2");
    expect(clearArchetypes).toHaveAttribute("title", "Clear 2 archetype filters");

    fireEvent.click(clearPresets);
    fireEvent.click(clearArchetypes);

    const presetUpdater = setFilters.mock.calls[0][0] as (f: FilterState) => FilterState;
    const archetypeUpdater = setFilters.mock.calls[1][0] as (f: FilterState) => FilterState;

    expect(presetUpdater(state)).toMatchObject({
      countries: new Set(["USA"]),
      archetypes: new Set(["mediterranean-pocket", "fog-belt-coast"]),
      fitPresets: new Set(),
      maxSummerHighC: 26,
    });
    expect(archetypeUpdater(state)).toMatchObject({
      countries: new Set(["USA"]),
      archetypes: new Set(),
      fitPresets: new Set(["cool-summers", "dry-air"]),
      maxSummerHighC: 26,
    });
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

  it("Lens Receipt clear all prefers onClearAll when App wires a full Explorer reset", () => {
    const setFilters = vi.fn();
    const onClearAll = vi.fn();
    const polluted = createEmptyFilterState();
    polluted.search = "fog";
    polluted.countries = new Set(["USA"]);

    render(
      <UnitContext.Provider value={{
        temp: "F",
        dist: "imperial",
        setTemp: vi.fn(),
        setDist: vi.fn(),
        toggle: vi.fn(),
      }}
      >
        <FilterBar
          filters={polluted}
          setFilters={setFilters}
          ranking="live-fit"
          setRanking={vi.fn()}
          onClearAll={onClearAll}
        />
      </UnitContext.Provider>,
    );

    const lens = screen.getByRole("region", { name: "Current Explorer lens" });
    fireEvent.click(within(lens).getByRole("button", { name: "Clear all filters" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(setFilters).not.toHaveBeenCalled();
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
    expect(lens).toHaveTextContent(/projection/i);
    const scenarioChip = screen.getByRole("button", { name: "Remove filter: 2050 high" });
    expect(scenarioChip).toHaveAttribute("title", "Remove filter: 2050 high");
    fireEvent.click(scenarioChip);
    expect(onScenarioChange).toHaveBeenCalledWith("now");
  });
});
