// @vitest-environment jsdom
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { buildCompareDecisionProfiles, compareLensScore } from "../../lib/compare-finalist-verdict";
import type { CompareCandidate, ComparisonLensId } from "../../lib/compare-workbench";
import type { LiveFitFilters, LiveFitPresetId } from "../../lib/live-fit";
import { UnitProvider } from "../../lib/units";
import { possessive } from "../../lib/place-name";
import type { Place } from "../../types";
import { CompareView } from "../CompareView";

const CANDIDATE_SEARCH_LABEL = "Find places to add, by name, region or source";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MotionDiv(
      { children, ...props },
      ref,
    ) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  useReducedMotion: () => true,
}));

vi.mock("../charts/MicroclimateFingerprint", () => ({
  MicroclimateFingerprint: ({ compactLabels }: { compactLabels?: boolean }) => (
    <div data-testid="fingerprint-chart" data-compact-labels={String(Boolean(compactLabels))} />
  ),
}));

vi.mock("../charts/ClimateRibbon", () => ({
  ClimateRibbon: () => <div data-testid="climate-ribbon" />,
}));

afterEach(() => cleanup());

function renderCompare({
  onCopyView,
  onClose = () => undefined,
  onRemove = () => undefined,
  onOpenPlace,
  onAddPlace,
  shareStatus,
  shareFallbackUrl,
  liveFitFilters,
  candidates,
  comparisonLens,
  onComparisonLensChange,
  homePlace,
  scenario,
  occluded,
  places = PLACES.slice(0, 4),
}: {
  onCopyView?: () => void;
  onClose?: () => void;
  onRemove?: (id: string) => void;
  onOpenPlace?: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
  onAddPlace?: (id: string, replaceId?: string) => void;
  shareStatus?: "idle" | "shared" | "copied" | "failed";
  shareFallbackUrl?: string | null;
  liveFitFilters?: LiveFitFilters;
  candidates?: CompareCandidate[];
  comparisonLens?: ComparisonLensId;
  onComparisonLensChange?: (lens: ComparisonLensId) => void;
  homePlace?: Place | null;
  scenario?: "now" | "ssp245" | "ssp585";
  occluded?: boolean;
  places?: Place[];
} = {}) {
  render(
    <UnitProvider>
      <CompareView
        places={places}
        open
        onClose={onClose}
        onRemove={onRemove}
        onOpenPlace={onOpenPlace}
        onCopyView={onCopyView}
        shareStatus={shareStatus}
        shareFallbackUrl={shareFallbackUrl}
        liveFitFilters={liveFitFilters}
        onAddPlace={onAddPlace}
        candidates={candidates}
        comparisonLens={comparisonLens}
        onComparisonLensChange={onComparisonLensChange}
        homePlace={homePlace}
        scenario={scenario}
        occluded={occluded}
      />
    </UnitProvider>,
  );
}

