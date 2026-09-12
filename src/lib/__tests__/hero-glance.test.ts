import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { fourthHeroStat, hasSourcedSkySeries, observedSunshinePct, precipHeroLabel, sunshineDisplayValue } from "../hero-glance";
import { makeClimate, makePlace } from "./test-fixtures";

describe("hero glance", () => {
  it("reports percent of possible sunshine, never Daymet solar as sky brightness", () => {
    const withSun = makePlace({
      climate: makeClimate({
        sunshinePct: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
        solarEnergyMjM2Day: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      }),
    });
    expect(observedSunshinePct(withSun)).toBe(50);
    expect(fourthHeroStat(withSun)).toMatchObject({
      kind: "sunshine",
      label: "Sunshine",
      value: "50%",
    });

    const solarOnly = makePlace({
      climate: makeClimate({
        sunshinePct: undefined,
        solarEnergyMjM2Day: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      }),
    });
    expect(observedSunshinePct(solarOnly)).toBeNull();
    expect(fourthHeroStat(solarOnly).kind).toBe("humidity");
    expect(hasSourcedSkySeries(withSun)).toBe(true);
    expect(hasSourcedSkySeries(solarOnly)).toBe(true);
    expect(sunshineDisplayValue(withSun)).toBe("50%");
    expect(sunshineDisplayValue(solarOnly)).toBe("not sourced");
    expect(hasSourcedSkySeries(makePlace({ climate: makeClimate({ sunshinePct: undefined, solarEnergyMjM2Day: undefined }) }))).toBe(false);
  });

  it("labels snowy places as rain and snow", () => {
    const snowy = makePlace({
      climate: makeClimate({ snowCm: [40, 30, 20, 5, 0, 0, 0, 0, 2, 10, 25, 40] }),
    });
    expect(precipHeroLabel(snowy)).toBe("Rain & snow");
    const dry = makePlace({
      climate: makeClimate({ snowCm: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    });
    expect(precipHeroLabel(dry)).toBe("Yearly rain");
  });

  it("serves Sequim sunshine on the first-page quartet", () => {
    const sequim = fourthHeroStat(PLACES_BY_ID["sequim-wa"]);
    expect(sequim.kind).toBe("sunshine");
    expect(sequim.label).toBe("Sunshine");
    expect(sequim.value).toMatch(/^\d+%$/);
  });

  it("falls back to growing season when humidity is ordinary and sunshine is missing", () => {
    const place = makePlace({
      climate: makeClimate({
        sunshinePct: undefined,
        humidity: [55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55],
        frostFreeDays: 210,
      }),
    });
    const fourth = fourthHeroStat(place);
    expect(fourth.kind).toBe("frost-free");
    expect(fourth.label).toBe("Non-freezing days");
    expect(fourth.value).toBe("210 days");
  });
});
