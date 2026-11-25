// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UnitProvider } from "../lib/units";

const TIMEOUT_MS = 30000;

vi.mock("../components/AtlasMap", () => ({
  AtlasMap: () => <div data-testid="atlas-map-stub" />,
}));

vi.mock("../components/VirtualPlaceGrid", () => ({
  VirtualPlaceGrid: ({
    ranked,
    openPlace,
    referenceMonth,
  }: {
    ranked: Array<{ place: { id: string; name: string } }>;
    openPlace: (id: string) => void;
    referenceMonth?: number;
  }) => (
    <div data-testid="place-grid-stub" data-reference-month={referenceMonth} data-first-id={ranked[0]?.place.id ?? ""}>
      {ranked.slice(0, 3).map(row => (
        <button
          key={row.place.id}
          type="button"
          data-place-card-open={row.place.id}
          aria-label={`Open card ${row.place.id}`}
          onClick={() => openPlace(row.place.id)}
        >
          {row.place.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../components/CompareView", () => ({
  CompareView: ({ places, open, onClose }: { places: Array<{ id: string }>; open: boolean; onClose: () => void }) =>
    open && places.length > 0 ? (
      <div role="dialog" aria-label="Compare mock" data-testid="compare-view-mock">
        <button type="button" aria-label="Close comparison" onClick={() => onClose()}>Close comparison</button>
      </div>
    ) : null,
}));

vi.mock("../components/PlaceDetail", () => ({
  PlaceDetail: ({
    onClose,
    place,
    onCompareToggle,
    onOpenPlace,
    onHomeBaseToggle,
  }: {
    onClose: () => void;
    place: { id: string };
    onCompareToggle: (id: string) => void;
    onOpenPlace: (id: string) => void;
    onHomeBaseToggle: (id: string) => void;
  }) => (
    <div role="dialog" aria-label="Place profile" data-testid="place-detail-mock" data-place-id={place.id}>
      <button type="button" aria-label="Close profile" onClick={onClose} />
      <button type="button" aria-label="Toggle compare in profile" onClick={() => onCompareToggle(place.id)} />
      <button type="button" aria-label="Set home in profile" onClick={() => onHomeBaseToggle(place.id)} />
      <button type="button" aria-label="Hop to Port Townsend" onClick={() => onOpenPlace("port-townsend-wa")} />
    </div>
  ),
}));

function renderApp() {
  return render(
    <UnitProvider>
      <App />
    </UnitProvider>,
  );
}

async function settle(ms = 320) {
  await act(async () => {
    await new Promise(resolve => window.setTimeout(resolve, ms));
  });
}

async function historyBack() {
  await act(async () => {
    window.history.back();
    await new Promise(resolve => window.setTimeout(resolve, 60));
  });
}

async function historyForward() {
  await act(async () => {
    window.history.forward();
    await new Promise(resolve => window.setTimeout(resolve, 60));
  });
}

const params = () => new URLSearchParams(window.location.search);
const openProfileId = () => screen.queryByTestId("place-detail-mock")?.getAttribute("data-place-id") ?? null;

async function openFirstCard(): Promise<HTMLElement> {
  const opener = (await screen.findAllByRole("button", { name: /^Open card / }, { timeout: TIMEOUT_MS }))[0]!;
  opener.focus();
  fireEvent.click(opener);
  await screen.findByTestId("place-detail-mock", {}, { timeout: TIMEOUT_MS });
  return opener;
}

describe("App history: profiles, compare and navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("keeps a compare pick and home base made inside a profile after closing it", async () => {
    renderApp();
    const opener = await openFirstCard();
    const placeId = openProfileId()!;
    expect(params().get("p")).toBe(placeId);
    expect(window.history.state).toMatchObject({ tcPlace: true, tcDepth: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Toggle compare in profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Set home in profile" }));
    await waitFor(() => expect(params().get("cmp")).toBe(placeId));
    expect(params().get("hb")).toBe(placeId);

    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    await settle();

    expect(screen.queryByTestId("place-detail-mock")).not.toBeInTheDocument();
    expect(params().get("p")).toBeNull();
    expect(params().get("cmp")).toBe(placeId);
    expect(params().get("hb")).toBe(placeId);
    expect(window.history.state?.tcPlace).toBeFalsy();
    expect(screen.getByRole("region", { name: /place.* to compare/i })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  }, TIMEOUT_MS);

  it("keeps the compare pick when the profile is closed with Escape or browser Back", async () => {
    renderApp();
    await openFirstCard();
    const placeId = openProfileId()!;
    fireEvent.click(screen.getByRole("button", { name: "Toggle compare in profile" }));
    await waitFor(() => expect(params().get("cmp")).toBe(placeId));
    fireEvent.keyDown(window, { key: "Escape" });
    await settle();
    expect(openProfileId()).toBeNull();
    expect(params().get("cmp")).toBe(placeId);

    // Remove it again inside a second visit, then leave with browser Back.
    await openFirstCard();
    fireEvent.click(screen.getByRole("button", { name: "Toggle compare in profile" }));
    await waitFor(() => expect(params().get("cmp")).toBeNull());
    await historyBack();
    expect(openProfileId()).toBeNull();
    expect(params().get("p")).toBeNull();
    expect(params().get("cmp")).toBeNull();
  }, TIMEOUT_MS);

  it("pushes an entry per profile hop; Back steps through and Close leaves the whole chain", async () => {
    renderApp();
    const opener = await openFirstCard();
    const firstId = openProfileId()!;
    const lengthAfterOpen = window.history.length;

    fireEvent.click(screen.getByRole("button", { name: "Hop to Port Townsend" }));
    await waitFor(() => expect(params().get("p")).toBe("port-townsend-wa"));
    expect(window.history.length).toBe(lengthAfterOpen + 1);
    expect(window.history.state).toMatchObject({ tcPlace: true, tcDepth: 2 });

    await historyBack();
    expect(openProfileId()).toBe(firstId);
    await historyForward();
    expect(openProfileId()).toBe("port-townsend-wa");

    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    await settle();
    expect(openProfileId()).toBeNull();
    expect(params().get("p")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));

    // Forward still restores the profile from its URL.
    await historyForward();
    expect(openProfileId()).toBe(firstId);
  }, TIMEOUT_MS);

  it("pushes for view switches and Compare, replaces for search, and restores on Back/Forward", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa&cmpopen=0");
    renderApp();
    await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    const base = window.history.length;

    const search = screen.getAllByLabelText("Search places by name, region, climate type or Köppen code")[0]!;
    fireEvent.change(search, { target: { value: "seq" } });
    await waitFor(() => expect(params().get("q")).toBe("seq"));
    expect(window.history.length).toBe(base);

    fireEvent.click(screen.getByRole("button", { name: "Open compare" }));
    await screen.findByTestId("compare-view-mock", {}, { timeout: TIMEOUT_MS });
    await waitFor(() => expect(params().get("cmpopen")).toBeNull());
    expect(window.history.length).toBe(base + 1);
    expect(window.history.state).toMatchObject({ tcCompare: true });

    // Browser Back closes Compare and restores the entry exactly.
    await historyBack();
    expect(screen.queryByTestId("compare-view-mock")).not.toBeInTheDocument();
    expect(params().get("cmpopen")).toBe("0");
    expect(params().get("q")).toBe("seq");
    await historyForward();
    expect(await screen.findByTestId("compare-view-mock", {}, { timeout: TIMEOUT_MS })).toBeInTheDocument();

    // Closing in-app steps back off the Compare entry instead of stacking.
    fireEvent.click(screen.getByRole("button", { name: "Close comparison" }));
    await settle();
    expect(screen.queryByTestId("compare-view-mock")).not.toBeInTheDocument();
    expect(params().get("cmpopen")).toBe("0");
    expect(window.history.state?.tcCompare).toBeFalsy();

    fireEvent.keyDown(window, { key: "l" });
    await waitFor(() => expect(params().get("v")).toBe("learn"));
    await historyBack();
    expect(params().get("v")).toBeNull();
    expect(params().get("q")).toBe("seq");
    await historyForward();
    expect(params().get("v")).toBe("learn");
  }, TIMEOUT_MS);
});
