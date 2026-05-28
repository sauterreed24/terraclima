// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyPlaceLink } from "../CopyPlaceLink";

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

    render(<CopyPlaceLink placeId="sequim-wa" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(new URL(copied).searchParams.get("p")).toBe("sequim-wa");
  });

  it("shows Copy failed when clipboard and fallback both fail", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = (() => false) as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="sequim-wa" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Copy failed")).toBeInTheDocument();
    });
  });

  it("uses textarea fallback when navigator.clipboard is missing", async () => {
    vi.stubGlobal("navigator", {});
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="port-townsend-wa" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link to this place" }));

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("does not throw when clipboard rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    document.execCommand = (() => false) as unknown as typeof document.execCommand;

    render(<CopyPlaceLink placeId="sequim-wa" />);

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link to this place" }));
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText("Copy failed")).toBeInTheDocument();
    });
  });
});
