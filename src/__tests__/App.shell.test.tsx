// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

/** Avoid dynamic topojson imports + async map setup leaking past test teardown. */
vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: () => <div data-testid="place-grid-stub" />,
}));

function renderApp() {
  return render(
    <UnitProvider>
      <App />
    </UnitProvider>,
  );
}

describe("App shell", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders primary branding inside UnitProvider", () => {
    const { container } = renderApp();
    const header = container.querySelector("header.tc-header-bar");
    expect(header).not.toBeNull();
    expect(header!.textContent).toMatch(/Terraclima/);
    expect(header!.textContent).toMatch(/North American Microclimate Atlas/);
  });

  it("opens compare immediately for shared URLs with two or more valid places", async () => {
    window.history.replaceState(null, "", "/?cmp=san-miguel-mx,parras-mx");

    renderApp();

    expect(await screen.findByRole("dialog", { name: "2 places side by side" })).toBeInTheDocument();
    expect(screen.getByText("San Miguel de Allende")).toBeInTheDocument();
    expect(screen.getAllByText("Parras Valley").length).toBeGreaterThan(0);
  });

  it("keeps a one-place compare URL saved without opening the compare dialog", () => {
    window.history.replaceState(null, "", "/?cmp=san-miguel-mx");

    renderApp();

    expect(screen.queryByRole("dialog", { name: /places side by side/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open compare (1 place)" }).length).toBeGreaterThan(0);
  });

  it("exposes only the visible close button in the mobile site menu", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open site menu" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close menu" })).toHaveLength(1));
  });

  it("exposes only the visible close button in the mobile filter sheet", async () => {
    renderApp();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Explorer filters and ranking" })[0]);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Close filters" })).toHaveLength(1));
    expect(screen.getByLabelText("Search places by name, region, or archetype")).toHaveAttribute("placeholder", "Search places");
  });
});
