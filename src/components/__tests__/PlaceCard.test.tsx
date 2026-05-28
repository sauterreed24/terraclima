// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES } from "../../data/places";
import { UnitProvider } from "../../lib/units";
import { PlaceCard, getReferenceMonth } from "../PlaceCard";

afterEach(() => cleanup());

function renderPlaceCard({
  onPreloadPlaceDetail,
  onPreloadCompare,
}: {
  onPreloadPlaceDetail?: () => void;
  onPreloadCompare?: () => void;
} = {}) {
  const place = PLACES[0]!;
  const result = render(
    <UnitProvider>
      <PlaceCard
        place={place}
        onOpenPlace={() => undefined}
        onCompareToggle={() => undefined}
        onPreloadPlaceDetail={onPreloadPlaceDetail}
        onPreloadCompare={onPreloadCompare}
      />
    </UnitProvider>,
  );
  return { ...result, place };
}

describe("PlaceCard overlay warmup", () => {
  it("surfaces the computed bioclimatic card signature", () => {
    renderPlaceCard();
    const bioclim = screen.getByLabelText("Bioclimatic signature");

    expect(bioclim.textContent).toContain("K ");
  });

  it("preloads the place detail chunk on hover, focus, and tap intent", () => {
    const onPreloadPlaceDetail = vi.fn();
    const onPreloadCompare = vi.fn();
    const { container } = renderPlaceCard({ onPreloadPlaceDetail, onPreloadCompare });
    const openTarget = container.querySelector<HTMLButtonElement>(".place-card__open-target");

    expect(openTarget).not.toBeNull();
    fireEvent.pointerEnter(openTarget!);
    fireEvent.focus(openTarget!);
    fireEvent.pointerDown(openTarget!);

    expect(onPreloadPlaceDetail).toHaveBeenCalledTimes(3);
    expect(onPreloadCompare).not.toHaveBeenCalled();
  });

  it("highlights the reference month on the climate bar", () => {
    const place = PLACES[0]!;
    const month = 4;
    const { container } = render(
      <UnitProvider>
        <PlaceCard place={place} referenceMonth={month} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );
    const segments = container.querySelectorAll(".place-card__climate-bar__segment");
    expect(segments[month]?.classList.contains("place-card__climate-bar__segment--now")).toBe(true);
    expect(screen.getByText(/^May$/)).toBeInTheDocument();
  });

  it("getReferenceMonth returns 0–11", () => {
    expect(getReferenceMonth(new Date(2026, 4, 15))).toBe(4);
  });

  it("preloads the compare chunk from compare-button intent without opening the profile", () => {
    const onPreloadPlaceDetail = vi.fn();
    const onPreloadCompare = vi.fn();
    const { place } = renderPlaceCard({ onPreloadPlaceDetail, onPreloadCompare });
    const compareButton = screen.getByRole("button", { name: `Add ${place.name} to comparison` });

    fireEvent.pointerEnter(compareButton);
    fireEvent.focus(compareButton);
    fireEvent.pointerDown(compareButton);

    expect(onPreloadCompare).toHaveBeenCalledTimes(3);
    expect(onPreloadPlaceDetail).not.toHaveBeenCalled();
  });
});
