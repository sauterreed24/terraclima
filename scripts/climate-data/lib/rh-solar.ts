/**
 * Relative humidity and solar-energy derivations from Daymet daily fields.
 *
 * RH: Magnus/Tetens saturation vapor pressure with daily mean temperature,
 * using Daymet vapor pressure (Pa). Labeled “estimated from vapor pressure”.
 *
 * Solar energy (MJ/m²/day): srad (W/m²) × dayl (s) / 1_000_000.
 */

export interface RhEstimate {
  rhPct: number;
  flaggedImpossibleInput: boolean;
  flagReason?: string;
}

/** Saturation vapor pressure in Pa from temperature °C (Magnus formulary). */
export function saturationVaporPressurePa(tempC: number): number {
  // es(T) = 610.94 * exp(17.625 * T / (T + 243.04))  → Pa
  return 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
}

/**
 * Estimate daily mean RH (%) from Daymet vp (Pa) and mean temperature.
 * Impossible inputs are flagged before clamping to [0, 100].
 */
export function relativeHumidityFromVp(
  vpPa: number,
  tmeanC: number,
): RhEstimate {
  let flaggedImpossibleInput = false;
  let flagReason: string | undefined;

  if (!Number.isFinite(vpPa) || !Number.isFinite(tmeanC)) {
    return {
      rhPct: Number.NaN,
      flaggedImpossibleInput: true,
      flagReason: "non-finite vp or temperature",
    };
  }
  if (vpPa < 0) {
    flaggedImpossibleInput = true;
    flagReason = "negative vapor pressure";
  }

  const es = saturationVaporPressurePa(tmeanC);
  if (!(es > 0) || !Number.isFinite(es)) {
    return {
      rhPct: Number.NaN,
      flaggedImpossibleInput: true,
      flagReason: "invalid saturation vapor pressure",
    };
  }

  let rh = (vpPa / es) * 100;
  if (!Number.isFinite(rh)) {
    return {
      rhPct: Number.NaN,
      flaggedImpossibleInput: true,
      flagReason: "non-finite RH",
    };
  }
  if (rh < 0 || rh > 100) {
    flaggedImpossibleInput = true;
    flagReason = flagReason ?? `RH outside 0–100 before clamp (${rh.toFixed(2)})`;
  }
  rh = Math.max(0, Math.min(100, rh));
  return { rhPct: rh, flaggedImpossibleInput, flagReason };
}

/** Daily solar energy in MJ/m²/day from Daymet srad (W/m²) and dayl (s). */
export function solarEnergyMjM2Day(sradWm2: number, daylSec: number): number {
  if (!Number.isFinite(sradWm2) || !Number.isFinite(daylSec) || sradWm2 < 0 || daylSec < 0) {
    return Number.NaN;
  }
  return (sradWm2 * daylSec) / 1_000_000;
}
