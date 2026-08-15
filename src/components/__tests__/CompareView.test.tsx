// @vitest-environment jsdom
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { buildCompareDecisionProfiles, compareLensScore } from "../../lib/compare-finalist-verdict";
import type { CompareCandidate, ComparisonLensId } from "../../lib/compare-workbench";
import type { LiveFitFilters, LiveFitPresetId } from "../../lib/live-fit";
import { UnitProvider } from "../../lib/units";
import type { Place } from "../../types";
import { CompareView } from "../CompareView";

const CANDIDATE_SEARCH_LABEL = "Find Workbench candidates by name, region, source, or scouting note";

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
  onAddPlace?: (id: string) => void;
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

    const workbench = screen.getByLabelText("Compare workbench");
    expect(workbench).toHaveTextContent("Priority lens");
    expect(workbench).toHaveTextContent("Risk");
    expect(workbench).toHaveTextContent("4/4 active / 8 candidates");
    expect(screen.getByRole("button", { name: "Close comparison" })).toBeInTheDocument();

    const lens = screen.getByRole("group", { name: "Comparison priority lens" });
    expect(within(lens).getByRole("button", { name: "Risk" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(lens).getByRole("button", { name: "Garden" }));
    expect(onComparisonLensChange).toHaveBeenCalledWith("garden");

    expect(within(screen.getByLabelText("Candidate tray")).getAllByRole("button", { name: /active comparison/ })).toHaveLength(8);
    const activeCandidate = screen.getByRole("button", { name: `Remove ${PLACES[0].name} from active comparison` });
    expect(activeCandidate).toHaveAttribute("aria-pressed", "true");
    expect(activeCandidate).toHaveTextContent("Remove");
    fireEvent.click(activeCandidate);
    expect(onRemove).toHaveBeenCalledWith(PLACES[0].id);

    const swapCandidate = screen.getByRole("button", { name: `Swap ${PLACES[4].name} into active comparison` });
    expect(swapCandidate).toHaveTextContent("Swap");
    expect(swapCandidate).toHaveTextContent(`Replaces ${PLACES[0].name}`);
    expect(swapCandidate).toHaveAttribute("title", expect.stringContaining(`Replaces oldest active slot: ${PLACES[0].name}.`));
    fireEvent.click(screen.getByRole("button", { name: `Swap ${PLACES[4].name} into active comparison` }));
    expect(onAddPlace).toHaveBeenCalledWith(PLACES[4].id);
  });

  it("offers direct shortcuts to decision, evidence, differences, and candidates", () => {
    renderCompare();

    const shortcuts = screen.getByRole("navigation", { name: "Compare decision shortcuts" });
    const workbench = screen.getByLabelText("Compare workbench");

    expect(shortcuts.compareDocumentPosition(workbench) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(shortcuts).getByRole("link", { name: "Jump to Compare decision read" })).toHaveAttribute("href", "#compare-decision-read");
    expect(within(shortcuts).getByRole("link", { name: "Jump to Compare evidence readiness" })).toHaveAttribute("href", "#compare-evidence-readiness");
    expect(within(shortcuts).getByRole("link", { name: "Jump to Compare difference board" })).toHaveAttribute("href", "#compare-diff-board");
    expect(within(shortcuts).getByRole("link", { name: "Jump to Compare candidate workbench" })).toHaveAttribute("href", "#compare-candidates");
    expect(workbench).toHaveAttribute("id", "compare-candidates");
    expect(screen.getByLabelText("Comparison decision read")).toHaveAttribute("id", "compare-decision-read");
    expect(screen.getByLabelText("Evidence readiness")).toHaveAttribute("id", "compare-evidence-readiness");
    expect(screen.getByLabelText("Grouped comparison rows")).toHaveAttribute("id", "compare-diff-board");
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

    expect(screen.getByLabelText("Compare workbench")).toHaveTextContent("1/4 active / 2 candidates");
    const addCandidate = screen.getByRole("button", { name: `Add ${contrast.name} to active comparison` });
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

    const coach = screen.getByLabelText("Contrast coach");
    expect(coach).toHaveTextContent("Best swaps to learn faster");
    expect(coach).toHaveTextContent(/upgrade|contrast|counterweight|anchor/i);

    const recommendation = within(coach).getAllByRole("button", { name: /from Contrast coach/ })[0]!;
    expect(recommendation).toHaveAttribute("title", recommendation.getAttribute("aria-label"));
    fireEvent.click(recommendation);

    expect(onAddPlace).toHaveBeenCalledTimes(1);
    expect(PLACES.slice(0, 4).map(place => place.id)).not.toContain(onAddPlace.mock.calls[0][0]);
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
    expect(within(tray).getAllByRole("button", { name: /active comparison/ })).toHaveLength(7);

    expect(within(tray).getByRole("button", { name: "All" })).toHaveAttribute("title", "Show all compare candidates");
    expect(within(tray).getByRole("button", { name: "Recent" })).toHaveAttribute("title", "Show recent compare candidates");
    fireEvent.click(within(tray).getByRole("button", { name: "Recent" }));
    expect(within(tray).getAllByRole("button", { name: /active comparison/ })).toHaveLength(5);
    expect(within(tray).getByRole("button", { name: `Swap ${PLACES[5]!.name} into active comparison` })).toBeInTheDocument();
    expect(within(tray).queryByRole("button", { name: `Swap ${PLACES[4]!.name} into active comparison` })).not.toBeInTheDocument();
    expect(tray).toHaveTextContent("4/4 active / 1/3 match");
    expect(tray).toHaveTextContent("Active places stay pinned; finder matches appear after them.");

    fireEvent.change(within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL }), {
      target: { value: PLACES[5]!.region },
    });
    expect(within(tray).getByRole("button", { name: `Swap ${PLACES[5]!.name} into active comparison` })).toBeInTheDocument();
    expect(tray).toHaveTextContent("4/4 active / 1/3 match");

    fireEvent.click(within(tray).getByRole("button", { name: "Reset candidate finder to all sources" }));
    const resetSearch = within(tray).getByRole("searchbox", { name: CANDIDATE_SEARCH_LABEL });
    expect(resetSearch).toHaveValue("");
    expect(resetSearch).toHaveFocus();
    expect(within(tray).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(within(tray).getAllByRole("button", { name: /active comparison/ })).toHaveLength(7);
    expect(tray).toHaveTextContent("7 candidates");
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

    expect(tray).toHaveTextContent("4/4 active / 0/2 matches");
    expect(tray).toHaveTextContent("No finder matches outside the active set.");
    expect(within(tray).getByRole("button", { name: "Reset candidate finder to all sources" })).toBeInTheDocument();
    expect(within(tray).getAllByRole("button", { name: /active comparison/ })).toHaveLength(4);
    expect(within(tray).queryByRole("button", { name: /Swap .* into active comparison/ })).not.toBeInTheDocument();
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
    const select = within(tray).getByRole("combobox", { name: "Sort Workbench candidates" });
    const sortedProfiles = buildCompareDecisionProfiles(candidates.map(candidate => candidate.place))
      .sort((a, b) => compareLensScore(b, "risk") - compareLensScore(a, "risk") || a.place.name.localeCompare(b.place.name));
    const topProfile = sortedProfiles[0]!;

    fireEvent.change(select, { target: { value: "lens" } });

    const inactiveButtons = within(tray).getAllByRole("button", { name: /Swap .* into active comparison/ });
    expect(inactiveButtons[0]).toHaveAttribute("aria-label", `Swap ${topProfile.place.name} into active comparison`);
    expect(inactiveButtons[0]).toHaveTextContent(`${compareLensScore(topProfile, "risk")}/100`);
    expect(inactiveButtons[0]).toHaveTextContent("Risk");
    expect(inactiveButtons[0]).toHaveTextContent(`${topProfile.easyMonths}/12 easy months`);
    expect(inactiveButtons[0]).toHaveTextContent(`${topProfile.riskLoad}/100 risk load`);
    const insight = within(inactiveButtons[0]).getByLabelText(`${topProfile.place.name} swap insight`);
    expect(insight).toHaveTextContent(/upgrade|contrast|anchor|counterweight|near leader|keep warm/i);
    expect(insight.textContent?.length ?? 0).toBeGreaterThan(24);
  });

  it("groups practical comparison rows and can hide matching signals", () => {
    renderCompare();

    const table = screen.getByRole("table", { name: "Grouped comparison signals for active places" });
    expect(table).toHaveTextContent("Comfort");
    expect(table).toHaveTextContent("Seasonality");
    expect(table).toHaveTextContent("Hazards");
    expect(table).toHaveTextContent("Lived friction");
    expect(table).toHaveTextContent("Access/cost");
    expect(table).toHaveTextContent("Garden/land");
    expect(table).toHaveTextContent("Evidence");
    expect(table).toHaveTextContent("HTTPS citations");
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
    expect(screen.getByText("Top livability")).toBeInTheDocument();
    expect(screen.getByText("Lowest risk load")).toBeInTheDocument();
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
      expect(button).toHaveAttribute("aria-label", expect.stringMatching(/^Open .+ profile from comparison highlight: .+/));
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

    const decisionRead = screen.getByLabelText("Comparison decision read");
    expect(decisionRead).toBeInTheDocument();
    expect(within(decisionRead).getByText("Decision read")).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(screen.getByText("Broadest fit")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Comparison decision read")).getByText("Lowest risk")).toBeInTheDocument();
    expect(screen.getByText("Comfort leader")).toBeInTheDocument();
    expect(screen.getByText("Garden edge")).toBeInTheDocument();
    expect(screen.getByLabelText("Finalist decision table")).toBeInTheDocument();
    expect(screen.getByText("Finalist table")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Visit")).toBeInTheDocument();
    expect(screen.getByText("Watch first")).toBeInTheDocument();
    expect(screen.getByText("Start here")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence readiness")).toBeInTheDocument();
    const scoutSequence = screen.getByLabelText("Scouting sequence");
    expect(scoutSequence).toBeInTheDocument();
    expect(screen.getByText("Scout sequence")).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Start here/)).toBeInTheDocument();
    expect(within(scoutSequence).getByText(/Counterweight/)).toBeInTheDocument();
    const checklist = screen.getByLabelText("Scout verification checklist");
    expect(checklist).toHaveTextContent("Scout verification checklist");
    expect(checklist).toHaveTextContent("Scout window");
    expect(checklist).toHaveTextContent("Tradeoff check");
    expect(checklist).toHaveTextContent("Hazard check");
    expect(checklist).toHaveTextContent("Daily-life friction");
    expect(checklist).toHaveTextContent("Source gap");
    expect(checklist).toHaveTextContent("What to prove before booking a visit");

    fireEvent.click(screen.getByRole("button", { name: "Copy or share comparison link" }));
    expect(onCopyView).toHaveBeenCalledTimes(1);
    const firstDossier = screen.getByRole("button", { name: /Open first dossier:/ });
    expect(firstDossier).toHaveAttribute("title", firstDossier.getAttribute("aria-label"));
    fireEvent.click(firstDossier);
    expect(onOpenPlace).toHaveBeenCalledTimes(1);
    const scoutStep = screen.getByRole("button", { name: /from scouting sequence: Start here/ });
    expect(scoutStep).toHaveAttribute("title", scoutStep.getAttribute("aria-label"));
    fireEvent.click(scoutStep);
    expect(onOpenPlace).toHaveBeenCalledTimes(2);
    const checklistItem = within(checklist).getAllByRole("button", { name: /from scout verification checklist/ })[0]!;
    expect(checklistItem).toHaveAttribute("title", checklistItem.getAttribute("aria-label"));
    fireEvent.click(checklistItem);
    expect(onOpenPlace).toHaveBeenCalledTimes(3);
    const finalist = screen.getAllByRole("button", { name: /from finalist decision table/ })[0]!;
    expect(finalist).toHaveAttribute("title", finalist.getAttribute("aria-label"));
    fireEvent.click(finalist);
    expect(onOpenPlace).toHaveBeenCalledTimes(4);
  });

  it("distinguishes native share success from clipboard copy feedback", () => {
    renderCompare({ onCopyView: vi.fn(), shareStatus: "shared" });

    expect(screen.getByRole("button", { name: "Copy or share comparison link" })).toHaveTextContent("Shared");
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("keeps a selectable comparison URL in the dialog when copy fails", async () => {
    const fallbackUrl = "https://terraclima.example/?cmp=morelia-mx,oaxaca-mx&temp=C&dist=metric";

    renderCompare({ onCopyView: vi.fn(), shareStatus: "failed", shareFallbackUrl: fallbackUrl });

    expect(screen.getByRole("button", { name: "Retry copy or use the selected manual comparison URL" })).toHaveTextContent(
      "Manual copy",
    );
    const fallbackGroup = screen.getByRole("group", { name: "Manual comparison share link" });
    const fallbackInput = within(fallbackGroup).getByRole("textbox", {
      name: "Shareable comparison URL for manual copy",
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

    const readiness = screen.getByLabelText("Evidence readiness");
    expect(readiness).toHaveTextContent("Thin Evidence Test: Thin read - source first");
    expect(readiness).toHaveTextContent("0 HTTPS sources");
    expect(readiness).toHaveTextContent("Low confidence profile");
    expect(readiness).toHaveTextContent("Add a second HTTPS source");
    expect(readiness).toHaveTextContent("Fill lived-friction signals");

    const evidenceButton = within(readiness).getByRole("button", { name: "Open Thin Evidence Test dossier from evidence readiness" });
    expect(evidenceButton).toHaveAttribute("title", "Open Thin Evidence Test dossier from evidence readiness");
    fireEvent.click(evidenceButton);
    expect(onOpenPlace).toHaveBeenCalledWith("thin-evidence-test", { trigger: evidenceButton });
  });

  it("renders one finalist decision table row per compared place", () => {
    renderCompare({ onOpenPlace: vi.fn() });

    const table = screen.getByRole("table", { name: "Decision table for saved compare finalists" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(PLACES.slice(0, 4).length + 1);
    for (const place of PLACES.slice(0, 4)) {
      expect(within(table).getByRole("button", { name: `Open ${place.name} from finalist decision table` })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Single finalist compare setup")).toBeInTheDocument();
    expect(screen.getByText("Shortlist setup")).toBeInTheDocument();
    expect(screen.getByText(/is saved as the anchor finalist/)).toBeInTheDocument();
    expect(screen.getByText(/Add a peer or counterweight/)).toBeInTheDocument();
    expect(screen.getByText("Anchor signal")).toBeInTheDocument();
    expect(screen.getByText("First contrast")).toBeInTheDocument();
    expect(screen.getByText("Counterweight")).toBeInTheDocument();
    expect(screen.queryByLabelText("Comparison decision read")).not.toBeInTheDocument();

    const reviewButton = screen.getByRole("button", { name: `Review anchor dossier: ${anchor.name}` });
    expect(reviewButton).toHaveAttribute("title", `Review anchor dossier: ${anchor.name}`);
    fireEvent.click(reviewButton);
    expect(onOpenPlace).toHaveBeenCalledWith(anchor.id, { trigger: reviewButton });
    fireEvent.click(screen.getByRole("button", { name: "Keep scouting" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows authored sunshine percent in Compare, never solar MJ as sky brightness", () => {
    const sequim = PLACES_BY_ID["sequim-wa"]!;
    const yuma = PLACES_BY_ID["yuma-az"]!;
    renderCompare({ places: [sequim, yuma] });

    const table = screen.getByRole("table", { name: "Grouped comparison signals for active places" });
    expect(table).toHaveTextContent("Sunshine");
    expect(table).toHaveTextContent("50%");
    expect(table).toHaveTextContent("92%");
    expect(table).not.toHaveTextContent("Solar resource");
    expect(table).not.toHaveTextContent(" MJ");
    expect(screen.getAllByText("Sunshine").length).toBeGreaterThan(0);
  });

  it("adds a compact mobile key for bioclimatic comparison rows", () => {
    renderCompare();

    expect(screen.getByText("Bioclim key")).toBeInTheDocument();
    expect(screen.getByText("annual aridity")).toBeInTheDocument();
    expect(screen.getByText("continentality")).toBeInTheDocument();
    expect(screen.getByText("growing-season moisture")).toBeInTheDocument();
    expect(screen.getByText("evaporative demand")).toBeInTheDocument();
    expect(screen.getByText("precipitation to PET")).toBeInTheDocument();
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

  it("explains the active comparison scoring lens when Live Finder filters shape Compare", () => {
    renderCompare({
      liveFitFilters: {
        fitPresets: new Set<LiveFitPresetId>(["cool-summers", "dry-air"]),
        maxSummerHighC: 22,
        maxFireRisk: "elevated",
      },
    });

    const lens = screen.getByLabelText("Comparison scoring lens");
    expect(lens).toHaveTextContent("Score lens");
    expect(lens).toHaveTextContent("Fit and finalist scores are being read through Cool summers and Dry air");
    expect(lens).toHaveTextContent("summer <= 72°F");
    expect(lens).toHaveTextContent("fire <= elevated");
    expect(lens).toHaveTextContent(/present-day normals/i);
    expect(lens).toHaveTextContent("screening lens");
  });

  it("keeps default present-day Compare free of the scoring lens receipt", () => {
    renderCompare();

    expect(screen.queryByLabelText("Comparison scoring lens")).not.toBeInTheDocument();
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
    expect(screen.getByRole("note")).toHaveTextContent(/Place dossiers still show recent observed normals/);
    expect(screen.getByLabelText("Comparison scoring lens")).toHaveTextContent(/SSP5-8.5/);
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
    expect(screen.getByLabelText("Comparison scoring lens")).toHaveTextContent(/SSP2-4.5/);
  });
});
