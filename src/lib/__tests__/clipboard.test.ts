// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeClipboardText } from "../clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("writeClipboardText", () => {
  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const ok = await writeClipboardText("hello");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to the textarea + execCommand path when the modern API is missing", async () => {
    vi.stubGlobal("navigator", {});
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;
    const ok = await writeClipboardText("via fallback");
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back when navigator.clipboard rejects (permission denied)", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;
    const ok = await writeClipboardText("after-rejection");
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalled();
  });

  it("returns false when both paths fail", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = (() => false) as unknown as typeof document.execCommand;
    const ok = await writeClipboardText("doomed");
    expect(ok).toBe(false);
  });
});
