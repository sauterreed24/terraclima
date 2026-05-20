// @vitest-environment jsdom
import { useEffect, useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useFocusTrap } from "../use-focus-trap";

/**
 * A trigger button plus a modal that mounts when `open` is true. The modal
 * focuses its own "Close" button on mount, mirroring the real div-based modals
 * (CompareView, ShortcutsOverlay).
 */
function Harness({ restoreFocus }: { restoreFocus: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && <Modal panelRef={panelRef} restoreFocus={restoreFocus} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Modal({
  panelRef,
  restoreFocus,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  restoreFocus: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Mirror the real div-based modals: the trap hook is wired first (so it
  // captures the opener) and initial focus is moved in a later effect.
  useFocusTrap(panelRef, true, restoreFocus);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div ref={panelRef} role="dialog" aria-label="Test modal">
      <button ref={closeRef} type="button" onClick={onClose}>
        Close
      </button>
      <button type="button">Other</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  afterEach(() => cleanup());

  it("restores focus to the opener when restoreFocus is true", () => {
    render(<Harness restoreFocus />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    // Modal mounted; focus has moved into it (autoFocus on Close).
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    // Trap tore down; focus returns to the opener instead of <body>.
    expect(document.activeElement).toBe(opener);
  });

  it("does not restore focus when restoreFocus is false (default)", () => {
    render(<Harness restoreFocus={false} />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();

    fireEvent.click(opener);
    const closeBtn = screen.getByRole("button", { name: "Close" });
    closeBtn.focus();
    fireEvent.click(closeBtn);

    // Focus is NOT pulled back to the opener; the consumer owns restoration.
    expect(document.activeElement).not.toBe(opener);
  });

  it("keeps Tab focus cycling inside the container", () => {
    const panelRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    function Standalone() {
      return (
        <Modal panelRef={panelRef} restoreFocus={false} onClose={() => {}} />
      );
    }
    render(<Standalone />);
    const closeBtn = screen.getByRole("button", { name: "Close" });
    const otherBtn = screen.getByRole("button", { name: "Other" });

    otherBtn.focus();
    // Tabbing forward off the last focusable wraps to the first.
    fireEvent.keyDown(panelRef.current!, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab off the first focusable wraps to the last.
    fireEvent.keyDown(panelRef.current!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(otherBtn);
  });
});
