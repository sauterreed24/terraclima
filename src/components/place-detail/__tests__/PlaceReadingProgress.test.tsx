// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlaceReadingProgress } from "../PlaceReadingProgress";

afterEach(cleanup);

describe("PlaceReadingProgress", () => {
  it("exposes a progressbar with reading progress semantics", () => {
    const panelRef = { current: document.createElement("div") };
    panelRef.current.style.height = "100px";
    Object.defineProperty(panelRef.current, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(panelRef.current, "clientHeight", { value: 100, configurable: true });
    panelRef.current.scrollTop = 50;

    render(<PlaceReadingProgress panelRef={panelRef} />);

    const bar = screen.getByRole("progressbar", { name: "Dossier reading progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
  });
});
