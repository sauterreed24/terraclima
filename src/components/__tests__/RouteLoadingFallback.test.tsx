// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouteLoadingFallback } from "../RouteLoadingFallback";

afterEach(cleanup);

describe("RouteLoadingFallback", () => {
  it("announces the route and renders skeleton placeholders", () => {
    render(<RouteLoadingFallback label="Climate Trips" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Climate Trips");
    expect(status).toHaveTextContent("Preparing climate trips");
    expect(document.querySelectorAll(".tc-detail-progress-fill, .rounded-full, .rounded-lg").length).toBeGreaterThan(0);
  });
});
