// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShortcutsOverlay } from "../ShortcutsOverlay";

afterEach(() => cleanup());

describe("ShortcutsOverlay", () => {
  it("keeps the dialog viewport-bounded and focuses the close control", () => {
    render(<ShortcutsOverlay onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toHaveClass("overflow-y-auto");
    const close = screen.getByRole("button", { name: "Close keyboard shortcuts help" });
    expect(close).toHaveClass("tc-shortcuts-overlay__close");
    expect(close).toHaveAttribute("title", "Close keyboard shortcuts help");
    expect(close).toHaveFocus();
  });

  it("exposes one accessible close control while the pointer scrim still closes", () => {
    const onClose = vi.fn();
    const { container } = render(<ShortcutsOverlay onClose={onClose} />);

    expect(screen.getAllByRole("button", { name: "Close keyboard shortcuts help" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Close keyboard shortcuts" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close keyboard shortcuts help" }));
    const scrim = container.querySelector("[data-shortcuts-scrim]");
    expect(scrim).toBeInstanceOf(HTMLDivElement);
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).not.toHaveAttribute("tabindex");
    fireEvent.click(scrim!);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
