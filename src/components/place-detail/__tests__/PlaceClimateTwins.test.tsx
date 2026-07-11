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
    expect(note).toHaveTextContent("Open Port Townsend's dossier to pressure-test that tradeoff");
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

    const leadTwinButton = screen.getByRole("button", { name: /closest climate twin/i });
    expect(leadTwinButton).toHaveAttribute("title", leadTwinButton.getAttribute("aria-label"));
    fireEvent.click(leadTwinButton);

    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    expect(onOpenPlace).toHaveBeenCalledWith(expect.any(String), { trigger: leadTwinButton });
    expect(onOpenPlace.mock.calls[0]?.[0]).not.toBe(place.id);
  });

  it("gives every related climate twin card matching hover help", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    expect(place).toBeTruthy();

    render(
      <UnitProvider>
        <PlaceClimateTwins place={place} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );

    const twinCards = screen.getAllByRole("button", { name: /climate match/i });
    expect(twinCards.length).toBeGreaterThan(0);
    twinCards.forEach(card => {
      expect(card).toHaveAttribute("title", card.getAttribute("aria-label"));
    });
  });
});
