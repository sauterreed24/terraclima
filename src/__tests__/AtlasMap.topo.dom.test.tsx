// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Resolve the topology imports with an invalid shape so the runtime shape
// assertions inside loadTopo() throw — exercising the load-failure path
// deterministically without real network behavior. Kept in its own file so
// the module-level topo cache in AtlasMap starts fresh.
vi.mock("world-atlas/countries-110m.json", () => ({ default: {} }));
vi.mock("us-atlas/states-10m.json", () => ({ default: {} }));

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

    // The retry affordance appears only after the async load rejects.
    expect(await screen.findByRole("button", { name: /retry loading map borders/i })).toBeInTheDocument();

    // Graceful degradation: pins and the standard zoom controls still render.
    expect(screen.getByRole("button", { name: /Alpha Valley/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
  });
});
