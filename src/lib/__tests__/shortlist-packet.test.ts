import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { buildShortlistPacketCue } from "../shortlist-packet";

function place(id: string) {
  const found = PLACES_BY_ID[id];
  if (!found) throw new Error(`Missing test place ${id}`);
  return found;
}

describe("buildShortlistPacketCue", () => {
  it("returns no cue until a shortlist can be compared", () => {
    expect(buildShortlistPacketCue([])).toBeNull();
    expect(buildShortlistPacketCue([place("sequim-wa")])).toBeNull();
  });

  it("turns saved finalists into a compact decision cue", () => {
    const cue = buildShortlistPacketCue([
      place("sequim-wa"),
      place("port-townsend-wa"),
      place("portal-az"),
    ]);

    expect(cue).not.toBeNull();
    expect(cue?.compareIds).toEqual(["sequim-wa", "port-townsend-wa", "portal-az"]);
    expect(cue?.primary.name.length).toBeGreaterThan(0);
    expect(cue?.primaryScore).toBeGreaterThan(0);
    expect(cue?.summary).toContain("first finalist");
    expect(cue?.watch.length).toBeGreaterThan(12);
  });

  it("keeps the Compare cap honest while preserving pinned order", () => {
    const cue = buildShortlistPacketCue([
      place("boulder-co"),
      place("cody-wy"),
      place("durango-co"),
      place("ellensburg-wa"),
      place("flagstaff-az"),
    ], 4);

    expect(cue?.compareIds).toEqual(["boulder-co", "cody-wy", "durango-co", "ellensburg-wa"]);
    expect(cue?.summary).not.toContain("Flagstaff");
  });
});
