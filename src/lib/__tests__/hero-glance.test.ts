import { describe, expect, it } from "vitest";
import { PLACES_BY_ID } from "../../data/places";
import { fourthHeroStat, observedSunnyDaysPerYear, precipHeroLabel } from "../hero-glance";
import { makeClimate, makePlace } from "./test-fixtures";

describe("hero glance", () => {
  it("estimates sunny days only from percent-of-possible sunshine", () => {
    const withSun = makePlace({
      climate: makeClimate({
        sunshinePct: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
        solarEnergyMjM2Day: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      }),
    });
    expect(observedSunnyDaysPerYear(withSun)).toBe(183);

    const solarOnly = makePlace({
      climate: makeClimate({
        sunshinePct: undefined,
        solarEnergyMjM2Day: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      }),
    });
    expect(observedSunnyDaysPerYear(solarOnly)).toBeNull();
    expect(fourthHeroStat(solarOnly).kind).toBe("humidity");
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

  it("serves Sequim sunny days on the first-page quartet", () => {
    const sequim = fourthHeroStat(PLACES_BY_ID["sequim-wa"]);
    expect(sequim.kind).toBe("sunny-days");
    expect(sequim.label).toBe("Sunny days");
    expect(sequim.value).toMatch(/^\d+ days$/);
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
    expect(fourth.label).toBe("Growing season");
    expect(fourth.value).toBe("210 days");
  });
});
