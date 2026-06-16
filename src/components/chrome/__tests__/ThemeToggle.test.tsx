// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

afterEach(() => cleanup());

const AUTO_LABEL = "Auto theme - Follow system preference";
const LIGHT_LABEL = "Light theme - Always use the bright theme";
const DARK_LABEL = "Dark theme - Always use the dark theme";

describe("ThemeToggle", () => {
  it("keeps compact theme button titles aligned with accessible names", () => {
    const onChange = vi.fn();

    render(<ThemeToggle preference="auto" onChange={onChange} compact />);

    const auto = screen.getByRole("button", { name: AUTO_LABEL });
    const light = screen.getByRole("button", { name: LIGHT_LABEL });
    const dark = screen.getByRole("button", { name: DARK_LABEL });

    expect(auto).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");
    expect(dark).toHaveAttribute("aria-pressed", "false");
    expect(auto).toHaveAttribute("title", AUTO_LABEL);
    expect(light).toHaveAttribute("title", LIGHT_LABEL);
    expect(dark).toHaveAttribute("title", DARK_LABEL);

    fireEvent.click(dark);
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
