import { describe, expect, it, vi } from "vitest";

// The group file holding Sequim fails to load (offline, or an old tab after a deploy).
vi.mock("../../data/profile-extras/generated/usa-1.json", () => {
  throw new Error("Failed to fetch dynamically imported module: profile-fields-usa-1.js");
});

describe("profile-fields registry when a group file fails", () => {
  it("settles once, background loads do not reset it, and only a reopen retries", async () => {
    const { PLACES_BY_ID } = await import("../../data/places");
    const registry = await import("../../data/profile-extras/registry");
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const first = registry.profileExtrasThenable(sequim) as Promise<boolean> & { status?: string };
    await expect(first).resolves.toBe(false);
    expect(first.status).toBe("fulfilled");
    expect(registry.withProfileExtras(sequim)).toBe(sequim);
    // A background load (prefetch) fails too, but must not make the open profile download again.
    await expect(registry.loadProfileExtrasFor([sequim])).resolves.toBe(false);
    expect(registry.profileExtrasThenable(sequim)).toBe(first);
    // The profile's one retry fails again and stays settled.
    await expect(registry.retryFailedProfileExtras(sequim)).resolves.toBe(false);
    const after = registry.profileExtrasThenable(sequim) as Promise<boolean> & { status?: string };
    expect(after.status).toBe("fulfilled");
    expect(registry.profileExtrasThenable(sequim)).toBe(after);
  });
});
