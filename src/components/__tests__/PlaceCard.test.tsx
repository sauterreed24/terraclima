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

  it("surfaces ranking evidence near the top of the card and describes the open target", () => {
    const note = "Ranking note: summer afternoons stay unusually restrained for this lens.";
    const place = PLACES[0]!;
    const { container } = render(
      <UnitProvider>
        <PlaceCard
          place={place}
          note={note}
          rank={1}
          rankingLabel="Coolest summers"
          rankingScore={92}
          rankingProfile="coolest-summers"
          onOpenPlace={() => undefined}
        />
      </UnitProvider>,
    );

    const evidence = screen.getByLabelText("Why this place ranked here");
    expect(evidence).toHaveTextContent("Why this rank");
    expect(evidence).toHaveTextContent(note);
    expect(evidence).not.toHaveTextContent("First check");
    expect(screen.queryByText("Livability")).not.toBeInTheDocument();
    expect(screen.queryByText("Live-here fit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(`${place.name} visual signature`)).not.toBeInTheDocument();

    const openTarget = container.querySelector<HTMLButtonElement>(".place-card__open-target");
    expect(openTarget).not.toBeNull();
    expect(openTarget).toHaveAccessibleName(`Open ${place.name} place profile`);
    expect(openTarget).toHaveAttribute("title", openTarget!.getAttribute("aria-label"));
    expect(openTarget!.getAttribute("aria-describedby")).toContain(evidence.id);
    expect(container.querySelectorAll(".place-card__ranking-evidence")).toHaveLength(1);
  });

  it("surfaces screening scores for fit-oriented rankings", () => {
    const place = PLACES[0]!;
    render(
      <UnitProvider>
        <PlaceCard
          place={place}
          note="Fit note"
          rankingProfile="live-fit"
          onOpenPlace={() => undefined}
        />
      </UnitProvider>,
    );

    expect(screen.getByText("Livability")).toBeInTheDocument();
    expect(screen.getByText("Live-here fit")).toBeInTheDocument();
    expect(screen.getByLabelText(`${place.name} visual signature`)).toBeInTheDocument();
    expect(screen.getByLabelText("Why this place ranked here")).toHaveTextContent("First check");
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

  it("passes the open target as the close-focus return trigger", () => {
    const onOpenPlace = vi.fn();
    const place = PLACES[0]!;
    const { container } = render(
      <UnitProvider>
        <PlaceCard place={place} onOpenPlace={onOpenPlace} />
      </UnitProvider>,
    );
    const openTarget = container.querySelector<HTMLButtonElement>(".place-card__open-target");

    expect(openTarget).not.toBeNull();
    fireEvent.click(openTarget!);

    expect(onOpenPlace).toHaveBeenCalledWith(place.id, { trigger: openTarget });
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

  it("keeps the bookmark control outside the card open button (no nested buttons)", () => {
    const onBookmarkToggle = vi.fn();
    const { container } = render(
      <UnitProvider>
        <PlaceCard
          place={PLACES[0]!}
          onOpenPlace={() => undefined}
          onBookmarkToggle={onBookmarkToggle}
        />
      </UnitProvider>,
    );
    const openTarget = container.querySelector(".place-card__open-target");
    const bookmark = container.querySelector(".place-card__bookmark-btn");
    expect(openTarget).not.toBeNull();
    expect(bookmark).not.toBeNull();
    expect(openTarget!.contains(bookmark)).toBe(false);
  });

  it("preloads the compare chunk from compare-button intent without opening the profile", () => {
    const onPreloadPlaceDetail = vi.fn();
    const onPreloadCompare = vi.fn();
    const { place } = renderPlaceCard({ onPreloadPlaceDetail, onPreloadCompare });
    const compareButton = screen.getByRole("button", { name: `Add ${place.name} to comparison` });
    expect(compareButton).toHaveAttribute("title", `Add ${place.name} to comparison`);

    fireEvent.pointerEnter(compareButton);
    fireEvent.focus(compareButton);
    fireEvent.pointerDown(compareButton);

    expect(onPreloadCompare).toHaveBeenCalledTimes(3);
    expect(onPreloadPlaceDetail).not.toHaveBeenCalled();
  });

  it("uses the readable active compare class when already selected", () => {
    const place = PLACES[0]!;
    render(
      <UnitProvider>
        <PlaceCard
          place={place}
          inCompare
          onOpenPlace={() => undefined}
          onCompareToggle={() => undefined}
        />
      </UnitProvider>,
    );

    const compareButton = screen.getByRole("button", { name: `Remove ${place.name} from comparison` });
    expect(compareButton).toHaveAttribute("aria-pressed", "true");
    expect(compareButton).toHaveAttribute("title", `Remove ${place.name} from comparison`);
    expect(compareButton).toHaveClass("compare-toggle--active");
  });
});

describe("PlaceCard home-base delta strip", () => {
  it("shows compact climate-delta chips against the home base", () => {
    const home = PLACES.find(p => p.id === "sequim-wa")!;
    const place = PLACES.find(p => p.id === "tucson-az") ?? PLACES.find(p => p.id !== home.id)!;
    render(
      <UnitProvider>
        <PlaceCard place={place} homePlace={home} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );

    const strip = screen.getByLabelText(`Climate versus your home base, ${home.name}`);
    expect(strip).toHaveTextContent(`vs ${home.name}`);
    expect(strip.querySelectorAll(".chip").length).toBeGreaterThan(0);
  });

  it("marks the home base's own card as the baseline", () => {
    const home = PLACES.find(p => p.id === "sequim-wa")!;
    render(
      <UnitProvider>
        <PlaceCard place={home} homePlace={home} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );

    const strip = screen.getByLabelText(`${home.name} is your home base`);
    expect(strip).toHaveTextContent("your climate baseline");
  });

  it("renders no delta strip without a home base", () => {
    renderPlaceCard();
    expect(screen.queryByText(/vs /)).not.toBeInTheDocument();
    expect(document.querySelector(".place-card__home-delta")).toBeNull();
  });
});
