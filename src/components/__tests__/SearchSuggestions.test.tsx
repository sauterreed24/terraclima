// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchSuggestions } from "../SearchSuggestions";
import { PLACES } from "../../data/places";
import { suggestPlaceSearches } from "../../lib/place-search";

afterEach(cleanup);

describe("SearchSuggestions", () => {
  it("offers up to three suggestions when nothing matches", () => {
    const query = "flagstxf";
    const expected = suggestPlaceSearches(query, PLACES, 3);
    expect(expected.length).toBeGreaterThan(0);
    const onPick = vi.fn();
    render(<SearchSuggestions query={query} pool={PLACES} resultCount={0} onPick={onPick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(expected.length);
    expect(buttons.length).toBeLessThanOrEqual(3);
    expect(buttons[0]).toHaveTextContent(`Did you mean ${expected[0]!.text}?`);
    fireEvent.click(buttons[0]!);
    expect(onPick).toHaveBeenCalledWith(expected[0]!.text);
    expect(screen.getByRole("status")).toHaveTextContent(`Did you mean ${expected.map(s => s.text).join(", ")}?`);
  });

  it("keeps an empty polite status and no buttons when nothing is close", () => {
    render(<SearchSuggestions query="qqqqzzzzxxxx" pool={PLACES} resultCount={0} onPick={() => undefined} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();
  });

  it("shows nothing for an exact match or a blank query", () => {
    const { rerender } = render(<SearchSuggestions query="Flagstaff" pool={PLACES} resultCount={1} onPick={() => undefined} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    rerender(<SearchSuggestions query="  " pool={PLACES} resultCount={226} onPick={() => undefined} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
