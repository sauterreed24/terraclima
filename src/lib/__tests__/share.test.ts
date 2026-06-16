// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { shareUrl } from "../share";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shareUrl", () => {
  it("uses navigator.share when available and returns 'shared'", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const out = await shareUrl({ title: "T", url: "https://example.com" });
    expect(out).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "T", url: "https://example.com" });
  });

  it("respects canShare and falls through to clipboard when canShare rejects payload", async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    vi.stubGlobal("navigator", { share, canShare });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;
    const out = await shareUrl({ title: "T", url: "https://example.com" });
    expect(share).not.toHaveBeenCalled();
    expect(out).toBe("copied");
  });

  it("returns dismissed when the user closes the native share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("user cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share });
    const out = await shareUrl({ title: "T", url: "https://example.com" });
    expect(out).toBe("dismissed");
  });

  it("falls back to clipboard on any other share rejection", async () => {
    const share = vi.fn().mockRejectedValue(new Error("permission denied"));
    vi.stubGlobal("navigator", { share });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;
    const out = await shareUrl({ title: "T", url: "https://example.com" });
    expect(out).toBe("copied");
  });

  it("returns 'failed' when neither navigator.share nor clipboard works", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = (() => false) as unknown as typeof document.execCommand;
    const out = await shareUrl({ title: "T", url: "https://example.com" });
    expect(out).toBe("failed");
  });
});
