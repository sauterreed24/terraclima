// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceBackToTop } from "../PlaceBackToTop";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PlaceBackToTop", () => {
  it("uses the same action label for aria and title when visible", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    const panel = document.createElement("section");
    Object.defineProperty(panel, "clientWidth", { value: 900 });
    document.body.appendChild(panel);

    render(<PlaceBackToTop panelRef={{ current: panel }} />);

    panel.scrollTop = 600;
    fireEvent.scroll(panel);

    const button = await screen.findByRole("button", { name: "Scroll to top of place profile" });
    expect(button).toHaveAttribute("title", "Scroll to top of place profile");
  });

  it("on a narrow panel shows only while scrolling back up", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    const panel = document.createElement("section");
    Object.defineProperty(panel, "clientWidth", { value: 390 });
    document.body.appendChild(panel);
    render(<PlaceBackToTop panelRef={{ current: panel }} />);

    panel.scrollTop = 900;
    fireEvent.scroll(panel);
    expect(screen.queryByRole("button")).toBeNull();

    panel.scrollTop = 800;
    fireEvent.scroll(panel);
    expect(await screen.findByRole("button", { name: "Scroll to top of place profile" })).toBeInTheDocument();

    panel.scrollTop = 1000;
    fireEvent.scroll(panel);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
