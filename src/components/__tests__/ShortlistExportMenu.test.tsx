// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import { ShortlistExportMenu } from "../chrome/ShortlistExportMenu";

afterEach(() => cleanup());

describe("ShortlistExportMenu", () => {
  it("disables export when shortlist is empty", () => {
    render(<ShortlistExportMenu places={[]} />);
    expect(screen.getByRole("button", { name: /Export/i })).toBeDisabled();
  });

  it("downloads JSON when a format is chosen", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const click = vi.fn();
    let capturedDownload = "";
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const el = origCreate("a") as HTMLAnchorElement;
        el.click = click;
        Object.defineProperty(el, "download", {
          set(v: string) { capturedDownload = v; },
          get() { return capturedDownload; },
          configurable: true,
        });
        return el;
      }
      return origCreate(tag);
    });

    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^JSON/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(capturedDownload).toMatch(/^terraclima-shortlist-.*\.json$/);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
