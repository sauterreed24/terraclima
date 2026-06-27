import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "../chunk-load-error";

describe("isChunkLoadError", () => {
  it("detects common dynamic import failure messages", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://example.com/chunk.js"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
  });

  it("returns false for unrelated render errors", () => {
    expect(isChunkLoadError(new Error("kapow"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
