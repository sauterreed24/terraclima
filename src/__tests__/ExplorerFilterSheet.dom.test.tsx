// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ExplorerFilterSheet } from "../components/ExplorerFilterSheet";
import type { FilterState } from "../lib/scoring";

const filters: FilterState = {
  countries: new Set(),
  archetypes: new Set(),
  search: "",
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    this.dispatchEvent(new Event("toggle"));
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("toggle"));
  };
});

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

    expect(screen.getByPlaceholderText("Search places")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search name, region, or archetype")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Close filters" })).toHaveLength(1);
  });
});
