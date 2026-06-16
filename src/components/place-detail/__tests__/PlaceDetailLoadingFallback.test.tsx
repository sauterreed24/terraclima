// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceDetailLoadingFallback } from "../PlaceDetailLoadingFallback";

afterEach(() => {
  cleanup();
});

describe("PlaceDetailLoadingFallback", () => {
  it("renders a closeable drawer-shaped loading dialog for shared profile links", async () => {
    const onClose = vi.fn();

    render(<PlaceDetailLoadingFallback placeName="Sequim" onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "Sequim climate dossier" });
    expect(dialog).toHaveAttribute("data-place-detail-loading");
    expect(dialog).toHaveClass("place-detail-drawer");
    expect(screen.getByRole("status")).toHaveTextContent("Opening Sequim climate dossier");

    const close = screen.getByRole("button", { name: "Close profile" });
    expect(close).toHaveAttribute("data-place-detail-close");
    await waitFor(() => expect(document.activeElement).toBe(close));

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab focus inside the loading drawer", async () => {
    render(
      <>
        <button type="button">Outside control</button>
        <PlaceDetailLoadingFallback placeName="Sequim" onClose={() => undefined} />
      </>,
    );

    const close = screen.getByRole("button", { name: "Close profile" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);

    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  it("uses a non-focusable scrim that still closes the loading drawer", () => {
    const onClose = vi.fn();

    render(<PlaceDetailLoadingFallback placeName="Sequim" onClose={onClose} />);

    const scrim = document.querySelector(".tc-modal-scrim");
    expect(scrim).toBeInstanceOf(HTMLDivElement);
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).not.toHaveAttribute("tabindex");

    fireEvent.click(scrim as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays hidden and does not steal focus when another modal covers it", async () => {
    const { container } = render(
      <>
        <button type="button">Compare dialog close</button>
        <PlaceDetailLoadingFallback placeName="Sequim" onClose={() => undefined} occluded />
      </>,
    );

    const opener = screen.getByRole("button", { name: "Compare dialog close" });
    opener.focus();

    const drawer = container.querySelector("[data-place-detail-loading]");
    expect(drawer).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog", { name: "Sequim climate dossier" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("closes on Escape without bubbling the shortcut beyond the loading drawer", async () => {
    const onClose = vi.fn();
    const onWindowKeyDown = vi.fn();
    window.addEventListener("keydown", onWindowKeyDown);

    render(<PlaceDetailLoadingFallback placeName="Sequim" onClose={onClose} />);

    const close = screen.getByRole("button", { name: "Close profile" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    expect(fireEvent.keyDown(close, { key: "Escape" })).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onWindowKeyDown).not.toHaveBeenCalled();

    window.removeEventListener("keydown", onWindowKeyDown);
  });
});
