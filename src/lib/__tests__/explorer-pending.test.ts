import { describe, expect, it } from "vitest";
import { createEmptyFilterState } from "../scoring";
import { explorerResultsPending } from "../explorer-pending";

describe("explorerResultsPending", () => {
  it("is false when filters are synced and not projecting", () => {
    const filters = createEmptyFilterState();
    expect(explorerResultsPending(filters, filters, false)).toBe(false);
  });

  it("is true while deferred filters lag live controls", () => {
    const live = { ...createEmptyFilterState(), search: "Portland" };
    const deferred = createEmptyFilterState();
    expect(explorerResultsPending(live, deferred, false)).toBe(true);
  });

  it("is true while a scenario projection is in flight", () => {
    const filters = createEmptyFilterState();
    expect(explorerResultsPending(filters, filters, true)).toBe(true);
  });
});
