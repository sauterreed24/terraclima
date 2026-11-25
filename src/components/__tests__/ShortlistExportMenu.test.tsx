// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import { downloadBlobFile } from "../../lib/download-blob";
import { ShortlistExportMenu } from "../chrome/ShortlistExportMenu";

import { HOME_BASE_STORAGE_KEY } from "../../lib/home-base";
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
    const trigger = screen.getByRole("button", { name: "Save a place to export it" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("title", trigger.getAttribute("aria-label"));
  });

  it("shows Visit plan first in the export menu", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export saved places" });
    expect(trigger).toHaveClass("tc-shortlist-export__trigger");
    expect(trigger).toHaveAttribute("title", trigger.getAttribute("aria-label"));
    fireEvent.click(trigger);

    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    expect(items.map(item => item.textContent)).toEqual([
      "Visit planBest months, data gaps and what to check, as text",
      "JSONClimate figures and scores per place, for scripts",
      "CSVClimate figures and scores, as a table for spreadsheets",
      "GeoJSONMap points for GIS and mapping tools",
      "Calendar (.ics)Best months to visit, as calendar events",
    ]);
    expect(items.map(item => item.getAttribute("aria-label"))).toEqual([
      "Visit plan: Best months, data gaps and what to check, as text",
      "JSON: Climate figures and scores per place, for scripts",
      "CSV: Climate figures and scores, as a table for spreadsheets",
      "GeoJSON: Map points for GIS and mapping tools",
      "Calendar (.ics): Best months to visit, as calendar events",
    ]);
    expect(items[0]).toHaveAttribute("title", "Visit plan: Best months, data gaps and what to check, as text");
  });

  it("supports arrow, Home, and End keyboard navigation in the export menu", () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));

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
    const trigger = screen.getByRole("button", { name: "Export saved places" });
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

    expect(screen.getByRole("menu", { name: "Export format for saved places" })).toHaveClass("tc-shortlist-export__panel--up");
  });

  it("dismisses the export menu on outside pointer down and restores trigger focus", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export saved places" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Export format for saved places" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")[0]).toHaveFocus();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu", { name: "Export format for saved places" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("downloads the Markdown visit plan when chosen", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Visit plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing export...");

    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(screen.getByRole("status")).toHaveTextContent("Download started.");
    const [body, filename, mimeType] = vi.mocked(downloadBlobFile).mock.calls[0]!;
    expect(body).toContain("# Terraclima visit plan");
    expect(body).toContain(PLACES[0]!.name);
    expect(filename).toMatch(/^terraclima-visit-plan-.*\.md$/);
    expect(mimeType).toBe("text/markdown");
  });

  it("exports the CSV with the session's active ranking and home base", async () => {
    const home = PLACES[3]!;
    window.localStorage.setItem(HOME_BASE_STORAGE_KEY, JSON.stringify(home.id));
    window.history.replaceState(null, "", "?r=coolest-summers");
    try {
      render(<ShortlistExportMenu places={[PLACES[0]!]} />);
      fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^CSV/i }));
      await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
      const [body] = vi.mocked(downloadBlobFile).mock.calls[0]!;
      const [header, row] = body.replace(/^\uFEFF/, "").split("\r\n");
      expect(header).toContain("summer_high_f");
      expect(header).toContain("ranking_rank");
      expect(header).toContain("summer_high_vs_home_f");
      expect(row).toContain("Coolest summers");
      expect(row).toContain(home.name.includes(",") ? `"${home.name}"` : home.name);
    } finally {
      window.localStorage.removeItem(HOME_BASE_STORAGE_KEY);
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("starts the JSON export from pointer down on a format item", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export saved places" });
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
    const trigger = screen.getByRole("button", { name: "Export saved places" });
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
    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Visit plan/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledOnce(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("The download did not start. Try another format or browser."));
  });

  it("downloads CSV, GeoJSON, and calendar exports", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!, PLACES[1]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));

    fireEvent.click(screen.getByRole("menuitem", { name: /^CSV/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[0]![2]).toBe("text/csv;charset=utf-8");

    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^GeoJSON/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[1]![2]).toBe("application/geo+json");

    fireEvent.click(screen.getByRole("button", { name: "Export saved places" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Calendar/i }));
    await waitFor(() => expect(downloadBlobFile).toHaveBeenCalledTimes(3), { timeout: 5000 });
    expect(vi.mocked(downloadBlobFile).mock.calls[2]![2]).toBe("text/calendar");
  });

  it("closes the export menu on Escape", async () => {
    render(<ShortlistExportMenu places={[PLACES[0]!]} />);
    const trigger = screen.getByRole("button", { name: "Export saved places" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "Export format for saved places" });
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Export format for saved places" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
