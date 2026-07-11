// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { makePlace } from "../../lib/__tests__/test-fixtures";
import { MicroclimateFingerprint } from "../charts/MicroclimateFingerprint";

afterEach(() => cleanup());

describe("MicroclimateFingerprint", () => {
  it("uses compact labels when rendered in tight comparison cards", () => {
    render(<MicroclimateFingerprint place={makePlace({ name: "Compact Ridge" })} compactLabels />);

    expect(screen.getByRole("img", { name: /Microclimate fingerprint for Compact Ridge/ })).toBeInTheDocument();
    expect(screen.getByText("Low hum.")).toBeInTheDocument();
    expect(screen.queryByText("Low humidity")).not.toBeInTheDocument();
  });
});
