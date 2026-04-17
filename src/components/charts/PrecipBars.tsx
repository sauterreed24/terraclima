import { MONTHS } from "../../types";
import type { Monthly12 } from "../../types";
import { useUnits, mmToIn, cmToIn, precipTickStep } from "../../lib/units";

interface Props {
  precip: Monthly12;
  snow?: Monthly12;
  height?: number;
}

/** Monthly precipitation bars with optional snow overlay. */
export function PrecipBars({ precip, snow, height = 160 }: Props) {
  const { dist } = useUnits();
  const W = 560, H = height, PAD_L = 42, PAD_R = 12, PAD_T = 14, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW = chartW / 12 - 6;

  const convert = (mm: number) => (dist === "imperial" ? mmToIn(mm) : mm);
  const convertSnow = (cm: number) => {
    // Snow is stored in cm; "mm-equivalent" at ~0.1 inch / cm (with scaling) retained for visual.
    // Convert to the user's chosen unit consistent with precip axis:
    if (dist === "imperial") return cmToIn(cm) * 0.8; // ~80% visual weight
    return cm * 8; // approximate mm-equivalent scaling (1 cm ≈ 8 mm water equivalent)
  };

  const dPrecip = precip.map(convert);
  const dSnow = snow?.map(convertSnow);

  const maxVal = Math.max(...dPrecip, ...(dSnow ?? [0])) * 1.15 || 1;

  const x = (i: number) => PAD_L + i * (chartW / 12) + 3;
  const y = (v: number) => PAD_T + chartH - (v / maxVal) * chartH;

  const step = precipTickStep(maxVal, dist);
  const ticks: number[] = [];
  for (let t = 0; t <= maxVal; t += step) ticks.push(t);

  const total = dPrecip.reduce((a, b) => a + b, 0);
  const mean = total / 12;
  const wettestIdx = dPrecip.reduce((bi, v, i) => (v > dPrecip[bi] ? i : bi), 0);
  const driestIdx = dPrecip.reduce((bi, v, i) => (v < dPrecip[bi] ? i : bi), 0);

  const axisLabel = dist === "imperial" ? "in" : "mm";
  const fmt = (v: number) => dist === "imperial" ? v.toFixed(v < 2 ? 1 : 0) : v.toFixed(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="rgba(124,135,150,0.2)" strokeDasharray="2 4" />
          <text x={PAD_L - 6} y={y(t) + 3} fontSize="10" fill="#9badc2" textAnchor="end" fontFamily="JetBrains Mono">{fmt(t)}</text>
        </g>
      ))}

      {/* Mean reference line */}
      <line x1={PAD_L} x2={W - PAD_R} y1={y(mean)} y2={y(mean)} stroke="rgba(240,210,156,0.6)" strokeWidth="1" strokeDasharray="5 3" />
      <text x={W - PAD_R - 4} y={y(mean) - 3} fontSize="9" fill="#d6ad66" textAnchor="end" fontFamily="Inter" fontStyle="italic">
        mean {fmt(mean)} {axisLabel}
      </text>

      {dPrecip.map((v, i) => (
        <g key={i}>
          {dSnow && dSnow[i] > 0 && (
            <rect
              x={x(i)}
              y={y(Math.max(v, dSnow[i]))}
              width={barW}
              height={Math.max(0, chartH - (y(Math.max(v, dSnow[i])) - PAD_T))}
              fill="#c3e4f1"
              opacity="0.42"
              rx="1.5"
            />
          )}
          <rect
            x={x(i)}
            y={y(v)}
            width={barW}
            height={Math.max(0, chartH - (y(v) - PAD_T))}
            fill="#4faacd"
            opacity="0.9"
            rx="1.5"
          />
        </g>
      ))}

      {MONTHS.map((m, i) => {
        const isMax = i === wettestIdx;
        const isMin = i === driestIdx;
        return (
          <text
            key={m}
            x={x(i) + barW / 2}
            y={H - 8}
            fontSize="10"
            fill={isMax ? "#bbe1f0" : isMin ? "#f0d29c" : "#9badc2"}
            textAnchor="middle"
            fontFamily="Inter"
            fontWeight={isMax || isMin ? 600 : 400}
          >{m}</text>
        );
      })}

      <text x={x(wettestIdx) + barW / 2} y={y(dPrecip[wettestIdx]) - 4} fontSize="9" fill="#bbe1f0" textAnchor="middle" fontFamily="JetBrains Mono">{fmt(dPrecip[wettestIdx])}</text>
      {dPrecip[driestIdx] < mean * 0.4 && (
        <text x={x(driestIdx) + barW / 2} y={y(dPrecip[driestIdx]) - 4} fontSize="9" fill="#f0d29c" textAnchor="middle" fontFamily="JetBrains Mono">{fmt(dPrecip[driestIdx])}</text>
      )}

      <text x={PAD_L} y={PAD_T - 2} fontSize="10" fill="#7c8796" fontFamily="Inter">{axisLabel}</text>
    </svg>
  );
}
