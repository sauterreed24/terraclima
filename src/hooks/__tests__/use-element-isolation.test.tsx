// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useRef } from "react";
import { useElementIsolation } from "../use-element-isolation";

function IsolationHarness({
  active,
  initialAriaHidden,
  initialInert,
}: {
  active: boolean;
  initialAriaHidden?: "true" | "false";
  initialInert?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useElementIsolation(ref, active);
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node;
    if (node && initialInert) node.setAttribute("inert", "");
  };
  return (
    <div
      ref={setRef}
      data-testid="isolated"
      aria-hidden={initialAriaHidden}
    >
      <button type="button">Inside isolated shell</button>
    </div>
  );
}

afterEach(() => cleanup());

describe("useElementIsolation", () => {
  it("marks a subtree inert and hidden while active, then removes both markers", async () => {
    const { rerender } = render(<IsolationHarness active={false} />);
    const shell = screen.getByTestId("isolated");

    expect(shell).not.toHaveAttribute("aria-hidden");
    expect(shell).not.toHaveAttribute("inert");

    rerender(<IsolationHarness active />);

    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));
    expect(shell).toHaveAttribute("inert");

    rerender(<IsolationHarness active={false} />);

    await waitFor(() => expect(shell).not.toHaveAttribute("aria-hidden"));
    expect(shell).not.toHaveAttribute("inert");
  });

  it("restores existing accessibility attributes when isolation ends", async () => {
    const { rerender } = render(
      <IsolationHarness active={false} initialAriaHidden="false" initialInert />,
    );
    const shell = screen.getByTestId("isolated");

    rerender(<IsolationHarness active initialAriaHidden="false" initialInert />);

    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "true"));
    expect(shell).toHaveAttribute("inert");

    rerender(<IsolationHarness active={false} initialAriaHidden="false" initialInert />);

    await waitFor(() => expect(shell).toHaveAttribute("aria-hidden", "false"));
    expect(shell).toHaveAttribute("inert");
  });
});
