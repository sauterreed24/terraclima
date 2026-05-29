import { describe, expect, it } from "vitest";
import { PLACES } from "../../data/places";
import { draftLiveSignals } from "../../../scripts/lib/draft-live-signals";

describe("draft live signals", () => {
  it("returns three axes and a note for every place", () => {
    for (const place of PLACES.slice(0, 30)) {
      const draft = draftLiveSignals(place);
      expect(draft.costPressure).toBeGreaterThanOrEqual(0);
      expect(draft.costPressure).toBeLessThanOrEqual(100);
      expect(draft.socialStress).toBeGreaterThanOrEqual(0);
      expect(draft.accessFriction).toBeGreaterThanOrEqual(0);
      expect(draft.note.length).toBeGreaterThan(48);
      expect(draft.sources.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("grades remote places with higher access friction", () => {
    const nome = PLACES.find(p => p.id === "nome-ak")!;
    const draft = draftLiveSignals(nome);
    expect(draft.accessFriction).toBeGreaterThan(60);
  });

  it("grades major metros with higher cost pressure", () => {
    const honolulu = PLACES.find(p => p.id === "honolulu-hi")!;
    const draft = draftLiveSignals(honolulu);
    expect(draft.costPressure).toBeGreaterThan(70);
  });
});
