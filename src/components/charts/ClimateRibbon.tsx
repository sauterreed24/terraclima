import { MONTHS } from "../../types";
import type { Monthly12 } from "../../types";
import { useUnits, toTempUnit } from "../../lib/units";

interface Props {
  highs: Monthly12;
  lows: Monthly12;
  height?: number;
  /** Optional reference high/low series to overlay (e.g. nearby contrast). */
  refHighs?: Monthly12;
  refLows?: Monthly12;
  refLabel?: string;
}

/**
 * Seasonal temperature ribbon: a filled band between daily highs and lows
 * across the 12 months of a typical year. Honours user unit preference.
 */
export function ClimateRibbon({ highs, lows, height = 180, refHighs, refLows, refLabel }: Props) {
  const { temp } = useUnits();
  const W = 560, H = height, PAD_L = 44, PAD_R = 12, PAD_T = 14, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Convert all values to display unit first
  const dHighs = highs.map(v => toTempUnit(v, temp));
  const dLows = lows.map(v => toTempUnit(v, temp));
  const dRefHighs = refHighs?.map(v => toTempUnit(v, temp));
  const dRefLows = refLows?.map(v => toTempUnit(v, temp));
  const freezing = toTempUnit(0, temp);
  const heatStress = toTempUnit(32, temp);
  const comfortLo = toTempUnit(15, temp);
  const comfortHi = toTempUnit(24, temp);

  const allVals = [...dHighs, ...dLows, ...(dRefHighs ?? []), ...(dRefLows ?? [])];
  const step = temp === "F" ? 10 : 5;
  const dataMin = Math.floor(Math.min(...allVals) / step) * step - step;
  const dataMax = Math.ceil(Math.max(...allVals) / step) * step + step;

  const x = (i: number) => PAD_L + (i + 0.5) * (chartW / 12);
  const y = (v: number) => PAD_T + chartH - ((v - dataMin) / (dataMax - dataMin)) * chartH;

  const pathRibbon = () => {
    const top = dHighs.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
    const bottom = dLows.map((_, i) => `L ${x(11 - i)} ${y(dLows[11 - i])}`).join(" ");
    return top + " " + bottom + " Z";
  };
  const pathLine = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const tickStep = temp === "F" ? 20 : 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(dataMin / tickStep) * tickStep; t <= dataMax; t += tickStep) ticks.push(t);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6ad66" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#89af88" stopOpacity="0.42" />
          <stop offset="1" stopColor="#4faacd" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines */}
      {ticks.map((t, ti) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="rgba(124,135,150,0.18)" strokeDasharray="2 4" />
          <text
            x={PAD_L - 6}
            y={y(t) + 3}
            fontSize="10"
            fill="#9badc2"
            textAnchor="end"
            fontFamily="JetBrains Mono"
          >
            {t.toFixed(0)}{ti === ticks.length - 1 ? `°${temp}` : "°"}
          </text>
        </g>
      ))}

      {/* Human comfort band 15–24°C */}
      {dataMax > comfortLo && dataMin < comfortHi && (
        <rect
          x={PAD_L}
          y={y(Math.min(comfortHi, dataMax))}
          width={chartW}
          height={Math.max(0, y(Math.max(comfortLo, dataMin)) - y(Math.min(comfortHi, dataMax)))}
          fill="rgba(137,175,136,0.11)"
        />
      )}

      {/* Freezing line */}
      {dataMin < freezing && dataMax > freezing && (
        <g>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(freezing)} y2={y(freezing)} stroke="rgba(195,228,241,0.4)" strokeWidth="1.2" />
          <text x={W - PAD_R - 4} y={y(freezing) - 3} fontSize="9" fill="#bbe1f0" textAnchor="end" fontFamily="Inter" fontStyle="italic">freezing</text>
        </g>
      )}

      {/* Heat stress line 32°C */}
      {dataMax > heatStress && (
        <g>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(heatStress)} y2={y(heatStress)} stroke="rgba(211,124,91,0.5)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={W - PAD_R - 4} y={y(heatStress) - 3} fontSize="9" fill="#efb49a" textAnchor="end" fontFamily="Inter" fontStyle="italic">heat stress</text>
        </g>
      )}

      {/* Ribbon */}
      <path d={pathRibbon()} fill="url(#ribbonGrad)" stroke="none" />

      {/* Reference line (optional) */}
      {dRefHighs && <path d={pathLine(dRefHighs)} fill="none" stroke="#7c8796" strokeWidth="1.2" strokeDasharray="4 3" />}
      {dRefLows && <path d={pathLine(dRefLows)} fill="none" stroke="#7c8796" strokeWidth="1.2" strokeDasharray="4 3" />}

      {/* Line overlays */}
      <path d={pathLine(dHighs)} fill="none" stroke="#f0d29c" strokeWidth="1.8" />
      <path d={pathLine(dLows)} fill="none" stroke="#8cc8e0" strokeWidth="1.8" />

      {/* Dots */}
      {dHighs.map((v, i) => <circle key={"h" + i} cx={x(i)} cy={y(v)} r={2.6} fill="#f0d29c" />)}
      {dLows.map((v, i) => <circle key={"l" + i} cx={x(i)} cy={y(v)} r={2.6} fill="#8cc8e0" />)}

      {/* X labels */}
      {MONTHS.map((m, i) => (
        <text key={m} x={x(i)} y={H - 8} fontSize="10" fill="#9badc2" textAnchor="middle" fontFamily="Inter">{m}</text>
      ))}

      {refLabel && (
        <text x={W - PAD_R} y={PAD_T + 4} fontSize="10" fill="#7c8796" textAnchor="end" fontStyle="italic">vs {refLabel}</text>
      )}
    </svg>
  );
}
