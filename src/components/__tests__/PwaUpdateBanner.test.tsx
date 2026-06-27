// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PwaUpdateBanner } from "../chrome/PwaUpdateBanner";

afterEach(cleanup);

describe("PwaUpdateBanner", () => {
  it("offers refresh and dismiss actions", () => {
    const onRefresh = vi.fn();
    const onDismiss = vi.fn();
    render(<PwaUpdateBanner onRefresh={onRefresh} onDismiss={onDismiss} />);

    expect(screen.getByRole("status")).toHaveTextContent("Atlas update ready");
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
