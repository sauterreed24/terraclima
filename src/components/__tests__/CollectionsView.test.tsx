// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitProvider } from "../../lib/units";
import { CollectionsView } from "../CollectionsView";

afterEach(() => cleanup());

function renderCollectionsView() {
  const onOpenPlace = vi.fn();
  const onPick = vi.fn();
  const result = render(
    <UnitProvider>
      <CollectionsView onOpenPlace={onOpenPlace} onPick={onPick} />
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
    expect(within(firstCard as HTMLElement).getByRole("button", { name: "Sequim" })).toBeInTheDocument();
    expect((firstCard as HTMLElement).querySelectorAll(".collection-spectrum__bar").length).toBeGreaterThan(3);
    expect(container.querySelector(".collection-place-chip__dot")).not.toBeNull();

    fireEvent.click(within(firstCard as HTMLElement).getByRole("button", { name: "Pin collection" }));
    fireEvent.click(within(firstCard as HTMLElement).getByRole("button", { name: "Sequim" }));

    expect(onPick).toHaveBeenCalledWith("rain-shadows");
    expect(onOpenPlace).toHaveBeenCalledWith("sequim-wa");
  });
});
