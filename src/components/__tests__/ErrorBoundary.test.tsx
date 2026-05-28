// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

afterEach(cleanup);

// Suppress the noisy "Uncaught error" / React error-boundary console output
// during the deliberate-throw test so the run output stays readable.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function Boom(): React.ReactElement {
  throw new Error("kapow");
}

describe("ErrorBoundary", () => {
  it("passes children through unchanged when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Healthy subtree</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Healthy subtree")).toBeInTheDocument();
  });

  it("renders the recovery alert when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Something went wrong");
    const reload = screen.getByRole("button", { name: "Reload Terraclima" });
    expect(reload).toBeInTheDocument();
  });
});
