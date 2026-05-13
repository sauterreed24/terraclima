// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TempToggle } from "../TempToggle";
import { UnitContext, type UnitState } from "../../lib/units";

afterEach(() => cleanup());

const DEG = "\u00b0";

function renderTempToggle(units: Partial<UnitState> = {}, onAfterChange = vi.fn()) {
  const value: UnitState = {
    temp: "F",
    dist: "imperial",
    setTemp: vi.fn(),
    setDist: vi.fn(),
    toggle: vi.fn(),
    ...units,
  };

  render(
    <UnitContext.Provider value={value}>
      <TempToggle onAfterChange={onAfterChange} />
    </UnitContext.Provider>,
  );

  return { value, onAfterChange };
}

describe("TempToggle", () => {
  it("exposes temperature and distance unit controls", () => {
    renderTempToggle();

    expect(screen.getByRole("group", { name: "Units" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${DEG}F` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: `${DEG}C` })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "mi" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "km" })).toHaveAttribute("aria-pressed", "false");
  });

  it("changes only the inactive unit buttons", () => {
    const { value, onAfterChange } = renderTempToggle();

    fireEvent.click(screen.getByRole("button", { name: `${DEG}C` }));
    fireEvent.click(screen.getByRole("button", { name: "km" }));
    fireEvent.click(screen.getByRole("button", { name: `${DEG}F` }));
    fireEvent.click(screen.getByRole("button", { name: "mi" }));

    expect(value.setTemp).toHaveBeenCalledTimes(1);
    expect(value.setTemp).toHaveBeenCalledWith("C");
    expect(value.setDist).toHaveBeenCalledTimes(1);
    expect(value.setDist).toHaveBeenCalledWith("metric");
    expect(onAfterChange).toHaveBeenCalledTimes(2);
  });

  it("can switch back to imperial distance and Fahrenheit", () => {
    const { value, onAfterChange } = renderTempToggle({ temp: "C", dist: "metric" });

    fireEvent.click(screen.getByRole("button", { name: `${DEG}F` }));
    fireEvent.click(screen.getByRole("button", { name: "mi" }));

    expect(value.setTemp).toHaveBeenCalledWith("F");
    expect(value.setDist).toHaveBeenCalledWith("imperial");
    expect(onAfterChange).toHaveBeenCalledTimes(2);
  });
});
