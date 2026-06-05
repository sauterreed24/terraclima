// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES_BY_ID } from "../../../data/places";
import { UnitProvider } from "../../../lib/units";
import { PlaceClimateTwins } from "../PlaceClimateTwins";

afterEach(cleanup);

describe("PlaceClimateTwins", () => {
  it("frames the lead analog as a same-feel tradeoff before the twin cards", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceClimateTwins place={place} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );

    const note = screen.getByRole("group", { name: "Climate twin tradeoff read" });
    expect(note).toHaveTextContent("Same feel, different tradeoffs");
    expect(note).toHaveTextContent("the main climate tradeoff");
    expect(note).toHaveTextContent("Keeps");
    expect(note).toHaveTextContent("Watch:");
    expect(note).toHaveTextContent("adding finalists to Compare");
  });

  it("keeps the lead twin card clickable after adding the relocation read", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    const onOpenPlace = vi.fn();
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceClimateTwins place={place} onOpenPlace={onOpenPlace} />
      </UnitProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /closest climate twin/i }));

    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    expect(onOpenPlace).toHaveBeenCalledWith(expect.any(String));
    expect(onOpenPlace.mock.calls[0]?.[0]).not.toBe(place.id);
  });
});
