// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyPlaceLink } from "../CopyPlaceLink";

vi.mock("../../../lib/share", async () => {
  const { shareUrl } = await vi.importActual<typeof import("../../../lib/share")>("../../../lib/share");
  return { shareUrl: vi.fn(shareUrl) };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CopyPlaceLink", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/?p=sequim-wa");
  });

  it("shows Copied when clipboard write succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(new URL(copied).searchParams.get("p")).toBe("sequim-wa");
  });

  it("strips comparison-only state from copied place links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    window.history.replaceState(
      null,
      "",
      "/?p=sequim-wa&cmp=sequim-wa,port-townsend-wa&clens=risk&temp=C&dist=metric",
    );

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = new URL(writeText.mock.calls[0][0] as string);
    expect(copied.searchParams.get("p")).toBe("sequim-wa");
    expect(copied.searchParams.get("temp")).toBe("C");
    expect(copied.searchParams.get("dist")).toBe("metric");
    expect(copied.searchParams.has("cmp")).toBe(false);
    expect(copied.searchParams.has("clens")).toBe(false);
  });

  it("offers a selectable place URL when clipboard and fallback both fail", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = (() => false) as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry copy or use the selected manual place URL" })).toHaveTextContent(
        "Manual copy",
      );
    });
    const fallbackGroup = screen.getByRole("group", { name: "Manual place share link" });
    const fallbackInput = screen.getByRole("textbox", { name: "Shareable place URL for manual copy" });
    expect(fallbackGroup).toContainElement(fallbackInput);
    expect((fallbackInput as HTMLInputElement).value).toContain("p=sequim-wa");
    await waitFor(() => expect(fallbackInput).toHaveFocus());
  });

  it("uses textarea fallback when navigator.clipboard is missing", async () => {
    vi.stubGlobal("navigator", {});
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="port-townsend-wa" placeName="Port Townsend" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("does not throw when clipboard rejects and still exposes the manual URL", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    document.execCommand = (() => false) as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry copy or use the selected manual place URL" })).toHaveTextContent(
        "Manual copy",
      );
    });
    expect((screen.getByRole("textbox", { name: "Shareable place URL for manual copy" }) as HTMLInputElement).value).toContain("p=sequim-wa");
  });

  it("shows Shared when the native share sheet completes", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Shared")).toBeInTheDocument();
    });
    const payload = share.mock.calls[0][0] as { title: string; text?: string; url: string };
    expect(payload.title).toBe("Sequim");
    expect(payload.text).toContain("Sequim");
    expect(payload.url).toContain("p=sequim-wa");
  });

  it("returns to idle when the native share sheet is dismissed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("user cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share });

    render(<CopyPlaceLink placeId="sequim-wa" placeName="Sequim" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy or share link to this place" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy or share link to this place" })).toHaveTextContent("Copy link");
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.queryByText("Manual copy")).not.toBeInTheDocument();
  });
});
