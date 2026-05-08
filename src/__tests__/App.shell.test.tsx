// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

/** Avoid dynamic topojson imports + async map setup leaking past test teardown. */
vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

describe("App shell", () => {
  it("renders primary branding inside UnitProvider", () => {
    const { container } = render(
      <UnitProvider>
        <App />
      </UnitProvider>,
    );
    const header = container.querySelector("header.tc-header-bar");
    expect(header).not.toBeNull();
    expect(header!.textContent).toMatch(/Terraclima/);
    expect(header!.textContent).toMatch(/North American Microclimate Atlas/);
  });
});
