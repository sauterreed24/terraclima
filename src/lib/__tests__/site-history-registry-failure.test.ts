import { describe, expect, it, vi } from "vitest";

// The file holding Sequim fails to load, as offline or after a deploy removed it.
vi.mock("../../data/site-history/usa-1", () => {
  throw new Error("Failed to fetch dynamically imported module: site-history-usa-1.js");
});

describe("site-history registry when a file fails to load", () => {
  it("settles to null once, does not re-request on re-render, and retries on a new open", async () => {
    const registry = await import("../../data/site-history/registry");
    const first = registry.siteHistoryThenable("sequim-wa") as Promise<unknown> & { status?: string };
    await expect(first).resolves.toBeNull();
    expect(first.status).toBe("fulfilled");
    // A re-render of the open profile gets the same settled promise: no suspend, no new request.
    expect(registry.siteHistoryThenable("sequim-wa")).toBe(first);
    expect(registry.siteHistoryThenable("sequim-wa")).toBe(first);
    // Opening the place again starts a fresh attempt.
    await expect(registry.loadSiteHistory("sequim-wa")).resolves.toBeNull();
    expect(registry.siteHistoryThenable("sequim-wa")).not.toBe(first);
  });
});