describe("CompareView", () => {
  it("renders the Compare Workbench lens controls and candidate tray", () => {
    const onComparisonLensChange = vi.fn();
    const onAddPlace = vi.fn();
    const onRemove = vi.fn();
    const candidates: CompareCandidate[] = PLACES.slice(0, 8).map(place => ({
      place,
      source: "Shortlist",
      note: "Pinned test candidate",
    }));

    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 4)}
          open
          onClose={() => undefined}
          onRemove={onRemove}
          onAddPlace={onAddPlace}
          candidates={candidates}
          comparisonLens="risk"
          onComparisonLensChange={onComparisonLensChange}
        />
      </UnitProvider>,
    );

    const workbench = screen.getByLabelText("Add or swap places");
    expect(workbench).toHaveTextContent("Compare for");
    expect(workbench).toHaveTextContent("Risk");
    expect(workbench).toHaveTextContent("4/4 compared / 8 to choose from");
    expect(screen.getByRole("button", { name: "Close comparison" })).toBeInTheDocument();

    const lens = screen.getByRole("group", { name: "What to compare for" });
    expect(within(lens).getByRole("button", { name: "Risk" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(lens).getByRole("button", { name: "Garden" }));
    expect(onComparisonLensChange).toHaveBeenCalledWith("garden");

    expect(within(screen.getByLabelText("Candidate tray")).getAllByRole("button", { name: /the comparison/ })).toHaveLength(8);
    const activeCandidate = screen.getByRole("button", { name: `Remove ${PLACES[0].name} from the comparison` });
    expect(activeCandidate).toHaveAttribute("aria-pressed", "true");
    expect(activeCandidate).toHaveTextContent("Remove");
    fireEvent.click(activeCandidate);
    expect(onRemove).toHaveBeenCalledWith(PLACES[0].id);

    // A full set swaps out the place the card measures against: the weakest
    // read for the active lens (here Portal on Risk), not the oldest slot.
    const swapCandidate = screen.getByRole("button", { name: `Swap ${PLACES[4].name} into the comparison` });
    expect(swapCandidate).toHaveTextContent("Swap");
    expect(swapCandidate).toHaveTextContent(`over ${possessive(PLACES[1].name)} risk score`);
    expect(swapCandidate).toHaveTextContent(`Replaces ${PLACES[1].name}`);
    expect(swapCandidate).toHaveAttribute("title", expect.stringContaining(`Replaces ${PLACES[1].name}, which scores lowest for risk.`));
    onRemove.mockClear();
    fireEvent.click(screen.getByRole("button", { name: `Swap ${PLACES[4].name} into the comparison` }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(onAddPlace).toHaveBeenCalledWith(PLACES[4].id, PLACES[1].id);
  });

  it("offers direct shortcuts to decision, evidence, differences, and candidates", () => {
    renderCompare();

    const shortcuts = screen.getByRole("navigation", { name: "Jump to a section of Compare" });
    const workbench = screen.getByLabelText("Add or swap places");

    expect(shortcuts.compareDocumentPosition(workbench) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(shortcuts).getByRole("link", { name: "Jump to the summary" })).toHaveAttribute("href", "#compare-decision-read");
    expect(within(shortcuts).getByRole("link", { name: "Jump to how well each place is sourced" })).toHaveAttribute("href", "#compare-evidence-readiness");
    expect(within(shortcuts).getByRole("link", { name: "Jump to the table of differences" })).toHaveAttribute("href", "#compare-diff-board");
    expect(within(shortcuts).getByRole("link", { name: "Jump to add or swap places" })).toHaveAttribute("href", "#compare-candidates");
    expect(workbench).toHaveAttribute("id", "compare-candidates");
    expect(screen.getByLabelText("Comparison summary")).toHaveAttribute("id", "compare-decision-read");
    expect(screen.getByLabelText("How well sourced")).toHaveAttribute("id", "compare-evidence-readiness");
    expect(screen.getByLabelText("Differences")).toHaveAttribute("id", "compare-diff-board");
  });

  it("keeps empty dialog padding pass-through while the visible close action owns focus", () => {
    const onClose = vi.fn();
    renderCompare({ onClose });

    const close = screen.getByRole("button", { name: "Close comparison" });
    expect(close).toHaveFocus();
    expect(close).toHaveAttribute("title", "Close comparison");
    expect(screen.getAllByRole("button", { name: "Close comparison" })).toHaveLength(1);

    const scrim = document.querySelector(".tc-modal-scrim") as HTMLElement | null;
    expect(scrim).not.toBeNull();
    expect(scrim?.tagName).toBe("DIV");
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).not.toHaveAttribute("tabindex");

    const frame = document.querySelector(".compare-dialog__frame");
    const content = document.querySelector(".compare-dialog__content") as HTMLElement | null;
    expect(frame).not.toHaveClass("pointer-events-auto");
    expect(content).not.toBeNull();

    fireEvent.click(content!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(scrim!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the Workbench useful for a single saved place", () => {
    const anchor = PLACES[0]!;
    const contrast = PLACES[1]!;
    const onAddPlace = vi.fn();
    renderCompare({
      places: [anchor],
      onAddPlace,
      candidates: [{ place: contrast, source: "Ranked", note: "Leader" }],
    });

    expect(screen.getByLabelText("Add or swap places")).toHaveTextContent("1/4 compared / 2 to choose from");
    const addCandidate = screen.getByRole("button", { name: `Add ${contrast.name} to the comparison` });
    expect(addCandidate).toHaveTextContent("Add");
    fireEvent.click(addCandidate);
    expect(onAddPlace).toHaveBeenCalledWith(contrast.id);
  });

  it("surfaces contrast coach recommendations as one-click workbench swaps", () => {
    const onAddPlace = vi.fn();
    const candidates: CompareCandidate[] = PLACES.slice(0, 9).map(place => ({
      place,
      source: "Shortlist",
      note: "Pinned test candidate",
    }));
    renderCompare({
      places: PLACES.slice(0, 4),
      candidates,
      onAddPlace,
      comparisonLens: "risk",
    });

    const coach = screen.getByLabelText("Suggested swaps");
    expect(coach).toHaveTextContent("Places that would sharpen the comparison");
    expect(coach).toHaveTextContent(/upgrade|contrast|risk|sourced/i);

    const recommendation = within(coach).getAllByRole("button", { name: /Suggested because:/ })[0]!;
    expect(recommendation).toHaveAttribute("title", recommendation.getAttribute("aria-label"));
    fireEvent.click(recommendation);

    expect(onAddPlace).toHaveBeenCalledTimes(1);
    expect(PLACES.slice(0, 4).map(place => place.id)).not.toContain(onAddPlace.mock.calls[0][0]);
    // The set is full, so the coach names the active place it swaps out.
    expect(PLACES.slice(0, 4).map(place => place.id)).toContain(onAddPlace.mock.calls[0][1]);
  });

  it("filters the candidate tray by source and search while keeping active slots visible", () => {
    const candidates: CompareCandidate[] = [
      { place: PLACES[4]!, source: "Shortlist", note: "Pinned test candidate" },
      { place: PLACES[5]!, source: "Recent", note: "Recent test candidate" },
      { place: PLACES[6]!, source: "Ranked", note: "Ranked test candidate" },
    ];
    renderCompare({
      places: PLACES.slice(0, 4),
      candidates,
    });

    const tray = screen.getByLabelText("Candidate tray");
    expect(within(tray).getAllByRole("button", { name: /the comparison/ })).toHaveLength(7);

    expect(within(tray).getByRole("button", { name: "All" })).toHaveAttribute("title", "Show places from: all");
    expect(within(tray).getByRole("button", { name: "Recent" })).toHaveAttribute("title", "Show places from: recent");
    fireEvent.click(within(tray).getByRole("button", { name: "Recent" }));
    expect(within(tray).getAllByRole("button", { name: /the comparison/ })).toHaveLength(5);
    expect(within(tray).getByRole("button", { name: `Swap ${PLACES[5]!.name} into the comparison` })).toBeInTheDocument();
    expect(within(tray).queryByRole("button", { name: `Swap ${PLACES[4]!.name} into the comparison` })).not.toBeInTheDocument();
    expect(tray).toHaveTextContent("4/4 compared / 1/3 match");
    expect(tray).toHaveTextContent("Places already in the comparison come first, then search matches.");

    fireEvent.change(within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL }), {
      target: { value: PLACES[5]!.region },
    });
    expect(within(tray).getByRole("button", { name: `Swap ${PLACES[5]!.name} into the comparison` })).toBeInTheDocument();
    expect(tray).toHaveTextContent("4/4 compared / 1/3 match");

    fireEvent.click(within(tray).getByRole("button", { name: "Clear the search and show all places you can add" }));
    const resetSearch = within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL });
    expect(resetSearch).toHaveValue("");
    expect(resetSearch).toHaveFocus();
    expect(within(tray).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(within(tray).getAllByRole("button", { name: /the comparison/ })).toHaveLength(7);
    expect(tray).toHaveTextContent("7 to choose from");
  });

  it("explains zero candidate-finder matches without hiding active compare slots", () => {
    const candidates: CompareCandidate[] = [
      { place: PLACES[4]!, source: "Shortlist", note: "Pinned test candidate" },
      { place: PLACES[5]!, source: "Recent", note: "Recent test candidate" },
    ];
    renderCompare({
      places: PLACES.slice(0, 4),
      candidates,
    });

    const tray = screen.getByLabelText("Candidate tray");
    fireEvent.change(within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL }), {
      target: { value: "zzznomatches" },
    });

    expect(tray).toHaveTextContent("4/4 compared / 0/2 matches");
    expect(tray).toHaveTextContent("Nothing else matches.");
    expect(within(tray).getByRole("button", { name: "Clear the search and show all places you can add" })).toBeInTheDocument();
    expect(within(tray).getAllByRole("button", { name: /the comparison/ })).toHaveLength(4);
    expect(within(tray).queryByRole("button", { name: /Swap .* into the comparison/ })).not.toBeInTheDocument();
  });

  it("clears the candidate search on Escape before closing the comparison", () => {
    const onClose = vi.fn();
    const candidates: CompareCandidate[] = [
      { place: PLACES[4]!, source: "Shortlist", note: "Pinned test candidate" },
      { place: PLACES[5]!, source: "Recent", note: "Recent test candidate" },
    ];
    renderCompare({
      candidates,
      onClose,
    });

    const dialog = screen.getByRole("dialog", { name: "4 places side by side" });
    const tray = screen.getByLabelText("Candidate tray");
    const search = within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL }) as HTMLInputElement;
    expect(search).toHaveAttribute("title", CANDIDATE_SEARCH_LABEL);

    fireEvent.change(search, { target: { value: "no-match" } });
    expect(search.value).toBe("no-match");

    fireEvent.keyDown(search, { key: "Escape" });

    expect(search.value).toBe("");
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
  });

  it("sorts inactive candidates by decision cues and shows compact score reads", () => {
    const candidates: CompareCandidate[] = [
      { place: PLACES[4]!, source: "Shortlist", note: "Pinned test candidate" },
      { place: PLACES[5]!, source: "Recent", note: "Recent test candidate" },
      { place: PLACES[6]!, source: "Ranked", note: "Ranked test candidate" },
    ];
    renderCompare({
      places: PLACES.slice(0, 4),
      candidates,
      comparisonLens: "risk",
    });

    const tray = screen.getByLabelText("Candidate tray");
    const select = within(tray).getByRole("combobox", { name: "Sort places you can add" });
    const sortedProfiles = buildCompareDecisionProfiles(candidates.map(candidate => candidate.place))
      .sort((a, b) => compareLensScore(b, "risk") - compareLensScore(a, "risk") || a.place.name.localeCompare(b.place.name));
    const topProfile = sortedProfiles[0]!;

    fireEvent.change(select, { target: { value: "lens" } });

    const inactiveButtons = within(tray).getAllByRole("button", { name: /Swap .* into the comparison/ });
    expect(inactiveButtons[0]).toHaveAttribute("aria-label", `Swap ${topProfile.place.name} into the comparison`);
    expect(inactiveButtons[0]).toHaveTextContent(`${compareLensScore(topProfile, "risk")}/100`);
    expect(inactiveButtons[0]).toHaveTextContent("Risk");
    expect(inactiveButtons[0]).toHaveTextContent(`${topProfile.easyMonths}/12 easy months`);
    expect(inactiveButtons[0]).toHaveTextContent(`${topProfile.riskLoad}/100 overall risk`);
    const insight = within(inactiveButtons[0]).getByLabelText(`What adding ${topProfile.place.name} would change`);
    expect(insight).toHaveTextContent(/upgrade|contrast|sourced|risk|gardening|close to the best|similar option/i);
    expect(insight.textContent?.length ?? 0).toBeGreaterThan(24);
  });

  it("groups practical comparison rows and can hide matching signals", () => {
    renderCompare();

    const table = screen.getByRole("table", { name: "Figures and scores for each compared place, grouped by topic" });
    expect(table).toHaveTextContent("Comfort");
    expect(table).toHaveTextContent("Seasonality");
    expect(table).toHaveTextContent("Hazards");
    expect(table).toHaveTextContent("Living there");
    expect(table).toHaveTextContent("Access/cost");
    expect(table).toHaveTextContent("Garden/land");
    expect(table).toHaveTextContent("Evidence");
    expect(table).toHaveTextContent("Web sources");
    expect(table).toHaveTextContent("Sunshine");
    expect(table).not.toHaveTextContent("Solar resource");
    expect(table).not.toHaveTextContent(" MJ");

    const beforeRows = within(table).getAllByRole("row").length;
    const toggle = screen.getByRole("button", { name: "Show differences only" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(within(table).getAllByRole("row").length).toBeLessThanOrEqual(beforeRows);
  });

  it("surfaces comparison highlights before the column matrix", () => {
    const onOpenPlace = vi.fn();
    renderCompare({ onOpenPlace });

    expect(screen.getByLabelText("Comparison highlights")).toBeInTheDocument();
    expect(screen.getByText("Coolest summer")).toBeInTheDocument();
    expect(screen.getByText("Mildest winter")).toBeInTheDocument();
    expect(screen.getByText("Best live-here fit")).toBeInTheDocument();
    expect(screen.queryByText("Top livability")).not.toBeInTheDocument();
    expect(screen.getByText("Lowest overall risk")).toBeInTheDocument();
    expect(screen.getByText("Best growability")).toBeInTheDocument();
    expect(screen.getAllByText("Live-here fit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Livability").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Felt comfort").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("fingerprint-chart").every(chart => chart.dataset.compactLabels === "true")).toBe(true);

    const highlightButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".compare-insight-strip__place--link"),
    );
    const labels = highlightButtons.map(button => button.getAttribute("aria-label"));
    expect(highlightButtons.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);
    for (const button of highlightButtons) {
      expect(button).toHaveAttribute("aria-label", expect.stringMatching(/^Open the .+ profile\. .+/));
      expect(button).toHaveAttribute("title", button.getAttribute("aria-label"));
    }
  });

  it("announces the comparison count for screen readers when the set changes", () => {
    const { rerender } = render(
      <UnitProvider>
        <CompareView places={PLACES.slice(0, 2)} open onClose={() => undefined} onRemove={() => undefined} />
      </UnitProvider>,
    );
    expect(screen.getByText("Now comparing 2 places.")).toBeInTheDocument();

    rerender(
      <UnitProvider>
        <CompareView places={PLACES.slice(0, 3)} open onClose={() => undefined} onRemove={() => undefined} />
      </UnitProvider>,
    );
    expect(screen.getByText("Now comparing 3 places.")).toBeInTheDocument();
  });

  it("adds a decision read and copyable comparison handoff", () => {
    const onCopyView = vi.fn();
    const onOpenPlace = vi.fn();
    renderCompare({ onCopyView, onOpenPlace });

    const decisionRead = screen.getByLabelText("Comparison summary");
    expect(decisionRead).toBeInTheDocument();
    expect(within(decisionRead).getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Next step")).toBeInTheDocument();
    expect(screen.getByText("Top priority score")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Comparison summary")).getByText("Lowest risk")).toBeInTheDocument();
    expect(screen.getByText("Most comfortable")).toBeInTheDocument();
    expect(screen.getByText("Best for gardening")).toBeInTheDocument();
    expect(screen.getByLabelText("All places at a glance")).toBeInTheDocument();
    expect(screen.getByText("All places at a glance")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getAllByText("Priority score").length).toBeGreaterThan(0);
    expect(screen.getByText("Best time to visit")).toBeInTheDocument();
    expect(screen.getByText("Check first")).toBeInTheDocument();
    expect(screen.getByText("Start here")).toBeInTheDocument();
    expect(screen.getByLabelText("How well sourced")).toBeInTheDocument();
    const scoutSequence = screen.getByLabelText("Visit order");
    expect(scoutSequence).toBeInTheDocument();
    expect(screen.getByText("Visit order")).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Start here/)).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Counterweight/)).toBeInTheDocument();
    const checklist = screen.getByLabelText("Check before you go");
    expect(checklist).toHaveTextContent("Check before you go");
    expect(checklist).toHaveTextContent("When to visit");
    expect(checklist).toHaveTextContent("Tradeoff check");
    expect(checklist).toHaveTextContent("Hazard check");
    expect(checklist).toHaveTextContent("Daily life");
    expect(checklist).toHaveTextContent("Sources to check");
    expect(checklist).toHaveTextContent("What to confirm for each place before booking a visit");

    fireEvent.click(screen.getByRole("button", { name: "Copy a link to this comparison" }));
    expect(onCopyView).toHaveBeenCalledTimes(1);
    const firstDossier = screen.getByRole("button", { name: /Open first profile:/ });
    expect(firstDossier).toHaveAttribute("title", firstDossier.getAttribute("aria-label"));
    fireEvent.click(firstDossier);
    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    const scoutStep = screen.getByRole("button", { name: /^Open .+\. Start here\./ });
    expect(scoutStep).toHaveAttribute("title", scoutStep.getAttribute("aria-label"));
    fireEvent.click(scoutStep);
    expect(onOpenPlace).toHaveBeenCalledTimes(2);
    const checklistItem = within(checklist).getAllByRole("button", { name: /^Open .+ to check: / })[0]!;
    expect(checklistItem).toHaveAttribute("title", checklistItem.getAttribute("aria-label"));
    fireEvent.click(checklistItem);
    expect(onOpenPlace).toHaveBeenCalledTimes(3);
    const finalist = screen.getAllByRole("button", { name: /from the at-a-glance table/ })[0]!;
    expect(finalist).toHaveAttribute("title", finalist.getAttribute("aria-label"));
    fireEvent.click(finalist);
    expect(onOpenPlace).toHaveBeenCalledTimes(4);
  });

  it("distinguishes native share success from clipboard copy feedback", () => {
    renderCompare({ onCopyView: vi.fn(), shareStatus: "shared" });

    expect(screen.getByRole("button", { name: "Copy a link to this comparison" })).toHaveTextContent("Shared");
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("keeps a selectable comparison URL in the dialog when copy fails", async () => {
    const fallbackUrl = "https://terraclima.example/?cmp=morelia-mx,oaxaca-mx&temp=C&dist=metric";

    renderCompare({ onCopyView: vi.fn(), shareStatus: "failed", shareFallbackUrl: fallbackUrl });

    expect(screen.getByRole("button", { name: "Copy failed. Try again, or copy the link shown below" })).toHaveTextContent(
      "Copy by hand",
    );
    const fallbackGroup = screen.getByRole("group", { name: "Manual comparison share link" });
    const fallbackInput = within(fallbackGroup).getByRole("textbox", {
      name: "Link to this comparison. Select it and copy.",
    });

    expect(fallbackInput).toHaveValue(fallbackUrl);
    await waitFor(() => expect(fallbackInput).toHaveFocus());
  });

  it("surfaces weak evidence before a place is treated as travel-ready", () => {
    const onOpenPlace = vi.fn();
    const thinPlace: Place = {
      ...PLACES[0]!,
      id: "thin-evidence-test",
      name: "Thin Evidence Test",
      confidence: "low",
      citations: [],
      deepSections: undefined,
      liveSignals: undefined,
      climate: {
        ...PLACES[0]!.climate,
        humidity: undefined,
        sunshinePct: undefined,
      },
    };
    renderCompare({ places: [thinPlace, PLACES[1]!], onOpenPlace });

    const readiness = screen.getByLabelText("How well sourced");
    expect(readiness).toHaveTextContent("Thin Evidence Test: Thinly sourced");
    expect(readiness).toHaveTextContent("0 web sources");
    expect(readiness).toHaveTextContent("Low-confidence entry");
    expect(readiness).toHaveTextContent("Fewer than two web sources");
    expect(readiness).toHaveTextContent("No cost or access data");

    const evidenceButton = within(readiness).getByRole("button", { name: "Open the Thin Evidence Test profile" });
    expect(evidenceButton).toHaveAttribute("title", "Open the Thin Evidence Test profile");
    fireEvent.click(evidenceButton);
    expect(onOpenPlace).toHaveBeenCalledWith("thin-evidence-test", { trigger: evidenceButton });
  });

  it("renders one finalist decision table row per compared place", () => {
    renderCompare({ onOpenPlace: vi.fn() });

    const table = screen.getByRole("table", { name: "Role, priority score, best season and first caution for each compared place" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(PLACES.slice(0, 4).length + 1);
    for (const place of PLACES.slice(0, 4)) {
      expect(within(table).getByRole("button", { name: `Open ${place.name} from the at-a-glance table` })).toBeInTheDocument();
    }
    expect(within(table).getAllByText(/\/100 fit/)).toHaveLength(4);
    expect(within(table).getAllByText(/\/100 risk/)).toHaveLength(4);
  });

  it("turns a single saved finalist into a guided shortlist setup", () => {
    const onOpenPlace = vi.fn();
    const onClose = vi.fn();
    const anchor = PLACES[0]!;
    renderCompare({ places: [anchor], onOpenPlace, onClose });

    expect(screen.getByRole("dialog", { name: "1 place saved to compare" })).toBeInTheDocument();
    expect(screen.getByLabelText("Getting started with one place")).toBeInTheDocument();
    expect(screen.getByText("One place so far")).toBeInTheDocument();
    expect(screen.getByText(/is the only place here so far/)).toBeInTheDocument();
    expect(screen.getByText(/Add a second place to see tradeoffs/)).toBeInTheDocument();
    expect(screen.getByText("This place")).toBeInTheDocument();
    expect(screen.getByText("Add next")).toBeInTheDocument();
    expect(screen.getByText("Then add")).toBeInTheDocument();
    expect(screen.queryByLabelText("Comparison summary")).not.toBeInTheDocument();

    const reviewButton = screen.getByRole("button", { name: `Open the profile for ${anchor.name}` });
    expect(reviewButton).toHaveAttribute("title", `Open the profile for ${anchor.name}`);
    fireEvent.click(reviewButton);
    expect(onOpenPlace).toHaveBeenCalledWith(anchor.id, { trigger: reviewButton });
    fireEvent.click(screen.getByRole("button", { name: "Back to the atlas" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows authored sunshine percent in Compare, never solar MJ as sky brightness", () => {
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const yuma = PLACES_BY_ID["yuma-az"]!;
    renderCompare({ places: [sequim, yuma] });

    const table = screen.getByRole("table", { name: "Figures and scores for each compared place, grouped by topic" });
    expect(table).toHaveTextContent("Sunshine");
    expect(table).toHaveTextContent("50%");
    expect(table).toHaveTextContent("92%");
    expect(table).not.toHaveTextContent("Solar resource");
    expect(table).not.toHaveTextContent(" MJ");
    expect(screen.getAllByText("Sunshine").length).toBeGreaterThan(0);
  });

  it("adds a compact mobile key for bioclimatic comparison rows", () => {
    renderCompare();

    expect(screen.getByText("What the index rows mean")).toBeInTheDocument();
    expect(screen.getByText(/De Martonne aridity index/)).toBeInTheDocument();
    expect(screen.getByText(/Conrad continentality index/)).toBeInTheDocument();
    expect(screen.getByText("Selianinov hydrothermal coefficient")).toBeInTheDocument();
    expect(screen.getByText(/Thornthwaite potential evapotranspiration/)).toBeInTheDocument();
    expect(screen.getByText(/UNEP aridity index/)).toBeInTheDocument();
  });

  it("scopes remove controls to the compare dialog cards", () => {
    const onRemove = vi.fn();
    renderCompare({ onRemove });

    const dialog = screen.getByRole("dialog", { name: "4 places side by side" });
    const removeButtons = within(dialog).getAllByRole("button", { name: /Remove .* from comparison/ });

    expect(removeButtons).toHaveLength(4);
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(PLACES[0].id);
  });

  it("opens a place profile from the column title when onOpenPlace is provided", () => {
    const onOpenPlace = vi.fn();
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          onOpenPlace={onOpenPlace}
        />
      </UnitProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "2 places side by side" });
    const titleButton = within(dialog).getByRole("button", { name: `Open ${PLACES[0].name} profile` });
    expect(titleButton).toHaveClass("compare-column-title");
    expect(titleButton).toHaveAttribute("title", `Open ${PLACES[0].name} profile`);
    expect(within(dialog).getByRole("button", { name: `Remove ${PLACES[0].name} from comparison` })).toHaveAttribute(
      "title",
      `Remove ${PLACES[0].name} from comparison`,
    );
    fireEvent.click(titleButton);
    expect(onOpenPlace).toHaveBeenCalledWith(PLACES[0].id, { trigger: titleButton });
  });

  it("aligns live-here comparison scores with the active Live Finder filters", () => {
    renderCompare({
      liveFitFilters: {
        fitPresets: new Set<LiveFitPresetId>(["cool-summers"]),
        maxSummerHighC: 22,
      },
    });

    const liveFitHighlight = screen.getByText("Best live-here fit").closest(".compare-insight-strip__item");
    expect(liveFitHighlight).not.toBeNull();
    expect(within(liveFitHighlight as HTMLElement).getByText(/\d+\/100/)).toBeInTheDocument();
  });

  it("explains the comparison scoring lens when Live Finder filters shape Compare", () => {
    renderCompare({
      liveFitFilters: {
        fitPresets: new Set<LiveFitPresetId>(["cool-summers", "dry-air"]),
        maxSummerHighC: 22,
        maxFireRisk: "elevated",
      },
    });

    const lens = screen.getByLabelText("What the scores are based on");
    expect(lens).toHaveTextContent("What the scores use");
    expect(lens).toHaveTextContent("Fit scores here use Cool summers and Dry air");
    expect(lens).toHaveTextContent("summer ≤ 72°F");
    expect(lens).toHaveTextContent("fire ≤ elevated");
    expect(lens).toHaveTextContent(/present-day normals/i);
    expect(lens).toHaveTextContent("for narrowing a list");
  });

  it("keeps default present-day Compare free of the scoring lens receipt", () => {
    renderCompare();

    expect(screen.queryByLabelText("What the scores are based on")).not.toBeInTheDocument();
  });

  it("shows a scenario honesty banner when comparing under a future climate layer", () => {
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          scenario="ssp585"
        />
      </UnitProvider>,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/SSP5-8.5/);
    expect(screen.getByRole("note")).toHaveTextContent(/Place profiles always show recent averages/);
    expect(screen.getByLabelText("What the scores are based on")).toHaveTextContent(/SSP5-8.5/);
  });

  it("omits the scenario banner for present-day compare", () => {
    render(
      <UnitProvider>
        <CompareView
          places={PLACES.slice(0, 2)}
          open
          onClose={() => undefined}
          onRemove={() => undefined}
          scenario="now"
        />
      </UnitProvider>,
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("shows home-base delta strips and an add-home CTA when a baseline is set", () => {
    const home = PLACES_BY_ID["santa-barbara-ca"]!;
    const places = PLACES.filter(place => place.id !== home.id).slice(0, 2);
    const onAddPlace = vi.fn();
    renderCompare({
      places,
      homePlace: home,
      onAddPlace,
    });

    expect(screen.getAllByText(/Vs home/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: `Add your home base, ${home.name}, to the comparison` }));
    expect(onAddPlace).toHaveBeenCalledWith(home.id);
  });

  it("marks the compare dialog occluded when stacked above another overlay", () => {
    renderCompare({ occluded: true, places: PLACES.slice(0, 2) });
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the SSP2-4.5 scenario banner and scoring lens receipt", () => {
    renderCompare({ scenario: "ssp245", places: PLACES.slice(0, 2) });
    expect(screen.getByRole("note")).toHaveTextContent(/SSP2-4.5/);
    expect(screen.getByLabelText("What the scores are based on")).toHaveTextContent(/SSP2-4.5/);
  });
});
