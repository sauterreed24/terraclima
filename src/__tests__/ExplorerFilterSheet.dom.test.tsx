// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ExplorerFilterSheet } from "../components/ExplorerFilterSheet";
import type { FilterState } from "../lib/scoring";

const filters: FilterState = {
  countries: new Set(),
  archetypes: new Set(),
  search: "",
};
const DEG = "\u00b0";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    this.setAttribute("open", "");
    this.dispatchEvent(new Event("toggle"));
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("toggle"));
  };
});

afterEach(() => cleanup());

describe("ExplorerFilterSheet", () => {
  it("uses the shorter mobile placeholder and exposes one accessible close control", () => {
    render(
      <ExplorerFilterSheet
        searchInputId="test-search"
        filters={filters}
        setFilters={vi.fn()}
        ranking="hidden-gems"
        setRanking={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Explorer filters and ranking" }));

    expect(screen.getByRole("dialog", { name: "Filters & ranking" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByPlaceholderText("Search places")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search name, region, or archetype")).toBeNull();
    const closeButtons = screen.getAllByRole("button", { name: "Close filters" });
    expect(closeButtons).toHaveLength(1);
    const [closeButton] = closeButtons;
    expect(closeButton).toHaveAttribute("title", "Close filters");
    const dialog = screen.getByRole("dialog", { name: "Filters & ranking" });
    expect(dialog.querySelector("[aria-hidden='true'][class*='fixed']")).not.toBeInTheDocument();
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute("open");
  }, 30000);

  it("moves initial focus to the search field when opened", async () => {
    render(
      <ExplorerFilterSheet
        searchInputId="test-search"
        filters={filters}
        setFilters={vi.fn()}
        ranking="hidden-gems"
        setRanking={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Explorer filters and ranking" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Search places by name, region, or archetype" })).toHaveFocus();
    });
  }, 30000);

  it("counts an active climate scenario in the filter trigger badge", () => {
    render(
      <ExplorerFilterSheet
        searchInputId="test-search"
        filters={filters}
        setFilters={vi.fn()}
        ranking="hidden-gems"
        setRanking={vi.fn()}
        scenario="ssp245"
        onScenarioChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Open Explorer filters and ranking (1 active filter)" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("describes the active lens on the floating trigger before opening filters", () => {
    const activeFilters: FilterState = {
      countries: new Set(["USA"]),
      archetypes: new Set(),
      fitPresets: new Set(["cool-summers"]),
      search: "sequim",
      maxSummerHighC: 26,
    };

    render(
      <ExplorerFilterSheet
        searchInputId="test-search"
        filters={activeFilters}
        setFilters={vi.fn()}
        ranking="hidden-gems"
        setRanking={vi.fn()}
        scenario="ssp245"
        onScenarioChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open Explorer filters and ranking (5 active filters)" });
    const summary = `Active Explorer filters: search "sequim"; countries USA; Live Finder Cool; summer at or below 79${DEG}F; climate layer 2050 mid.`;

    expect(trigger).toHaveAccessibleDescription(summary);
    expect(trigger).toHaveAttribute("title", summary);
  });
});
