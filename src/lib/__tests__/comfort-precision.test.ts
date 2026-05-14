import { describe, expect, it } from "vitest";
import type { Monthly12 } from "../../types";
import {
  buildComfortPrecisionProfile,
  dewPointC,
  heatIndexC,
  wetBulbStullC,
} from "../comfort-precision";
import { makeClimate, makePlace } from "./test-fixtures";

const month = (value: number): Monthly12 => Array(12).fill(value) as Monthly12;

describe("comfort precision", () => {
  it("keeps mild heat index equal to air temperature outside the NWS heat-index range", () => {
    expect(heatIndexC(24, 70)).toBeCloseTo(24, 3);
  });

  it("raises apparent temperature when heat and humidity combine", () => {
    expect(heatIndexC(32, 70)).toBeGreaterThan(38);
  });

  it("computes dew point and wet-bulb approximations from temperature and humidity", () => {
    expect(dewPointC(25, 50)).toBeCloseTo(13.9, 1);
    expect(wetBulbStullC(30, 60)).toBeCloseTo(24.0, 1);
  });

  it("identifies humid hot months as worse than dry hot months", () => {
    const hotHumid = makePlace({
      climate: makeClimate({
        tempHighC: month(33),
        tempLowC: month(25),
        humidity: month(78),
        precipMm: month(80),
        snowCm: month(0),
      }),
    });
    const hotDry = makePlace({
      climate: makeClimate({
        tempHighC: month(33),
        tempLowC: month(16),
        humidity: month(24),
        precipMm: month(20),
        snowCm: month(0),
        diurnalSummerC: 17,
      }),
    });

    const humid = buildComfortPrecisionProfile(hotHumid);
    const dry = buildComfortPrecisionProfile(hotDry);

    expect(humid.peakMonth.apparentHighC).toBeGreaterThan(dry.peakMonth.apparentHighC);
    expect(humid.peakMonth.heatStressScore).toBeLessThan(dry.peakMonth.heatStressScore);
    expect(humid.sleepRecoveryMonth.sleepRecoveryScore).toBeLessThan(dry.sleepRecoveryMonth.sleepRecoveryScore);
  });

  it("infers humidity from measured climate analogs when local monthly humidity is absent", () => {
    const target = makePlace({
      id: "target",
      archetypes: ["rain-shadow-sanctuary", "orchard-valley"],
      climate: makeClimate({
        humidity: undefined,
        tempHighC: month(29),
        tempLowC: month(13),
        precipMm: month(28),
        annualPrecipMm: 336,
      }),
    });
    const analogs = [42, 46, 50].map((humidity, index) => makePlace({
      id: `analog-${index}`,
      name: `Analog ${index}`,
      archetypes: target.archetypes,
      drivers: target.drivers,
      elevationM: target.elevationM + index * 20,
      climate: makeClimate({
        humidity: month(humidity),
        tempHighC: month(29 + index * 0.2),
        tempLowC: month(13),
        precipMm: month(28 + index),
        annualPrecipMm: 336 + index * 12,
      }),
    }));

    const profile = buildComfortPrecisionProfile(target, { humidityAnalogPool: [target, ...analogs] });

    expect(profile.peakMonth.humiditySource).toBe("analog");
    expect(profile.peakMonth.humidityPct).toBeGreaterThan(42);
    expect(profile.peakMonth.humidityPct).toBeLessThan(50);
    expect(profile.humidityBasisNote).toContain("Analog 0");
    expect(profile.confidence).toBe("medium");
  });

  it("falls back to archetype humidity when analog evidence is unavailable", () => {
    const dry = makePlace({
      archetypes: ["rain-shadow-sanctuary"],
      climate: makeClimate({ humidity: undefined }),
    });

    const profile = buildComfortPrecisionProfile(dry, { humidityAnalogPool: [] });

    expect(profile.peakMonth.humiditySource).toBe("archetype");
    expect(profile.peakMonth.humidityPct).toBeLessThan(45);
    expect(profile.humidityBasisNote).toContain("archetype");
  });

  it("keeps a useful screening profile when humidity is absent", () => {
    const missing = makePlace({
      archetypes: [],
      climate: makeClimate({ humidity: undefined, sunshinePct: undefined }),
    });
    const profile = buildComfortPrecisionProfile(missing, { humidityAnalogPool: [] });
    expect(profile.confidence).toBe("screening");
    expect(profile.months).toHaveLength(12);
    expect(profile.peakMonth.humidityPct).toBeNull();
    expect(profile.annualUsableMonths).toBeGreaterThan(0);
  });
});
