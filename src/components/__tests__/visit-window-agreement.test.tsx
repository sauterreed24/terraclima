// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { UnitProvider } from "../../lib/units";
import { formatVisitWindow, getBestMonths, getVisitWindow, pickVisitWindow } from "../../lib/best-months";
import { getClimateTourismProfile } from "../../lib/climate-tourism";
import { buildCompareDecisionProfiles, buildCompareDecisionRead } from "../../lib/compare-finalist-verdict";
import { buildExplorerScoutBrief } from "../../lib/explorer-scout-brief";
import { PlaceCard } from "../PlaceCard";

afterEach(() => cleanup());

const IDS = ["sequim-wa", "boulder-co", "oaxaca-mx"] as const;

/**
 * "When is the best time to visit?" must get one answer per place. Sequim's
 * card used to say outdoor comfort Apr–Oct while Compare and the visit plan
 * quoted the gardening window, and Boulder showed two different month ranges.
 */
describe("best-season agreement across card, profile, Compare and visit plan", () => {
  const places = IDS.map(id => PLACES_BY_ID[id]!);
  const compareRead = buildCompareDecisionRead(buildCompareDecisionProfiles(places))!;

  it.each(IDS)("%s shows one primary window everywhere", id => {
    const place = PLACES_BY_ID[id]!;
    const expected = getVisitWindow(place)!;
    expect(expected).not.toBeNull();
    const line = formatVisitWindow(expected);

    // Card
    const { container } = render(
      <UnitProvider>
        <PlaceCard place={place} onOpenPlace={() => undefined} />
      </UnitProvider>,
    );
    const pill = container.querySelector(".best-window-pill")!;
    expect(pill.textContent).toContain(expected.label);
    expect(pill.textContent).toContain(expected.range);

    // Profile: the residency brief ("Best season") and the visit read
    expect(pickVisitWindow(getBestMonths(place))).toEqual(expected);
    const tourism = getClimateTourismProfile(place).bestVisitWindow;
    expect(`${tourism.label}: ${tourism.range}`).toBe(line);

    // Compare: decision table Visit column and the visit-order steps
    expect(compareRead.tableRows.find(row => row.place.id === id)!.visitWindow).toBe(line);
    for (const step of compareRead.scoutSequence.filter(s => s.place.id === id)) {
      expect(step.visitWindow).toBe(line);
    }

    // Explorer visit-next step
    const brief = buildExplorerScoutBrief([{ place, score: 80, note: "" }], "Test rank")!;
    expect(brief.nextStep.action).toContain(expected.label.toLowerCase());
    expect(brief.nextStep.action).toContain(expected.range);
  });

  it("leads with outdoor comfort, not the gardening window, for Sequim", () => {
    expect(getVisitWindow(PLACES_BY_ID["sequim-wa"]!)!.id).toBe("outdoor");
  });

  it("lets a ranking about another window lead with that window", () => {
    expect(getVisitWindow(PLACES_BY_ID["sequim-wa"]!, "F", "garden")!.id).toBe("garden");
  });
});
