import type { Place } from "../../types";
import { MONTHS } from "../../types";

interface Props { place: Place }

/**
 * Month × comfort matrix: evaluates each month on a simple 0..4 comfort
 * scale combining mean daytime temperature, humidity, and extremes.
 * Not meant as a scientific index — a glanceable seasonal read.
 */
export function ComfortMatrix({ place }: Props) {
  const scores = MONTHS.map((_, i) => scoreMonth(place, i));
  const cellW = 38, cellH = 28;
  const W = 12 * cellW + 30;
  return (
    <svg viewBox={`0 0 ${W} ${cellH + 26}`} className="w-full h-auto">
      {scores.map((s, i) => (
        <g key={i} transform={`translate(${i * cellW + 20}, 0)`}>
          <rect width={cellW - 3} height={cellH} rx="4" fill={colorFor(s)} />
          <text x={(cellW - 3) / 2} y={cellH + 16} fontSize="10" fill="#8a99ac" textAnchor="middle" fontFamily="Inter">
            {MONTHS[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function scoreMonth(p: Place, i: number): number {
  const hi = p.climate.tempHighC[i];
  const lo = p.climate.tempLowC[i];
  const hum = p.climate.humidity?.[i] ?? 65;

  // Base: 0..4, 4 = ideal (mild day, cool night, moderate humidity)
  let s = 4;
  // Heat penalty
  if (hi > 30) s -= Math.min(2, (hi - 30) * 0.2);
  if (hi > 35) s -= 1;
  // Cold penalty
  if (hi < 5) s -= Math.min(2, (5 - hi) * 0.2);
  if (lo < -15) s -= 1;
  // Humidity penalty
  if (hum > 80 && hi > 25) s -= 1;
  if (hum < 20 && hi > 30) s -= 0.5;
  // Bonus for sweet spot
  if (hi >= 18 && hi <= 26 && lo >= 8 && lo <= 16) s += 0.4;

  return Math.max(0, Math.min(4, s));
}

function colorFor(s: number): string {
  // 0 harsh → 4 ideal. Blend between palette stops.
  if (s >= 3.4) return "#7ea182";
  if (s >= 2.8) return "#b9cdb4";
  if (s >= 2.2) return "#e6c990";
  if (s >= 1.5) return "#d48c66";
  return "#8b3f22";
}
