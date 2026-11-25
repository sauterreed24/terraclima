// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

function renderApp(url: string) {
  window.history.replaceState(null, "", url);
  return render(
    <UnitProvider>
      <App />
    </UnitProvider>,
  );
}

const QUICK_SEARCH = "Quick search by place name, region or climate type";

/** The visible "N of 226 places match" line (hidden from screen readers; they get the status twin). */
function visibleCount(): string {
  const node = [...document.querySelectorAll("div.text-stone-readable[aria-hidden='true']")]
    .find(el => /places/.test(el.textContent ?? ""));
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

async function typeSearch(value: string) {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(QUICK_SEARCH), { target: { value } });
  });
}

describe("Explorer result count", () => {
  it("shows the right count straight after the search is cleared, with another filter on", async () => {
    renderApp("/?c=Mexico");
    const before = visibleCount();
    expect(before).toMatch(/^\d+ of 226 places match/);

    await typeSearch("oaxaca");
    expect(visibleCount()).not.toBe(before);
    expect(visibleCount()).toMatch(/^\d+ of 226 places match/);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear quick search" }));
    });
    // No timers advanced: the count must not pass through in-between numbers.
    expect(visibleCount()).toBe(before);
  });
});

describe("Explorer search suggestions", () => {
  it("says when only close matches were found and offers the corrected name", async () => {
    renderApp("/");
    await typeSearch("flagstaf");

    const group = screen.getByRole("group", { name: "Search suggestions" });
    expect(group).toHaveTextContent("No exact match for “flagstaf”. Showing close matches.");
    const status = screen.getAllByRole("status").find(el => /No exact match/.test(el.textContent ?? ""));
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Did you mean Flagstaff");

    const pick = within(group).getByRole("button", { name: "Did you mean Flagstaff?" });
    await act(async () => {
      fireEvent.click(pick);
    });

    const input = screen.getByLabelText(QUICK_SEARCH) as HTMLInputElement;
    expect(input.value).toBe("Flagstaff");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
  });

  it("stays quiet for an exact match and for an empty search", async () => {
    renderApp("/");
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
    await typeSearch("Flagstaff");
    expect(screen.queryByRole("group", { name: "Search suggestions" })).not.toBeInTheDocument();
  });
});
