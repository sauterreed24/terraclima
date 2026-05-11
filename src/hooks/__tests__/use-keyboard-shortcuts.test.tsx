// @vitest-environment jsdom
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts, type KeyboardShortcutDeps } from "../use-keyboard-shortcuts";

/** Mount a no-op component that wires the shortcut hook, then send keystrokes. */
function MountShortcuts(props: KeyboardShortcutDeps) {
  useKeyboardShortcuts(props);
  return null;
}

function defaults(overrides: Partial<KeyboardShortcutDeps> = {}): KeyboardShortcutDeps {
  return {
    view: "explorer",
    showShortcuts: false,
    compareOpen: false,
    selectedId: null,
    explorerDockLg: true,
    setView: vi.fn(),
    setShowShortcuts: vi.fn(),
    setCompareOpen: vi.fn(),
    closeDetail: vi.fn(),
    focusSearchInput: vi.fn(),
    openFilterSheet: vi.fn(),
    pickRandomPlace: () => true,
    ...overrides,
  };
}

describe("useKeyboardShortcuts — bookmark (B) shortcut", () => {
  afterEach(() => cleanup());

  it("calls toggleBookmarkSelected only when a place is selected", () => {
    const toggleBookmarkSelected = vi.fn();
    const { rerender } = render(
      <MountShortcuts {...defaults({ selectedId: null, toggleBookmarkSelected })} />,
    );
    fireEvent.keyDown(window, { key: "b" });
    expect(toggleBookmarkSelected).not.toHaveBeenCalled();

    rerender(<MountShortcuts {...defaults({ selectedId: "sequim-wa", toggleBookmarkSelected })} />);
    fireEvent.keyDown(window, { key: "b" });
    expect(toggleBookmarkSelected).toHaveBeenCalledTimes(1);
  });

  it("ignores B when modifier keys are held (avoids hijacking Ctrl+B/⌘+B)", () => {
    const toggleBookmarkSelected = vi.fn();
    render(
      <MountShortcuts {...defaults({ selectedId: "sequim-wa", toggleBookmarkSelected })} />,
    );
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(toggleBookmarkSelected).not.toHaveBeenCalled();
  });

  it("ignores B when focus is in a text input", () => {
    const toggleBookmarkSelected = vi.fn();
    render(
      <>
        <input data-testid="text-input" />
        <MountShortcuts {...defaults({ selectedId: "sequim-wa", toggleBookmarkSelected })} />
      </>,
    );
    const input = document.querySelector("input")!;
    input.focus();
    fireEvent.keyDown(input, { key: "b" });
    expect(toggleBookmarkSelected).not.toHaveBeenCalled();
  });

  it("accepts both upper- and lower-case B", () => {
    const toggleBookmarkSelected = vi.fn();
    render(
      <MountShortcuts {...defaults({ selectedId: "sequim-wa", toggleBookmarkSelected })} />,
    );
    fireEvent.keyDown(window, { key: "b" });
    fireEvent.keyDown(window, { key: "B" });
    expect(toggleBookmarkSelected).toHaveBeenCalledTimes(2);
  });
});
