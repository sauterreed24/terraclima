import { MONTHS } from "../../types";
import type { Monthly12 } from "../../types";
import { useUnits, mmToIn, cmToIn, precipTickStep } from "../../lib/units";

interface Props {
  precip: Monthly12;
  snow?: Monthly12;
  height?: number;
}

/**
 * Monthly precipitation bars with optional snow overlay.
 *
 * Polished treatment: slimmer bars with vertical rain-gradient, dashed mean
 * reference line, annual-total callout, wettest-month highlight and
 * driest-month label (only when meaningfully dry).
 */
export function PrecipBars({ precip, snow, height = 160 }: Props) {
  const { dist } = useUnits();
  const W = 560, H = height, PAD_L = 44, PAD_R = 14, PAD_T = 16, PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  // Tighter column width with a bit more air between bars for a cleaner feel.
  const barW = chartW / 12 - 8;

  const convert = (mm: number) => (dist === "imperial" ? mmToIn(mm) : mm);
  const convertSnow = (cm: number) => {
    // Snow stays visually proportional on the same axis — ~80% visual weight
    // to keep attention on rainfall without hiding the snow signal entirely.
    if (dist === "imperial") return cmToIn(cm) * 0.8;
    return cm * 8;
  };

  const dPrecip = precip.map(convert);
  const dSnow = snow?.map(convertSnow);

  const maxVal = Math.max(...dPrecip, ...(dSnow ?? [0])) * 1.15 || 1;

  const x = (i: number) => PAD_L + i * (chartW / 12) + 4;
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
  const totalLabel = dist === "imperial" ? `${total.toFixed(total < 10 ? 1 : 0)} in / yr` : `${total.toFixed(0)} mm / yr`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly precipitation chart">
      <defs>
        <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc8e0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#4faacd" stopOpacity="0.68" />
        </linearGradient>
        <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f3f9" stopOpacity="0.65" />
          <stop offset="1" stopColor="#c3e4f1" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {ticks.map((t, ti) => (
        <g key={t}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(t)}
            y2={y(t)}
            stroke="rgba(124,135,150,0.16)"
            strokeDasharray="2 4"
          />
          <text
            x={PAD_L - 6}
            y={y(t) + 3}
            fontSize="10"
            fill="#9badc2"
            textAnchor="end"
            fontFamily="JetBrains Mono"
          >
            {fmt(t)}{ti === ticks.length - 1 ? ` ${axisLabel}` : ""}
          </text>
        </g>
      ))}

      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={y(mean)}
        y2={y(mean)}
        stroke="rgba(240,210,156,0.55)"
        strokeWidth="1"
        strokeDasharray="5 3"
      />
      <text
        x={W - PAD_R - 4}
        y={y(mean) - 4}
        fontSize="9"
        fill="#d6ad66"
        textAnchor="end"
        fontFamily="Inter"
        fontStyle="italic"
      >
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
              fill="url(#snowGrad)"
              rx="2"
            />
          )}
          <rect
            x={x(i)}
            y={y(v)}
            width={barW}
            height={Math.max(0, chartH - (y(v) - PAD_T))}
            fill="url(#precipGrad)"
            rx="2"
          />
          {i === wettestIdx && (
            <rect
              x={x(i) - 0.5}
              y={y(v) - 0.5}
              width={barW + 1}
              height={Math.max(0, chartH - (y(v) - PAD_T)) + 0.5}
              fill="none"
              stroke="rgba(140,200,224,0.85)"
              strokeWidth="0.9"
              rx="2"
            />
          )}
        </g>
      ))}

      {MONTHS.map((m, i) => {
        const isMax = i === wettestIdx;
        const isMin = i === driestIdx;
        return (
          <text
            key={m}
            x={x(i) + barW / 2}
            y={H - 10}
            fontSize="10"
            fill={isMax ? "#bbe1f0" : isMin ? "#f0d29c" : "#9badc2"}
            textAnchor="middle"
            fontFamily="Inter"
            fontWeight={isMax || isMin ? 600 : 400}
          >{m}</text>
        );
      })}

      <text
        x={x(wettestIdx) + barW / 2}
        y={y(dPrecip[wettestIdx]) - 5}
        fontSize="9"
        fill="#bbe1f0"
        textAnchor="middle"
        fontFamily="JetBrains Mono"
      >
        {fmt(dPrecip[wettestIdx])}
      </text>
      {dPrecip[driestIdx] < mean * 0.4 && (
        <text
          x={x(driestIdx) + barW / 2}
          y={y(dPrecip[driestIdx]) - 5}
          fontSize="9"
          fill="#f0d29c"
          textAnchor="middle"
          fontFamily="JetBrains Mono"
        >
          {fmt(dPrecip[driestIdx])}
        </text>
      )}

      <text
        x={W - PAD_R}
        y={PAD_T - 4}
        fontSize="10"
        fill="#c6dcbd"
        textAnchor="end"
        fontFamily="JetBrains Mono"
      >
        Σ {totalLabel}
      </text>
    </svg>
  );
}
