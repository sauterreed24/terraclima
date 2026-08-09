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

    const now = screen.getByRole("button", { name: "Recent" });
    const mid = screen.getByRole("button", { name: "2050 mid" });
    const high = screen.getByRole("button", { name: "2050 high" });
    expect(now).toHaveAttribute("aria-pressed", "true");
    expect(mid).toHaveAttribute("aria-pressed", "false");
    expect(high).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Recent · 1996–2025/)).toBeInTheDocument();
    expect(screen.getByText(/not WMO standard normal/i)).toBeInTheDocument();

    fireEvent.click(mid);
    expect(onChange).toHaveBeenCalledWith("ssp245");
  });

  it("updates the live note when a future scenario is active", () => {
    render(<ClimateScenarioControl scenario="ssp585" onChange={() => undefined} projecting />);
    expect(screen.getByRole("group", { name: "Climate scenario layer" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/Projecting…/)).toBeInTheDocument();
    expect(screen.getByText(/2050 high \(2041–2060\)/)).toBeInTheDocument();
    expect(screen.getByText(/dossier still shows recent observed normals/)).toBeInTheDocument();
  });
});
