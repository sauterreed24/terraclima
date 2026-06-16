// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TempToggle } from "../TempToggle";
import { UnitContext, type UnitState } from "../../lib/units";

afterEach(() => cleanup());

const DEG = "\u00b0";
const FAHRENHEIT_LABEL = "Use Fahrenheit temperatures";
const CELSIUS_LABEL = "Use Celsius temperatures";
const IMPERIAL_DISTANCE_LABEL = "Use miles, feet, and inches";
const METRIC_DISTANCE_LABEL = "Use kilometers, meters, and millimeters";

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
    expect(screen.getByRole("button", { name: FAHRENHEIT_LABEL })).toHaveTextContent(`${DEG}F`);
    expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveTextContent(`${DEG}C`);
    expect(screen.getByRole("button", { name: IMPERIAL_DISTANCE_LABEL })).toHaveTextContent("mi");
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveTextContent("km");
    expect(screen.getByRole("button", { name: FAHRENHEIT_LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: IMPERIAL_DISTANCE_LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: FAHRENHEIT_LABEL })).toHaveAttribute("title", FAHRENHEIT_LABEL);
    expect(screen.getByRole("button", { name: CELSIUS_LABEL })).toHaveAttribute("title", CELSIUS_LABEL);
    expect(screen.getByRole("button", { name: IMPERIAL_DISTANCE_LABEL })).toHaveAttribute("title", IMPERIAL_DISTANCE_LABEL);
    expect(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL })).toHaveAttribute("title", METRIC_DISTANCE_LABEL);
  });

  it("changes only the inactive unit buttons", () => {
    const { value, onAfterChange } = renderTempToggle();

    fireEvent.click(screen.getByRole("button", { name: CELSIUS_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: METRIC_DISTANCE_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: FAHRENHEIT_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: IMPERIAL_DISTANCE_LABEL }));

    expect(value.setTemp).toHaveBeenCalledTimes(1);
    expect(value.setTemp).toHaveBeenCalledWith("C");
    expect(value.setDist).toHaveBeenCalledTimes(1);
    expect(value.setDist).toHaveBeenCalledWith("metric");
    expect(onAfterChange).toHaveBeenCalledTimes(2);
  });

  it("can switch back to imperial distance and Fahrenheit", () => {
    const { value, onAfterChange } = renderTempToggle({ temp: "C", dist: "metric" });

    fireEvent.click(screen.getByRole("button", { name: FAHRENHEIT_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: IMPERIAL_DISTANCE_LABEL }));

    expect(value.setTemp).toHaveBeenCalledWith("F");
    expect(value.setDist).toHaveBeenCalledWith("imperial");
    expect(onAfterChange).toHaveBeenCalledTimes(2);
  });
});
