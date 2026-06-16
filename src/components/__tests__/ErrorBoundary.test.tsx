// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    const reloadPage = vi.fn();

    render(
      <ErrorBoundary reloadPage={reloadPage}>
        <Boom />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Something went wrong");
    const fresh = screen.getByRole("button", { name: "Open fresh atlas" });
    const retry = screen.getByRole("button", { name: "Retry current view" });
    expect(fresh).toHaveFocus();
    expect(retry).toBeInTheDocument();
  });

  it("can recover from a bad shared URL by reloading the clean atlas root", () => {
    const reloadPage = vi.fn();
    window.history.replaceState(null, "", "/?p=broken-place#deep-missing");

    render(
      <ErrorBoundary reloadPage={reloadPage}>
        <Boom />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fresh atlas" }));

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("can retry the current view without changing the URL", () => {
    const reloadPage = vi.fn();
    window.history.replaceState(null, "", "/?p=sequim-wa#deep-hydrology");

    render(
      <ErrorBoundary reloadPage={reloadPage}>
        <Boom />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry current view" }));

    expect(window.location.search).toBe("?p=sequim-wa");
    expect(window.location.hash).toBe("#deep-hydrology");
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});
