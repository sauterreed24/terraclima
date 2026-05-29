import { describe, expect, it } from "vitest";
import { PLACES, PLACES_BY_ID } from "../../data/places";
import { buildGeospatialAnalysis } from "../geospatial-analysis";
import { computeBioclim } from "../bioclim";
import { scoreLivability } from "../livability-score";
import {
  composeAgricultureIntro,
  composeAtAGlanceIntro,
  composeBioclimIntro,
  composeClimateIntro,
  composeCorpusIntro,
  composeDeepDossierIntro,
  composeGeospatialIntro,
  composeLiveSignalsIntro,
  composeLivabilityIntro,
  composePracticalReadIntro,
  composeRiskIntro,
  composeTourismIntro,
} from "../dossier-intros";

describe("dossier intros", () => {
  it("returns non-empty place-specific agriculture intros for every place", () => {
    for (const place of PLACES) {
      const intro = composeAgricultureIntro(place);
      expect(intro.length).toBeGreaterThan(40);
      expect(intro).toContain(place.name.split("(")[0]!.trim());
    }
  });

  it("returns non-empty climate intros for every place", () => {
    for (const place of PLACES) {
      const intro = composeClimateIntro(place);
      expect(intro.length).toBeGreaterThan(40);
      expect(intro).toContain(place.koppen);
    }
  });

  it("returns non-empty lived-read intros for every place", () => {
    for (const place of PLACES) {
      const geo = buildGeospatialAnalysis(place);
      expect(composeAtAGlanceIntro(place).length).toBeGreaterThan(40);
      expect(composePracticalReadIntro(place, geo).length).toBeGreaterThan(40);
      expect(composeTourismIntro(place).length).toBeGreaterThan(40);
      expect(composeLivabilityIntro(place, scoreLivability(place)).length).toBeGreaterThan(40);
      expect(composeDeepDossierIntro(place, place.deepSections?.length ?? 0, true).length).toBeGreaterThan(40);
    }
  });

  it("returns live signals intros when present", () => {
    const withSignals = PLACES.find(p => p.liveSignals);
    expect(withSignals).toBeTruthy();
    const intro = composeLiveSignalsIntro(withSignals!);
    expect(intro.length).toBeGreaterThan(40);
  });

  it("returns non-empty geospatial intros tied to relief context", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    const geo = buildGeospatialAnalysis(place);
    const intro = composeGeospatialIntro(place, geo);
    expect(intro).toContain("Sequim");
    expect(intro).toContain(String(geo.geospatialSignalScore));
  });

  it("returns bioclim intros with MAT and Köppen", () => {
    const place = PLACES_BY_ID["sequim-wa"];
    const bio = computeBioclim(place)!;
    const intro = composeBioclimIntro(place, bio);
    expect(intro).toContain("Sequim");
    expect(intro).toContain(place.koppen);
  });

  it("returns corpus intros with atlas context", () => {
    const intro = composeCorpusIntro(PLACES_BY_ID["sequim-wa"], PLACES.length);
    expect(intro.toLowerCase()).toContain("sequim");
    expect(intro).toContain(String(PLACES.length - 1));
  });

  it("returns risk intros referencing outlook", () => {
    const intro = composeRiskIntro(PLACES_BY_ID["key-west-fl"]);
    expect(intro.length).toBeGreaterThan(40);
    expect(intro.toLowerCase()).toContain("key west");
  });
});
