// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import { downloadBlobFile } from "../../lib/download-blob";
import { ShortlistExportMenu } from "../chrome/ShortlistExportMenu";

vi.mock("../../lib/download-blob", () => ({
  downloadBlobFile: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("ShortlistExportMenu", () => {
  it("disables export when shortlist is empty", () => {
    render(<ShortlistExportMenu places={[]} />);
    expect(screen.getByRole("button", { name: /Export/i })).toBeDisabled();
  });

  it("shows Scout plan first in the export menu", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));

    const items = screen.getAllByRole("menuitem");
    expect(items.map(item => item.textContent)).toEqual([
      "Scout planVisit windows, caveats, and dossier links",
      "JSONMinimal place rows for scripts",
      "CSVSpreadsheet-friendly table",
      "GeoJSONRFC 7946 map points",
      "Calendar (.ics)Best-month scouting windows",
    ]);
  });

  it("downloads the Markdown scout plan when chosen", () => {
    vi.useFakeTimers();
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Scout plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    act(() => vi.runOnlyPendingTimers());

    expect(downloadBlobFile).toHaveBeenCalledOnce();
    const [body, filename, mimeType] = vi.mocked(downloadBlobFile).mock.calls[0]!;
    expect(body).toContain("# Terraclima Scout Plan");
    expect(body).toContain(PLACES[0]!.name);
    expect(filename).toMatch(/^terraclima-scout-plan-.*\.md$/);
    expect(mimeType).toBe("text/markdown");
  });

  it("closes the menu if an embedded browser blocks the download", () => {
    vi.useFakeTimers();
    vi.mocked(downloadBlobFile).mockImplementationOnce(() => {
      throw new Error("download blocked");
    });

    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Scout plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    act(() => vi.runOnlyPendingTimers());
    expect(downloadBlobFile).toHaveBeenCalledOnce();
  });
});
