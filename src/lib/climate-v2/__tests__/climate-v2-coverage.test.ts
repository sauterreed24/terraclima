import { describe, expect, it } from "vitest";
import { PLACES } from "../../../data/places";
import {
  CLIMATE_V2_DATA_THROUGH_YEAR,
  CLIMATE_V2_OVERLAY_BY_ID,
  CLIMATE_V2_PLACE_IDS,
  loadClimateV2Records,
} from "../../../data/generated/climate-v2";

const SNAPSHOT_IDS = [
  "sequim-wa",
  "lethbridge-ab",
  "real-catorce-mx",
  "cuernavaca-mx",
  "prince-rupert-bc",
  "death-valley-ca",
  "hilo-hi",
  "iqaluit-nu",
] as const;

describe("Climate Data V2 coverage", () => {
  it("publishes the same core values and validation status as the provenance records", async () => {
    const records = await loadClimateV2Records();
    for (const place of PLACES) {
      const record = records[place.id]!;
      const overlay = CLIMATE_V2_OVERLAY_BY_ID[place.id]!;
      const recent = record.periods["rolling-1996-2025"];
      expect(overlay.validationStatus, place.id).toBe(record.validation.status);
      for (const key of ["tempHighC", "tempLowC", "precipMm", "humidity", "annualPrecipMm", "frostFreeDays", "gdd10", "solarEnergyMjM2Day"] as const) {
        expect(overlay.climate[key], `${place.id}: ${key}`).toEqual(recent[key]);
      }
      for (const period of Object.values(record.periods)) {
        expect(period.tempHighC, place.id).toHaveLength(12);
        expect(period.tempLowC, place.id).toHaveLength(12);
        expect(period.precipMm, place.id).toHaveLength(12);
        for (let month = 0; month < 12; month++) {
          expect(period.tempHighC[month], place.id).toBeGreaterThanOrEqual(period.tempLowC[month]!);
          expect(period.precipMm[month], place.id).toBeGreaterThanOrEqual(0);
        }
        expect(period.precipMm.reduce((a, b) => a + b, 0), place.id).toBeCloseTo(period.annualPrecipMm, 0);
      }
    }
  });
  it("covers every place with generated 1996–2025 overlay normals", () => {
    expect(CLIMATE_V2_PLACE_IDS).toHaveLength(226);
    expect(PLACES).toHaveLength(226);
    expect(CLIMATE_V2_DATA_THROUGH_YEAR).toBe(2025);
    for (const p of PLACES) {
      const rec = CLIMATE_V2_OVERLAY_BY_ID[p.id];
      expect(rec, p.id).toBeTruthy();
      expect(rec!.climate.solarEnergyMjM2Day).toHaveLength(12);
      expect(rec!.climate.humidity).toHaveLength(12);
      const precipSum = rec!.climate.precipMm.reduce((a, b) => a + b, 0);
      expect(Math.abs(precipSum - rec!.climate.annualPrecipMm)).toBeLessThan(0.2);
      expect(p.climate.solarEnergyMjM2Day).toEqual(rec!.climate.solarEnergyMjM2Day);
      expect(p.climate.annualPrecipMm).toBe(rec!.climate.annualPrecipMm);
      expect(p.climateDataConfidence).toBeTruthy();
    }
  });

  it("has finite values and no template humidity/solar duplicates", () => {
    const hum = new Map<string, string[]>();
    const sol = new Map<string, string[]>();
    for (const id of CLIMATE_V2_PLACE_IDS) {
      const recent = CLIMATE_V2_OVERLAY_BY_ID[id]!.climate;
      const flat = JSON.stringify(recent);
      expect(flat).not.toMatch(/NaN|Infinity/);
      const hk = recent.humidity!.map(v => v.toFixed(2)).join(",");
      const sk = recent.solarEnergyMjM2Day!.map(v => v.toFixed(2)).join(",");
      hum.set(hk, [...(hum.get(hk) ?? []), id]);
      sol.set(sk, [...(sol.get(sk) ?? []), id]);
    }
    expect([...hum.values()].filter(g => g.length > 1)).toHaveLength(0);
    expect([...sol.values()].filter(g => g.length > 1)).toHaveLength(0);
  });

  it("snapshot anchors stay within physical bounds", () => {
    for (const id of SNAPSHOT_IDS) {
      const rec = CLIMATE_V2_OVERLAY_BY_ID[id];
      expect(rec, id).toBeTruthy();
      expect(rec!.climate.annualPrecipMm).toBeGreaterThan(0);
      expect(Math.max(...rec!.climate.tempHighC)).toBeLessThan(60);
      expect(Math.min(...rec!.climate.tempLowC)).toBeGreaterThan(-70);
      expect(rec!.recentShift).toBeTruthy();
    }
  });

  it("lazy full records retain WMO comparison + provenance", async () => {
    const byId = await loadClimateV2Records();
    expect(Object.keys(byId)).toHaveLength(226);
    const sequim = byId["sequim-wa"]!;
    expect(sequim.periods["rolling-1996-2025"].isWmoStandardNormal).toBe(false);
    expect(sequim.periods["wmo-1991-2020"].isWmoStandardNormal).toBe(true);
    expect(sequim.provenance.length).toBeGreaterThan(0);
    expect(sequim.sources["daymet-v4r1"]).toBeTruthy();
    for (const id of ["hood-river-gorge", "redfield-ny"] as const) {
      const rec = byId[id]!;
      expect(Math.abs(rec.elevationDeltaM)).toBeGreaterThan(250);
      expect(rec.anchor.overrideReason).toBeTruthy();
      expect(rec.validation.status).toBe("reviewed-exception");
    }
  });
});
