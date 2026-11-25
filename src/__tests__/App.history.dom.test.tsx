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
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Desktop layout: the filter dock (and its search box) is on the page.
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const minWidth = query.match(/\(min-width:\s*(\d+)px\)/)?.[1];
      const maxWidth = query.match(/\(max-width:\s*(\d+)px\)/)?.[1];
      return {
        matches: (minWidth ? 1440 >= Number(minWidth) : true) && (maxWidth ? 1440 <= Number(maxWidth) : true),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }) as unknown as typeof window.matchMedia;
    window.localStorage.clear();
    // Push (not replace) so forward entries left by an earlier test are
    // truncated and `history.length` deltas are meaningful.
    window.history.pushState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
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

  it("ranks by a chosen month, names it, writes m= and restores it from the URL", async () => {
    const thisMonth = new Date().getMonth();
    const other = (thisMonth + 6) % 12;
    const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    renderApp();
    const grid = await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    expect(screen.queryByLabelText("Month to rank by")).not.toBeInTheDocument();

    const rankBy = screen.getAllByLabelText("Rank by")[0]!;
    fireEvent.change(rankBy, { target: { value: "best-this-month" } });
    const month = await screen.findByLabelText("Month to rank by", {}, { timeout: TIMEOUT_MS });
    expect((month as HTMLSelectElement).value).toBe(String(thisMonth));
    await waitFor(() => expect(params().get("r")).toBe("best-this-month"));
    expect(params().get("m")).toBeNull();
    expect(grid.getAttribute("data-reference-month")).toBe(String(thisMonth));
    const firstNow = grid.getAttribute("data-first-id");

    fireEvent.change(month, { target: { value: String(other) } });
    await waitFor(() => expect(params().get("m")).toBe(String(other + 1)));
    await waitFor(() => expect(grid.getAttribute("data-reference-month")).toBe(String(other)));
    await waitFor(() => expect(grid.getAttribute("data-first-id")).not.toBe(firstNow));
    expect(rankBy.querySelector('option[value="best-this-month"]')?.textContent).toBe(`Best in ${names[other]}`);

    // Back to the current month drops the param again.
    fireEvent.change(month, { target: { value: String(thisMonth) } });
    await waitFor(() => expect(params().get("m")).toBeNull());
    cleanup();

    // Reload-style hydration from a shared link.
    window.history.replaceState(null, "", `/?r=best-this-month&m=${other + 1}`);
    renderApp();
    const restored = await screen.findByLabelText("Month to rank by", {}, { timeout: TIMEOUT_MS });
    expect((restored as HTMLSelectElement).value).toBe(String(other));
    expect(screen.getByTestId("place-grid-stub").getAttribute("data-reference-month")).toBe(String(other));
    expect(params().get("m")).toBe(String(other + 1));
  }, TIMEOUT_MS);

  it("opens the first ranked result on Enter in the search box and ignores an empty query", async () => {
    renderApp();
    const grid = await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    const search = screen.getAllByLabelText("Search places by name, region, climate type or Köppen code")[0]! as HTMLInputElement;
    search.focus();

    fireEvent.keyDown(search, { key: "Enter" });
    await settle(60);
    expect(openProfileId()).toBeNull();

    fireEvent.change(search, { target: { value: "sequim" } });
    // Enter straight after typing waits for the deferred ranking to settle.
    fireEvent.keyDown(search, { key: "Enter" });
    await screen.findByTestId("place-detail-mock", {}, { timeout: TIMEOUT_MS });
    expect(openProfileId()).toBe("sequim-wa");
    expect(grid.getAttribute("data-first-id")).toBe("sequim-wa");
    expect(params().get("q")).toBe("sequim");

    // Closing returns to the search box with the query intact.
    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    await settle();
    expect(params().get("q")).toBe("sequim");
    await waitFor(() => expect(document.activeElement).toBe(search));
  }, TIMEOUT_MS);

  it("moves focus from the search box to the first result on ArrowDown and opens Compare with V", async () => {
    window.history.replaceState(null, "", "/?cmp=sequim-wa,port-townsend-wa&cmpopen=0");
    renderApp();
    await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    const search = screen.getAllByLabelText("Search places by name, region, climate type or Köppen code")[0]! as HTMLInputElement;
    search.focus();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: /^Open card / })[0]);

    fireEvent.keyDown(search, { key: "v" });
    expect(screen.queryByTestId("compare-view-mock")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "v" });
    expect(await screen.findByTestId("compare-view-mock", {}, { timeout: TIMEOUT_MS })).toBeInTheDocument();
  }, TIMEOUT_MS);

  it("announces the automatic switch to Live-here fit and lets the reader undo it", async () => {
    window.history.replaceState(null, "", "/?r=coolest-summers&fit=dry-air");
    renderApp();
    await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    await waitFor(() => expect(params().get("r")).toBe("live-fit"));
    const notice = (await screen.findAllByRole("status")).find(el => el.hasAttribute("data-ranking-notice"))!;
    expect(notice.textContent).toContain("Ranking switched to Live-here fit because a must-have is on.");
    expect(notice.textContent).toContain("Coolest summers");

    fireEvent.click(screen.getByRole("button", { name: "Undo the ranking switch" }));
    await waitFor(() => expect(params().get("r")).toBe("coolest-summers"));
    expect(params().get("fit")).toBe("dry-air");
    expect(document.querySelector("[data-ranking-notice]")).toBeNull();
    // It stays undone: the must-have does not re-trigger the switch.
    await settle(80);
    expect(params().get("r")).toBe("coolest-summers");
  }, TIMEOUT_MS);

  it("explains Find home base where the focus lands", async () => {
    renderApp();
    await screen.findByTestId("place-grid-stub", {}, { timeout: TIMEOUT_MS });
    fireEvent.click(screen.getByRole("button", { name: /then set it as your home base/ }));
    const prompt = await waitFor(() => {
      const el = document.querySelector("[data-search-prompt]");
      expect(el).not.toBeNull();
      return el!;
    });
    expect(prompt.textContent).toContain("Search for the place nearest where you live, open it, then choose Set home.");
    expect(document.activeElement).toBe(
      screen.getAllByLabelText("Search places by name, region, climate type or Köppen code")[0],
    );
  }, TIMEOUT_MS);
});
