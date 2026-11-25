import { formatHomeDeltaValue, type HomeDeltaSignal } from "../../lib/home-base";
import { fmtDelta, type DistUnit, type TempUnit } from "../../lib/units";

/** Shown instead of a number when a difference rounds to zero. */
export const HOME_DELTA_SAME = "about the same";

/**
 * Home-base delta as shown in the interface: whole degrees for temperature
 * ("+15°F", not "+14.8°F") and overall risk on the same 0–100 scale every
 * other surface uses ("−16 risk pts", not "−0.8 / 5"). Other units pass
 * through the shared formatter. A difference that rounds to zero in the
 * reader's unit reads "about the same", never "+0°F", "-0" or "+0%".
 */
export function formatHomeDelta(signal: HomeDeltaSignal, temp: TempUnit, dist: DistUnit): string {
  let text: string;
  if (signal.unit === "C") {
    text = fmtDelta(signal.delta, temp, { digits: 0 });
  } else if (signal.unit === "risk") {
    const points = Math.round(signal.delta * 20);
    text = `${points > 0 ? "+" : ""}${points} pts`;
  } else {
    text = formatHomeDeltaValue(signal, temp, dist);
  }
  // No non-zero digit means the rounded difference is zero.
  return /[1-9]/.test(text) ? text : HOME_DELTA_SAME;
}
