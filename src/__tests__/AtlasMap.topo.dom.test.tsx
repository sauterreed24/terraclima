// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the loader seam instead of the JSON packages. Vitest does not reliably
// intercept dynamic JSON imports from node_modules, and this test only needs
// to prove AtlasMap's recovery UI handles loader failure.
vi.mock("../lib/atlas-map-topology", () => ({
  getCachedAtlasTopology: () => null,
  loadAtlasTopology: vi.fn().mockRejectedValue(new Error("topology load failed")),
}));

import { AtlasMap } from "../components/AtlasMap";
import { UnitProvider } from "../lib/units";
import { makePlace } from "../lib/__tests__/test-fixtures";

function setPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(pointer: coarse)" ? coarse : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(cleanup);

describe("AtlasMap topology load failure", () => {
  it("surfaces a retry control and keeps pins usable when borders fail to load", async () => {
    setPointer(false);
    render(
      <UnitProvider>
        <AtlasMap
          places={[makePlace({ id: "a", name: "Alpha Valley", lat: 40, lon: -100, tier: "A" })]}
          onSelect={vi.fn()}
          featuredIds={[]}
        />
      </UnitProvider>,
    );

    const loading = screen.getByText(/Loading country/i);
    expect(loading).toHaveClass("tc-map-topology-loading");
    expect(loading).toHaveAttribute("class", "tc-map-topology-loading");

    // The retry affordance appears only after the async load rejects.
    expect(await screen.findByRole("button", { name: /retry loading map borders/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading country/i)).not.toBeInTheDocument();

    // Graceful degradation: pins and the standard zoom controls still render.
    expect(screen.getByRole("button", { name: /Alpha Valley/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
  });
});
