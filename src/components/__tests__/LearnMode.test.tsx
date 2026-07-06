// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitProvider } from "../../lib/units";
import { LearnMode } from "../LearnMode";

afterEach(() => cleanup());

function renderLearnMode() {
  const onOpenPlace = vi.fn();
  const result = render(
    <UnitProvider>
      <LearnMode onOpenPlace={onOpenPlace} />
    </UnitProvider>,
  );
  return { ...result, onOpenPlace };
}

describe("LearnMode", () => {
  it("gives repeated example-place chips action-oriented unique names", () => {
    const { container } = renderLearnMode();
    const chips = Array.from(container.querySelectorAll<HTMLButtonElement>(".learn-concept-card .chip-btn"));
    const labels = chips.map(chip => chip.getAttribute("aria-label"));

    expect(chips.length).toBeGreaterThan(20);
    expect(labels.every(label => label?.startsWith("Open "))).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(
      screen.getByRole("button", {
        name: "Open Huachuca Sky Island profile from Learn concept: Microclimate",
      }),
    ).toHaveAttribute("title", "Open Huachuca Sky Island profile from Learn concept: Microclimate");
  });

  it("opens a place profile with the triggering example chip", () => {
    const { onOpenPlace } = renderLearnMode();
    const chip = screen.getByRole("button", {
      name: "Open Huachuca Sky Island profile from Learn concept: Microclimate",
    });

    fireEvent.click(chip);

    expect(onOpenPlace).toHaveBeenCalledWith("huachuca-az", { trigger: chip });
  });

  it("describes Explorer filters without the legacy sidebar label", () => {
    const { container } = renderLearnMode();
    expect(container.textContent).toMatch(/Filters panel \(desktop filter dock or mobile Filters button\)/);
    expect(container.textContent).not.toMatch(/in the sidebar to reorder/i);
  });
});
