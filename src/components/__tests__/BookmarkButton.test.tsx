// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookmarkButton } from "../BookmarkButton";

afterEach(cleanup);

describe("BookmarkButton — compact (chip)", () => {
  it("uses an unpinned label + Bookmark icon when not pinned", () => {
    render(<BookmarkButton pinned={false} placeName="Sequim" onToggle={() => undefined} />);
    const btn = screen.getByRole("button", { name: "Pin Sequim to your shortlist" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAttribute("title", "Pin Sequim to your shortlist");
    expect(btn.className).not.toContain("tc-bookmark-chip--pinned");
  });

  it("uses an unpin label + BookmarkCheck icon when pinned", () => {
    render(<BookmarkButton pinned placeName="Sequim" onToggle={() => undefined} />);
    const btn = screen.getByRole("button", { name: "Unpin Sequim from your shortlist" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveAttribute("title", "Unpin Sequim from your shortlist");
    expect(btn.className).toContain("tc-bookmark-chip--pinned");
  });
});

describe("BookmarkButton — header variant", () => {
  it("renders the labelled toolbar variant when size='header'", () => {
    render(<BookmarkButton pinned placeName="Eureka" onToggle={() => undefined} size="header" />);
    const btn = screen.getByRole("button", { name: "Unpin Eureka from your shortlist" });
    expect(btn.className).toContain("tc-bookmark-btn");
    expect(btn).toHaveTextContent("Pinned");
  });

  it("renders 'Pin' text when unpinned in header variant", () => {
    render(<BookmarkButton pinned={false} placeName="Eureka" onToggle={() => undefined} size="header" />);
    expect(screen.getByRole("button", { name: /Pin Eureka/ })).toHaveTextContent("Pin");
  });

  it("can disambiguate duplicate visible pin controls with an aria context", () => {
    render(
      <BookmarkButton
        pinned={false}
        placeName="Eureka"
        onToggle={() => undefined}
        size="header"
        ariaContext="from residency brief"
      />,
    );
    const btn = screen.getByRole("button", { name: "Pin Eureka to your shortlist from residency brief" });
    expect(btn).toHaveTextContent("Pin");
    expect(btn).toHaveAttribute("title", "Pin Eureka to your shortlist from residency brief");
  });
});

describe("BookmarkButton — click", () => {
  it("invokes onToggle and stops propagation so a parent card open handler doesn't fire too", () => {
    const onToggle = vi.fn();
    const parentClick = vi.fn();
    render(
      <>
        <button type="button" onClick={parentClick} aria-label="open place">
          Open
        </button>
        <BookmarkButton pinned={false} placeName="Atlin" onToggle={onToggle} />
      </>,
    );
    // Click only the bookmark child, not the outer open-place button.
    fireEvent.click(screen.getByRole("button", { name: /Pin Atlin/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
