// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIMATE_TRIP_THEMES } from "../../data/climate-trip-themes";
import { UnitProvider } from "../../lib/units";
import { ClimateTripsView } from "../ClimateTripsView";

afterEach(() => cleanup());

function renderClimateTripsView(activeThemeId?: string) {
  const onOpenPlace = vi.fn();
  const onPickTripTheme = vi.fn();
  const onComparePlaces = vi.fn();
  const result = render(
    <UnitProvider>
      <ClimateTripsView
        onOpenPlace={onOpenPlace}
        onPickTripTheme={onPickTripTheme}
        onComparePlaces={onComparePlaces}
        activeThemeId={activeThemeId}
      />
    </UnitProvider>,
  );
  return { ...result, onOpenPlace, onPickTripTheme, onComparePlaces };
}

describe("ClimateTripsView", () => {
  it("gives the Trips hero direct shortcuts to styles, stops, and seasonal windows", () => {
    renderClimateTripsView();

    expect(screen.getByRole("link", { name: `Jump to ${CLIMATE_TRIP_THEMES.length} climate trip styles` })).toHaveAttribute("href", "#trip-styles-heading");
    expect(screen.getByRole("link", { name: "Jump to 9 concrete climate tourism stops" })).toHaveAttribute("href", "#tourism-picks-heading");
    expect(screen.getByRole("link", { name: "Jump to best seasonal windows" })).toHaveAttribute("href", "#seasonal-windows-heading");
    const quickRead = screen.getByLabelText("Climate Trips quick read");
    expect(quickRead).toHaveTextContent(`${CLIMATE_TRIP_THEMES.length} trip styles`);
    expect(quickRead).toHaveTextContent("9 concrete stops");
    expect(quickRead).toHaveTextContent(/Top pick: .+ \d+\/100/);
  });

  it("gives repeated trip style actions unique accessible names", () => {
    const firstTheme = CLIMATE_TRIP_THEMES[0];
    const { onPickTripTheme, onComparePlaces } = renderClimateTripsView();
    const firstCard = screen.getByRole("heading", { name: firstTheme.title }).closest(".climate-trip-card");

    expect(firstCard).not.toBeNull();
    const filterButton = within(firstCard as HTMLElement).getByRole("button", {
      name: `Filter map to trip style: ${firstTheme.title}`,
    });
    expect(filterButton).toHaveAttribute("title", filterButton.getAttribute("aria-label"));
    fireEvent.click(filterButton);

    const compareButton = within(firstCard as HTMLElement).getByRole("button", {
      name: `Compare top stops for ${firstTheme.title}`,
    });
    expect(compareButton).toHaveAttribute("title", compareButton.getAttribute("aria-label"));
    fireEvent.click(compareButton);

    expect(onPickTripTheme).toHaveBeenCalledWith(firstTheme.id);
    expect(onComparePlaces).toHaveBeenCalledTimes(1);
    expect(onComparePlaces.mock.calls[0][0].length).toBeGreaterThan(1);
    expect(onComparePlaces.mock.calls[0][1]).toEqual({ trigger: compareButton });
  });

  it("places trip style actions before the long trip read", () => {
    const firstTheme = CLIMATE_TRIP_THEMES[0];
    renderClimateTripsView();
    const firstCard = screen.getByRole("heading", { name: firstTheme.title }).closest(".climate-trip-card");
    const actionBlock = firstCard?.querySelector(".climate-trip-card__actions");
    const description = within(firstCard as HTMLElement).getByText(firstTheme.description);

    expect(actionBlock).not.toBeNull();
    expect(actionBlock?.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("names the active trip action as a clear action", () => {
    const firstTheme = CLIMATE_TRIP_THEMES[0];
    const { onPickTripTheme } = renderClimateTripsView(firstTheme.id);

    const activeButton = screen.getByRole("button", {
      name: `Clear trip filter for ${firstTheme.title}`,
    });
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
    expect(activeButton).toHaveAttribute("title", activeButton.getAttribute("aria-label"));
    expect(activeButton).toHaveTextContent("Clear trip filter");

    fireEvent.click(activeButton);
    expect(onPickTripTheme).toHaveBeenCalledWith(firstTheme.id);
  });

  it("names tourism pick profile buttons by place", () => {
    const { container, onOpenPlace } = renderClimateTripsView();
    const pickCard = screen.getAllByText("Tourism")[0].closest(".climate-trip-pick-card");
    const profileButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[aria-label*='climate tourism profile']"),
    );
    const labels = profileButtons.map(button => button.getAttribute("aria-label"));

    expect(pickCard).not.toBeNull();
    expect(profileButtons.length).toBeGreaterThan(10);
    expect(new Set(labels).size).toBe(labels.length);
    expect(profileButtons.every(button => button.getAttribute("title") === button.getAttribute("aria-label"))).toBe(true);
    const profileButton = within(pickCard as HTMLElement).getByRole("button", {
      name: /^Open .+ climate tourism profile from tourism picks$/,
    });
    expect(profileButton).toHaveAttribute("title", profileButton.getAttribute("aria-label"));
    fireEvent.click(profileButton);

    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    expect(onOpenPlace.mock.calls[0][1]).toEqual({ trigger: profileButton });
  });
});
