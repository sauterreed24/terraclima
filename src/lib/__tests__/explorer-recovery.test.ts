import { describe, expect, it, vi } from "vitest";
import { createEmptyFilterState } from "../scoring";
import { buildExplorerRecoveryActions } from "../explorer-recovery";

describe("buildExplorerRecoveryActions", () => {
  it("prioritizes clearing search when search is the only screen", () => {
    const onClearSearch = vi.fn();
    const onClearAll = vi.fn();
    const filters = { ...createEmptyFilterState(), search: "fog" };
    const actions = buildExplorerRecoveryActions({
      filters,
      searchTerm: "fog",
      onClearSearch,
      onRelaxLiveFinder: vi.fn(),
      onClearGeography: vi.fn(),
      onClearAll,
    });
    expect(actions[0]?.key).toBe("search");
    expect(actions[0]?.primary).toBe(true);
    actions[0]?.onClick();
    expect(onClearSearch).toHaveBeenCalledOnce();
  });

  it("always offers a full Explorer reset", () => {
    const actions = buildExplorerRecoveryActions({
      filters: createEmptyFilterState(),
      searchTerm: "",
      onClearSearch: vi.fn(),
      onRelaxLiveFinder: vi.fn(),
      onClearGeography: vi.fn(),
      onClearAll: vi.fn(),
    });
    expect(actions.some(a => a.key === "all" && a.primary)).toBe(true);
  });
});
