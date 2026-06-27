// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ShortlistExportMenu", () => {
  it("disables export when shortlist is empty", () => {
    render(<ShortlistExportMenu places={[]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist unavailable until places are pinned" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("title", trigger.getAttribute("aria-label"));
  });

  it("shows Scout plan first in the export menu", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    expect(trigger).toHaveClass("tc-shortlist-export__trigger");
    expect(trigger).toHaveAttribute("title", trigger.getAttribute("aria-label"));
    fireEvent.click(trigger);

    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    expect(items.map(item => item.textContent)).toEqual([
      "Scout planVisit windows, source gaps, and verification steps",
      "JSONMinimal place rows for scripts",
      "CSVSpreadsheet-friendly table",
      "GeoJSONRFC 7946 map points",
      "Calendar (.ics)Best-month scouting windows",
    ]);
    expect(items.map(item => item.getAttribute("aria-label"))).toEqual([
      "Scout plan: Visit windows, source gaps, and verification steps",
      "JSON: Minimal place rows for scripts",
      "CSV: Spreadsheet-friendly table",
      "GeoJSON: RFC 7946 map points",
      "Calendar (.ics): Best-month scouting windows",
    ]);
    expect(items[0]).toHaveAttribute("title", "Scout plan: Visit windows, source gaps, and verification steps");
  });

  it("supports arrow, Home, and End keyboard navigation in the export menu", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));

    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0]!, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1]!, { key: "ArrowUp" });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0]!, { key: "End" });
    const lastItem = items[items.length - 1]!;
    expect(lastItem).toHaveFocus();

    fireEvent.keyDown(lastItem, { key: "Home" });
    expect(items[0]).toHaveFocus();
  });

  it("opens upward when the trigger is near the bottom of the viewport", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 720,
      height: 44,
      left: 120,
      right: 220,
      top: 676,
      width: 100,
      x: 120,
      y: 676,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerHeight", 740);

    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Export shortlist format" })).toHaveClass("tc-shortlist-export__panel--up");
  });

  it("dismisses the export menu on outside pointer down and restores trigger focus", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Export shortlist format" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")[0]).toHaveFocus();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu", { name: "Export shortlist format" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("downloads the Markdown scout plan when chosen", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Scout plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing export...");

    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(screen.getByRole("status")).toHaveTextContent("Download started.");
    const [body, filename, mimeType] = vi.mocked(downloadBlobFile).mock.calls[0]!;
    expect(body).toContain("# Terraclima Scout Plan");
    expect(body).toContain(PLACES[0]!.name);
    expect(filename).toMatch(/^terraclima-scout-plan-.*\.md$/);
    expect(mimeType).toBe("text/markdown");
  });

  it("starts the JSON export from pointer down on a format item", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    fireEvent.click(trigger);

    fireEvent.pointerDown(screen.getByRole("menuitem", { name: /^JSON/i }), { button: 0 });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing export...");
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(screen.getByRole("status")).toHaveTextContent("Download started.");
    await waitFor(() => expect(trigger).toHaveFocus());
    const [, filename, mimeType] = vi.mocked(downloadBlobFile).mock.calls[0]!;
    expect(filename).toMatch(/^terraclima-shortlist-.*\.json$/);
    expect(mimeType).toBe("application/json");
  });

  it("activates a focused export format with Enter", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    fireEvent.click(trigger);
    const jsonItem = screen.getByRole("menuitem", { name: /^JSON/i });
    jsonItem.focus();

    fireEvent.keyDown(jsonItem, { key: "Enter" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing export...");
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    await waitFor(() => expect(trigger).toHaveFocus());
    const [, filename, mimeType] = vi.mocked(downloadBlobFile).mock.calls[0]!;
    expect(filename).toMatch(/^terraclima-shortlist-.*\.json$/);
    expect(mimeType).toBe("application/json");
  });

  it("closes the menu if an embedded browser blocks the download", async () => {
    vi.mocked(downloadBlobFile).mockImplementationOnce(() => {
      throw new Error("download blocked");
    });

    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Scout plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Download blocked. Try another format or browser."));
  });

  it("downloads CSV, GeoJSON, and calendar exports", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!, PLACES[1]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));

    fireEvent.click(screen.getByRole("menuitem", { name: /^CSV/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[0]![2]).toBe("text/csv");

    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^GeoJSON/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[1]![2]).toBe("application/geo+json");

    fireEvent.click(screen.getByRole("button", { name: "Export shortlist" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Calendar/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(3), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[2]![2]).toBe("text/calendar");
  });

  it("closes the export menu on Escape", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export shortlist" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "Export shortlist format" });
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Export shortlist format" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
