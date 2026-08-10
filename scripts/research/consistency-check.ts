/**
 * corpus:consistency:check — units, monthly lengths, precip totals, coords, ranks inputs.
 */
import { PLACES } from "../../src/data/places";
import { CLIMATE_V2_OVERLAY_BY_ID } from "../../src/data/generated/climate-v2";

const STRICT = process.argv.includes("--strict");

function main() {
  const errors: string[] = [];
  const warns: string[] = [];
  const ids = new Set<string>();

  for (const place of PLACES) {
    if (ids.has(place.id)) errors.push(`Duplicate place id ${place.id}`);
    ids.add(place.id);

    if (!Number.isFinite(place.lat) || place.lat < 7 || place.lat > 84) {
      errors.push(`${place.id}: lat out of North America range (${place.lat})`);
    }
    if (!Number.isFinite(place.lon) || place.lon > -50 || place.lon < -180) {
      errors.push(`${place.id}: lon out of North America range (${place.lon})`);
    }
    if (!Number.isFinite(place.elevationM) || place.elevationM < -100 || place.elevationM > 6500) {
      errors.push(`${place.id}: elevationM implausible (${place.elevationM})`);
    }

    const monthly = [
      place.climate.tempHighC,
      place.climate.tempLowC,
      place.climate.precipMm,
    ];
    for (const arr of monthly) {
      if (!arr || arr.length !== 12 || arr.some(v => !Number.isFinite(v))) {
        errors.push(`${place.id}: monthly climate array invalid`);
      }
    }
    if (place.climate.humidity && place.climate.humidity.length !== 12) {
      errors.push(`${place.id}: humidity length != 12`);
    }
    if (place.climate.solarEnergyMjM2Day && place.climate.solarEnergyMjM2Day.length !== 12) {
      errors.push(`${place.id}: solarEnergyMjM2Day length != 12`);
    }

    const monthlySum = place.climate.precipMm.reduce((a, b) => a + b, 0);
    if (place.climate.annualPrecipMm != null) {
      const delta = Math.abs(place.climate.annualPrecipMm - monthlySum);
      if (delta > 2.5) {
        errors.push(`${place.id}: annualPrecipMm ${place.climate.annualPrecipMm} != monthly sum ${monthlySum.toFixed(1)} (Δ=${delta.toFixed(1)})`);
      }
    }

    if (place.liveSignals?.socialStress != null) {
      errors.push(`${place.id}: socialStress must not be published`);
    }

    const overlay = CLIMATE_V2_OVERLAY_BY_ID[place.id];
    if (!overlay) {
      errors.push(`${place.id}: missing Climate V2 overlay`);
    } else if (overlay.projectionStatus === "unavailable" && place.projection) {
      // Authored projection overrides are allowed; generated NEX may still be unavailable.
      warns.push(`${place.id}: authored projection present while V2 projectionStatus=unavailable`);
    }

    for (const key of Object.keys(place.scores) as (keyof typeof place.scores)[]) {
      const v = place.scores[key];
      if (v < 0 || v > 100) errors.push(`${place.id}: score ${key}=${v} out of 0..100`);
    }
  }

  if (PLACES.length !== 226) errors.push(`Expected 226 places, found ${PLACES.length}`);
  const v2Count = Object.keys(CLIMATE_V2_OVERLAY_BY_ID).length;
  if (v2Count !== 226) errors.push(`Climate V2 overlay count ${v2Count} != 226`);

  console.log(`corpus:consistency:check — places=${PLACES.length} mode=${STRICT ? "strict" : "bootstrap"}`);
  console.log(`errors=${errors.length} warnings=${warns.length}`);
  for (const e of errors.slice(0, 80)) console.log(`[error] ${e}`);
  for (const w of warns.slice(0, 40)) console.log(`[warn] ${w}`);
  if (errors.length) process.exit(1);
}

main();
