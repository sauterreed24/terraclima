// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceDetailReadingNav } from "../PlaceDetailReadingNav";
import type { PlaceNavItem } from "../place-detail-nav";

const scroll = vi.fn<(...args: unknown[]) => boolean>(() => true);
vi.mock("../../../lib/detail-scroll-spy", () => ({
  scrollDetailRootToSection: (...args: unknown[]) => scroll(...args),
}));
vi.mock("framer-motion", () => ({ useReducedMotion: () => true }));
afterEach(() => { cleanup(); scroll.mockClear(); });

const items: PlaceNavItem[] = [
  { id: "pd-overview", label: "Overview", group: "Portrait" },
  { id: "pd-seasons", label: "Season by season", group: "Portrait" },
  { id: "pd-evidence", label: "Evidence", group: "Evidence & Methods" },
];

describe("mobile profile navigation", () => {
  it("exposes every section, including collapsed desktop chapters, in grouped options", () => {
    render(<PlaceDetailReadingNav items={items} activeAnchorId="pd-overview" />);
    const picker = screen.getByRole("combobox", { name: "On this page" });
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.change(picker, { target: { value: "pd-evidence" } });
    expect(scroll).toHaveBeenCalledWith("pd-evidence", { behavior: "auto" });
  });

  it("steps through actual reading order and disables the ends", () => {
    const { rerender } = render(<PlaceDetailReadingNav items={items} activeAnchorId="pd-overview" />);
    expect(screen.getByRole("button", { name: "Previous profile section" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next profile section" }));
    expect(scroll).toHaveBeenLastCalledWith("pd-seasons", { behavior: "auto" });
    rerender(<PlaceDetailReadingNav items={items} activeAnchorId="pd-evidence" />);
    expect(screen.getByRole("combobox")).toHaveValue("pd-evidence");
    expect(screen.getByRole("button", { name: "Next profile section" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous profile section" }));
    expect(scroll).toHaveBeenLastCalledWith("pd-seasons", { behavior: "auto" });
  });

  it("handles empty or unknown active sections without broken controls", () => {
    const { rerender } = render(<PlaceDetailReadingNav items={[]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    rerender(<PlaceDetailReadingNav items={items} activeAnchorId="removed-section" />);
    expect(screen.getByRole("combobox")).toHaveValue("pd-overview");
    expect(screen.getByRole("button", { name: "Previous profile section" })).toBeDisabled();
  });
});
