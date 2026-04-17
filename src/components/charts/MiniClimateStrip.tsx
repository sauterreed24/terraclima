import type { Place } from "../../types";

interface Props {
  place: Place;
  height?: number;
}

/**
 * Dense 12-month climate fingerprint strip.
 * Each month is a column whose:
 *  - fill colour maps to mean monthly temperature (ice → ember)
 *  - bar height maps to monthly precipitation (sqrt-scaled for visibility)
 * Produces an instantly-recognisable climatological signature per place.
 */
export function MiniClimateStrip({ place, height = 36 }: Props) {
  const { tempHighC, tempLowC, precipMm } = place.climate;
  const W = 160, H = height;
  const cols = 12;
  const gap = 2;
  const colW = (W - gap * (cols - 1)) / cols;

  const precipMax = Math.max(...precipMm, 1);
  const precipScale = (p: number) => Math.sqrt(p / precipMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" aria-hidden>
      {tempHighC.map((_, i) => {
        const mean = (tempHighC[i] + tempLowC[i]) / 2;
        const color = tempColor(mean);
        const precip = precipMm[i] ?? 0;
        const x = i * (colW + gap);
        const barH = precipScale(precip) * (H - 6);
        return (
          <g key={i}>
            {/* temperature background ribbon */}
            <rect x={x} y={0} width={colW} height={H} rx={1.5} fill={color} opacity={0.32} />
            {/* precipitation bar (anchored bottom) */}
            <rect x={x} y={H - barH} width={colW} height={barH} rx={1.2} fill={color} opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}

/** Map a monthly mean temp (°C) to an atlas-palette hex colour. */
function tempColor(t: number): string {
  // Cold → ice-blue; mild → sage/ochre; hot → ember
  const stops: Array<[number, [number, number, number]]> = [
    [-20, [164, 199, 220]],
    [-5, [127, 183, 210]],
    [5, [185, 205, 180]],
    [15, [230, 201, 144]],
    [24, [223, 150, 102]],
    [32, [196, 106, 74]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t1, c1] = stops[i];
    const [t2, c2] = stops[i + 1];
    if (t <= t2) {
      const a = Math.max(0, Math.min(1, (t - t1) / (t2 - t1)));
      const rgb = c1.map((v, k) => Math.round(v + (c2[k] - v) * a));
      return `rgb(${rgb.join(",")})`;
    }
  }
  const [, c] = stops[stops.length - 1];
  return `rgb(${c.join(",")})`;
}
