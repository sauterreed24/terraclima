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

describe("useKeyboardShortcuts — overlay suppression", () => {
  afterEach(() => cleanup());

  it("switches views with e/t/c/l when no overlay is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView })} />);
    fireEvent.keyDown(window, { key: "t" });
    fireEvent.keyDown(window, { key: "c" });
    fireEvent.keyDown(window, { key: "l" });
    fireEvent.keyDown(window, { key: "e" });
    expect(setView.mock.calls.map(c => c[0])).toEqual(["trips", "collections", "learn", "explorer"]);
  });

  it("does not switch views while a place profile is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, selectedId: "sequim-wa" })} />);
    fireEvent.keyDown(window, { key: "t" });
    fireEvent.keyDown(window, { key: "c" });
    expect(setView).not.toHaveBeenCalled();
  });

  it("does not switch views while compare is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, compareOpen: true })} />);
    fireEvent.keyDown(window, { key: "l" });
    expect(setView).not.toHaveBeenCalled();
  });

  it("does not switch views while the shortcuts dialog is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, showShortcuts: true })} />);
    fireEvent.keyDown(window, { key: "c" });
    expect(setView).not.toHaveBeenCalled();
  });

  it("suppresses Surprise (R) and search (/) while an overlay is open", () => {
    const setView = vi.fn();
    const pickRandomPlace = vi.fn(() => true);
    const focusSearchInput = vi.fn();
    render(
      <MountShortcuts
        {...defaults({ setView, pickRandomPlace, focusSearchInput, compareOpen: true })}
      />,
    );
    fireEvent.keyDown(window, { key: "r" });
    fireEvent.keyDown(window, { key: "/" });
    expect(setView).not.toHaveBeenCalled();
    expect(pickRandomPlace).not.toHaveBeenCalled();
    expect(focusSearchInput).not.toHaveBeenCalled();
  });

  it("still toggles the shortcuts overlay with ? while a modal is open", () => {
    const setShowShortcuts = vi.fn();
    render(<MountShortcuts {...defaults({ setShowShortcuts, selectedId: "sequim-wa" })} />);
    fireEvent.keyDown(window, { key: "?" });
    expect(setShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it("still toggles the bookmark with B while a place profile is open", () => {
    const toggleBookmarkSelected = vi.fn();
    render(
      <MountShortcuts {...defaults({ selectedId: "sequim-wa", compareOpen: true, toggleBookmarkSelected })} />,
    );
    fireEvent.keyDown(window, { key: "b" });
    expect(toggleBookmarkSelected).toHaveBeenCalledTimes(1);
  });

  it("closes the open place profile on Escape", () => {
    const closeDetail = vi.fn();
    render(<MountShortcuts {...defaults({ selectedId: "sequim-wa", closeDetail })} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeDetail).toHaveBeenCalledTimes(1);
  });
});
