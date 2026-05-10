import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import type { FilterState } from "../scoring";
import {
  buildCommercialLead,
  describeCommercialFilters,
  selectCommercialShortlist,
  TERRACLIMA_SALES_EMAIL,
} from "../commercial";

const sequim = PLACES_BY_ID["sequim-wa"];
const portTownsend = PLACES_BY_ID["port-townsend-wa"];
const gunnison = PLACES_BY_ID["gunnison-co"];

const filters: FilterState = {
  countries: new Set(["USA"]),
  archetypes: new Set(["cool-summer-maritime"]),
  fitPresets: new Set(["cool-summers", "quiet-small-town"]),
  search: "cool coast",
  maxSummerHighC: 22,
  minWinterLowC: -5,
  minGrowability: 65,
  maxFireRisk: "moderate",
  maxOverallRisk: "elevated",
};

describe("commercial helpers", () => {
  it("prefers saved compare places before ranked places", () => {
    const shortlist = selectCommercialShortlist(
      [
        { place: sequim, score: 99 },
        { place: portTownsend, score: 97 },
      ],
      [gunnison, sequim],
      3,
    );

    expect(shortlist.map(place => place.id)).toEqual(["gunnison-co", "sequim-wa", "port-townsend-wa"]);
  });

  it("summarizes commercial filters in a stable order", () => {
    expect(describeCommercialFilters(filters, "Live-here fit")).toEqual([
      "Ranking lens: Live-here fit",
      "Live Finder presets: Cool summers, Quiet / small-town",
      "Countries: USA",
      "Archetypes: cool-summer-maritime",
      "Search: cool coast",
      "Mean summer high cap: <= 22C",
      "Mean winter low floor: >= -5C",
      "Growability floor: 65+",
      "Wildfire ceiling: moderate",
      "Overall risk ceiling: elevated",
    ]);
  });

  it("builds a deterministic static-safe mailto lead", () => {
    const lead = buildCommercialLead({
      ranked: [
        { place: sequim, score: 99 },
        { place: portTownsend, score: 97 },
      ],
      filters,
      rankingLabel: "Live-here fit",
      appUrl: "https://raw.githack.com/sauterreed24/terraclima/static-preview/index.html?r=live-fit",
      offerId: "relocation-deep-brief",
    });

    expect(lead.offer.price).toBe("$149");
    expect(lead.subject).toBe("Terraclima Relocation Deep Brief request");
    expect(lead.body).toContain("I want to start the Relocation Deep Brief ($149).");
    expect(lead.body).toContain("1. Sequim -");
    expect(lead.body).toContain("Current Terraclima URL:");
    expect(lead.mailtoHref).toMatch(new RegExp(`^mailto:${TERRACLIMA_SALES_EMAIL}\\?subject=`));
    expect(decodeURIComponent(lead.mailtoHref)).toContain("screening-grade climate intelligence");
  });
});
