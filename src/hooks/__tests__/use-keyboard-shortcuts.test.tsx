// @vitest-environment jsdom
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
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

  it("closes the filter sheet on Escape even when the search input is focused", () => {
    render(
      <>
        <dialog id="tc-explorer-filter-sheet" open>
          <input aria-label="Search places" />
        </dialog>
        <MountShortcuts {...defaults()} />
      </>,
    );
    const dialog = document.getElementById("tc-explorer-filter-sheet") as HTMLDialogElement;
    const close = vi.fn(() => {
      dialog.open = false;
    });
    dialog.close = close;

    const input = screen.getByLabelText("Search places");
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });

    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("useKeyboardShortcuts — Cmd/Ctrl+K search shortcut", () => {
  afterEach(() => cleanup());

  it("focuses search via setView('explorer') on Ctrl+K when no overlay is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, view: "trips" })} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(setView).toHaveBeenCalledWith("explorer");
  });

  it("focuses search via setView('explorer') on Meta+K when no overlay is open", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, view: "learn" })} />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(setView).toHaveBeenCalledWith("explorer");
  });

  it("works even when focus is in a text input (deliberately global)", () => {
    const setView = vi.fn();
    render(
      <>
        <input data-testid="other-input" />
        <MountShortcuts {...defaults({ setView })} />
      </>,
    );
    const input = document.querySelector("input")!;
    input.focus();
    fireEvent.keyDown(input, { key: "k", ctrlKey: true });
    expect(setView).toHaveBeenCalledWith("explorer");
  });

  it("is suppressed when a place profile is open (overlay-occluded)", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView, selectedId: "sequim-wa" })} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(setView).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Shift+K (modifier combo reserved for browser DevTools)", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView })} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true, shiftKey: true });
    expect(setView).not.toHaveBeenCalled();
  });

  it("ignores Alt+K (alt is reserved for OS / accent input)", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView })} />);
    fireEvent.keyDown(window, { key: "k", altKey: true });
    expect(setView).not.toHaveBeenCalled();
  });

  it("does not trigger plain k (no modifier) — that key is reserved for typing", () => {
    const setView = vi.fn();
    render(<MountShortcuts {...defaults({ setView })} />);
    fireEvent.keyDown(window, { key: "k" });
    expect(setView).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts — Escape clears non-empty search input", () => {
  afterEach(() => cleanup());

  it("clears a non-empty search input when no overlay is open", () => {
    const clearSearch = vi.fn();
    const closeDetail = vi.fn();
    render(
      <>
        <input id="terraclima-place-search" defaultValue="seq" aria-label="Search places" />
        <MountShortcuts
          {...defaults({
            closeDetail,
            searchInputId: "terraclima-place-search",
            clearSearch,
          })}
        />
      </>,
    );
    const input = screen.getByLabelText("Search places") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(clearSearch).toHaveBeenCalledTimes(1);
    expect(closeDetail).not.toHaveBeenCalled();
  });

  it("does not clear when the search input is empty (falls through to no-op)", () => {
    const clearSearch = vi.fn();
    render(
      <>
        <input id="terraclima-place-search" defaultValue="" aria-label="Search places" />
        <MountShortcuts
          {...defaults({
            searchInputId: "terraclima-place-search",
            clearSearch,
          })}
        />
      </>,
    );
    const input = screen.getByLabelText("Search places") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(clearSearch).not.toHaveBeenCalled();
  });

  it("prefers closing an open place detail over clearing the search", () => {
    const clearSearch = vi.fn();
    const closeDetail = vi.fn();
    render(
      <>
        <input id="terraclima-place-search" defaultValue="seq" aria-label="Search places" />
        <MountShortcuts
          {...defaults({
            selectedId: "sequim-wa",
            closeDetail,
            searchInputId: "terraclima-place-search",
            clearSearch,
          })}
        />
      </>,
    );
    const input = screen.getByLabelText("Search places") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(closeDetail).toHaveBeenCalledTimes(1);
    expect(clearSearch).not.toHaveBeenCalled();
  });

  it("prefers closing an open filter sheet dialog over clearing the search", () => {
    const clearSearch = vi.fn();
    render(
      <>
        <dialog id="tc-explorer-filter-sheet" open>
          <input id="terraclima-place-search" defaultValue="seq" aria-label="Search places" />
        </dialog>
        <MountShortcuts
          {...defaults({
            searchInputId: "terraclima-place-search",
            clearSearch,
          })}
        />
      </>,
    );
    const dialog = document.getElementById("tc-explorer-filter-sheet") as HTMLDialogElement;
    const close = vi.fn(() => { dialog.open = false; });
    dialog.close = close;
    const input = screen.getByLabelText("Search places") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
    expect(clearSearch).not.toHaveBeenCalled();
  });

  it("does not clear when focus is on an unrelated input", () => {
    const clearSearch = vi.fn();
    render(
      <>
        <input id="other" defaultValue="hello" aria-label="Other field" />
        <input id="terraclima-place-search" defaultValue="seq" aria-label="Search places" />
        <MountShortcuts
          {...defaults({
            searchInputId: "terraclima-place-search",
            clearSearch,
          })}
        />
      </>,
    );
    const other = screen.getByLabelText("Other field") as HTMLInputElement;
    other.focus();
    fireEvent.keyDown(other, { key: "Escape" });
    expect(clearSearch).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts — listener is stable across prop changes", () => {
  afterEach(() => cleanup());

  it("does not unbind/rebind the global listener when deps change between renders", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    try {
      const { rerender } = render(<MountShortcuts {...defaults()} />);
      // Initial mount installs one keydown listener (plus the testing-library noise
      // for other event types — we only count keydown).
      const initialKeydownAdds = addSpy.mock.calls.filter(c => c[0] === "keydown").length;
      const initialKeydownRemoves = removeSpy.mock.calls.filter(c => c[0] === "keydown").length;
      // A re-render with new prop values would have caused the old hook to tear
      // down and re-install the listener on every change. The ref-based version
      // keeps the same handler in place across many re-renders.
      rerender(<MountShortcuts {...defaults({ selectedId: "sequim-wa" })} />);
      rerender(<MountShortcuts {...defaults({ selectedId: null, compareOpen: true })} />);
      rerender(<MountShortcuts {...defaults({ view: "trips" })} />);
      rerender(<MountShortcuts {...defaults({ showShortcuts: true })} />);
      const finalKeydownAdds = addSpy.mock.calls.filter(c => c[0] === "keydown").length;
      const finalKeydownRemoves = removeSpy.mock.calls.filter(c => c[0] === "keydown").length;
      expect(finalKeydownAdds).toBe(initialKeydownAdds);
      expect(finalKeydownRemoves).toBe(initialKeydownRemoves);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it("still reacts to the latest deps even though the listener is installed once", () => {
    const setView = vi.fn();
    const { rerender } = render(<MountShortcuts {...defaults({ setView, selectedId: null })} />);
    // Selection becomes non-null — view-switch keys should now be suppressed.
    rerender(<MountShortcuts {...defaults({ setView, selectedId: "sequim-wa" })} />);
    fireEvent.keyDown(window, { key: "t" });
    expect(setView).not.toHaveBeenCalled();

    // Clear the selection again — view-switch keys should work.
    rerender(<MountShortcuts {...defaults({ setView, selectedId: null })} />);
    fireEvent.keyDown(window, { key: "t" });
    expect(setView).toHaveBeenCalledWith("trips");
  });
});
