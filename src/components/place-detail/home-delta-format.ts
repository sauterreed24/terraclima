import { formatHomeDeltaValue, type HomeDeltaSignal } from "../../lib/home-base";
import { fmtDelta, type DistUnit, type TempUnit } from "../../lib/units";

/**
 * Home-base delta as shown in the interface: whole degrees for temperature
 * ("+15°F", not "+14.8°F") and overall risk on the same 0–100 scale every
 * other surface uses ("−16 risk pts", not "−0.8 / 5"). Other units pass
 * through the shared formatter unchanged.
 */
export function formatHomeDelta(signal: HomeDeltaSignal, temp: TempUnit, dist: DistUnit): string {
  if (signal.unit === "C") return fmtDelta(signal.delta, temp, { digits: 0 });
  if (signal.unit === "risk") {
    const points = Math.round(signal.delta * 20);
    return `${points > 0 ? "+" : ""}${points} pts`;
  }
  return formatHomeDeltaValue(signal, temp, dist);
}
