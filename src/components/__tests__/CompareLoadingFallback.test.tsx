// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import { CompareLoadingFallback } from "../CompareLoadingFallback";

afterEach(() => {
  cleanup();
});

describe("CompareLoadingFallback", () => {
  it("renders a closeable modal for shared compare links while the workbench loads", async () => {
    const onClose = vi.fn();

    render(<CompareLoadingFallback places={PLACES.slice(0, 2)} onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "Loading compare for 2 places" });
    expect(dialog).toHaveAttribute("data-compare-loading");
    expect(screen.getByRole("status")).toHaveTextContent("Preparing Sequim, Portal & the Chiricahua Sky Island.");

    const close = screen.getByRole("button", { name: "Close comparison" });
    expect(close).toHaveAttribute("data-compare-loading-close");
    await waitFor(() => expect(document.activeElement).toBe(close));

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab focus inside the loading modal", async () => {
    render(
      <>
        <button type="button">Outside control</button>
        <CompareLoadingFallback places={PLACES.slice(0, 2)} onClose={() => undefined} />
      </>,
    );

    const close = screen.getByRole("button", { name: "Close comparison" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);

    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  it("uses a non-focusable scrim that still closes the loading modal", () => {
    const onClose = vi.fn();

    render(<CompareLoadingFallback places={PLACES.slice(0, 2)} onClose={onClose} />);

    const scrim = document.querySelector(".tc-modal-scrim");
    expect(scrim).toBeInstanceOf(HTMLDivElement);
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).not.toHaveAttribute("tabindex");

    fireEvent.click(scrim as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without bubbling global shortcuts", async () => {
    const onClose = vi.fn();
    const onWindowKeyDown = vi.fn();
    window.addEventListener("keydown", onWindowKeyDown);

    render(<CompareLoadingFallback places={PLACES.slice(0, 2)} onClose={onClose} />);

    const close = screen.getByRole("button", { name: "Close comparison" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    expect(fireEvent.keyDown(close, { key: "Escape" })).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onWindowKeyDown).not.toHaveBeenCalled();

    window.removeEventListener("keydown", onWindowKeyDown);
  });
});
