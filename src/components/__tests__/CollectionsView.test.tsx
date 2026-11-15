// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitProvider } from "../../lib/units";
import { CollectionsView } from "../CollectionsView";

afterEach(() => cleanup());

function renderCollectionsView(activeId?: string) {
  const onOpenPlace = vi.fn();
  const onPick = vi.fn();
  const result = render(
    <UnitProvider>
      <CollectionsView onOpenPlace={onOpenPlace} onPick={onPick} activeId={activeId} />
    </UnitProvider>,
  );
  return { ...result, onOpenPlace, onPick };
}

describe("CollectionsView", () => {
  it("adds a visual place spectrum while preserving collection and place actions", () => {
    const { container, onOpenPlace, onPick } = renderCollectionsView();
    const firstCard = screen.getByText("Rain-Shadow Sanctuaries").closest(".collection-curation-card");

    expect(firstCard).not.toBeNull();
    expect(within(firstCard as HTMLElement).getByText("25 places")).toBeInTheDocument();
    expect(
      within(firstCard as HTMLElement).getByRole("button", {
        name: "Open Sequim profile from Rain-Shadow Sanctuaries collection: Easy 78 | Identity",
      }),
    ).toHaveAttribute("title", "Open Sequim profile from Rain-Shadow Sanctuaries collection: Easy 78 | Identity");
    expect((firstCard as HTMLElement).querySelectorAll(".collection-spectrum__bar").length).toBeGreaterThan(3);
    expect(container.querySelector(".collection-place-chip__dot")).not.toBeNull();

    const pinButton = within(firstCard as HTMLElement).getByRole("button", { name: "Pin Rain-Shadow Sanctuaries collection" });
    expect(pinButton).toHaveClass("collection-pin-button");
    expect(pinButton).toHaveAttribute("title", "Filter the Explorer to Rain-Shadow Sanctuaries");
    fireEvent.click(pinButton);
    const placeButton = within(firstCard as HTMLElement).getByRole("button", {
      name: "Open Sequim profile from Rain-Shadow Sanctuaries collection: Easy 78 | Identity",
    });
    fireEvent.click(placeButton);

    expect(onPick).toHaveBeenCalledWith("rain-shadows");
    expect(onOpenPlace).toHaveBeenCalledWith("sequim-wa", { trigger: placeButton });
  });

  it("gives repeated place chips collection-specific accessible names", () => {
    const { container } = renderCollectionsView();
    const chips = Array.from(container.querySelectorAll<HTMLButtonElement>(".collection-place-chip"));
    const labels = chips.map(chip => chip.getAttribute("aria-label"));

    expect(chips.length).toBeGreaterThan(100);
    expect(labels.every(label => label?.startsWith("Open "))).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Open Port Townsend profile from Rain-Shadow Sanctuaries collection: .+ \| .+$/),
      expect.stringMatching(/^Open Port Townsend profile from Gap & Gorge Wind Corridors collection: .+ \| .+$/),
      expect.stringMatching(/^Open Durango \(Colorado .* US\) profile from Monsoon-Edge Landscapes collection: /),
      expect.stringMatching(/^Open Durango \(Victoria de Durango .* Durango .* MX\) profile from Monsoon-Edge Landscapes collection: /),
    ]));
  });

  it("names active collection actions as clear actions", () => {
    const { onPick } = renderCollectionsView("rain-shadows");
    const activeButton = screen.getByRole("button", { name: "Clear Rain-Shadow Sanctuaries collection filter" });

    expect(activeButton).toHaveAttribute("aria-pressed", "true");
    expect(activeButton).toHaveAttribute("title", "Clear Rain-Shadow Sanctuaries from the Explorer filter");
    expect(activeButton).toHaveTextContent("Clear filter");

    fireEvent.click(activeButton);
    expect(onPick).toHaveBeenCalledWith("rain-shadows");
  });
});
