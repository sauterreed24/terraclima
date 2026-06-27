// @vitest-environment jsdom

import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyRouteErrorBoundary } from "../LazyRouteErrorBoundary";

afterEach(cleanup);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function ChunkFail(): React.ReactElement {
  throw new Error("Failed to fetch dynamically imported module: https://example.com/chunk.js");
}

function Boom(): React.ReactElement {
  throw new Error("kapow");
}

describe("LazyRouteErrorBoundary", () => {
  it("shows chunk recovery UI for dynamic import failures", () => {
    render(
      <LazyRouteErrorBoundary routeLabel="Climate Trips">
        <ChunkFail />
      </LazyRouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load Climate Trips");
    expect(screen.getByRole("button", { name: "Retry download" })).toBeInTheDocument();
  });

  it("shows generic recovery for non-chunk errors", () => {
    render(
      <LazyRouteErrorBoundary routeLabel="Learn">
        <Boom />
      </LazyRouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("alert")).toHaveTextContent("Learn hit an unexpected error");
  });
});
