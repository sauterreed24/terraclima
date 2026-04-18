import type { Place } from "../../types";
import { MONTHS } from "../../types";

interface Props { place: Place }

/**
 * Month × comfort matrix: a 12-cell horizontal band with each month colored
 * by a composite 0–4 comfort score. Palette stops are pinned to atlas tones;
 * the highest-scoring month gets a thin halo so the seasonal "sweet spot" is
 * instantly legible. Not a scientific index — a glanceable seasonal read.
 */
export function ComfortMatrix({ place }: Props) {
  const scores = MONTHS.map((_, i) => scoreMonth(place, i));
  const peakIdx = scores.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);

  const W = 560, H = 56;
  const PAD_L = 6, PAD_R = 6;
  const cellW = (W - PAD_L - PAD_R) / 12;
  const gap = 3;
  const barW = cellW - gap;
  const barH = 26;
  const top = 10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly comfort matrix">
      <defs>
        <filter id="comfortGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {scores.map((s, i) => {
        const x = PAD_L + i * cellW;
        const fill = colorFor(s);
        const isPeak = i === peakIdx && s >= 3.0;
        return (
          <g key={i}>
            <rect
              x={x}
              y={top}
              width={barW}
              height={barH}
              rx="6"
              fill={fill}
              opacity={isPeak ? 0.95 : 0.82}
              filter={isPeak ? "url(#comfortGlow)" : undefined}
            />
            {isPeak && (
              <rect
                x={x - 0.5}
                y={top - 0.5}
                width={barW + 1}
                height={barH + 1}
                rx="6.5"
                fill="none"
                stroke="rgba(241, 246, 252, 0.65)"
                strokeWidth="0.8"
              />
            )}
            <text
              x={x + barW / 2}
              y={top + barH + 13}
              fontSize="10"
              fill={isPeak ? "#f1f6fc" : "#8a99ac"}
              textAnchor="middle"
              fontFamily="Inter"
              fontWeight={isPeak ? 600 : 400}
            >
              {MONTHS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function scoreMonth(p: Place, i: number): number {
  const hi = p.climate.tempHighC[i];
  const lo = p.climate.tempLowC[i];
  const hum = p.climate.humidity?.[i] ?? 65;

  let s = 4;
  if (hi > 30) s -= Math.min(2, (hi - 30) * 0.2);
  if (hi > 35) s -= 1;
  if (hi < 5) s -= Math.min(2, (5 - hi) * 0.2);
  if (lo < -15) s -= 1;
  if (hum > 80 && hi > 25) s -= 1;
  if (hum < 20 && hi > 30) s -= 0.5;
  if (hi >= 18 && hi <= 26 && lo >= 8 && lo <= 16) s += 0.4;

  return Math.max(0, Math.min(4, s));
}

function colorFor(s: number): string {
  if (s >= 3.4) return "#7ea182";
  if (s >= 2.8) return "#b9cdb4";
  if (s >= 2.2) return "#e6c990";
  if (s >= 1.5) return "#d48c66";
  return "#8b3f22";
}
