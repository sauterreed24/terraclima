// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClimateScenarioControl } from "../ClimateScenarioControl";

afterEach(() => cleanup());

describe("ClimateScenarioControl", () => {
  it("renders three scenario options with aria-pressed and a live note", () => {
    const onChange = vi.fn();
    render(<ClimateScenarioControl scenario="now" onChange={onChange} />);

    const group = screen.getByRole("group", { name: "Climate scenario layer" });
    expect(group).toBeInTheDocument();

    const now = screen.getByRole("button", { name: "Now" });
    const mid = screen.getByRole("button", { name: "2050 mid" });
    const high = screen.getByRole("button", { name: "2050 high" });
    expect(now).toHaveAttribute("aria-pressed", "true");
    expect(mid).toHaveAttribute("aria-pressed", "false");
    expect(high).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Present-day normals \(1991–2020\)/)).toBeInTheDocument();

    fireEvent.click(mid);
    expect(onChange).toHaveBeenCalledWith("ssp245");
  });

  it("updates the live note when a future scenario is active", () => {
    render(<ClimateScenarioControl scenario="ssp585" onChange={() => undefined} projecting />);
    expect(screen.getByText(/Projecting…/)).toBeInTheDocument();
    expect(screen.getByText(/SSP5-8.5/)).toBeInTheDocument();
    expect(screen.getByText(/dossier still shows present-day normals/)).toBeInTheDocument();
  });
});
