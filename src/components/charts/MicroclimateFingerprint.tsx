import type { Place } from "../../types";
import { meanJanLow, meanSummerHigh, getAnnualPrecipMm } from "../../lib/climate-metrics";

interface Props { place: Place; compare?: Place; size?: number; compactLabels?: boolean }

/**
 * Microclimate fingerprint: 8-axis radial profile.
 * Axes normalize disparate climate variables to 0..100 so that
 * places across biomes can be compared at a glance.
 */
export function MicroclimateFingerprint({ place, compare, size = 260, compactLabels = false }: Props) {
  const axes = buildAxes(place);
  const compareAxes = compare ? buildAxes(compare) : null;

  const N = axes.length;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 32;
  const labelRadius = compactLabels ? 110 : 118;
  // Horizontal-extreme labels ("Dryness" right, "Low humidity" left) are
  // centered on labelRadius and extend past size/2 — without side padding
  // the svg clips them mid-word. Pad the viewBox instead of shrinking the
  // radius so the rings keep their footprint.
  const padX = compactLabels ? 16 : 36;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const point = (i: number, v: number) => {
    const rad = (v / 100) * r;
    return [cx + Math.cos(angle(i)) * rad, cy + Math.sin(angle(i)) * rad] as const;
  };

  const toPath = (vals: number[]) =>
    vals.map((v, i) => {
      const [x, y] = point(i, v);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ") + " Z";

  const rings = [25, 50, 75, 100];
  const topAxes = [...axes].sort((a, b) => b.v - a.v).slice(0, 3);
  const fingerprintLabel =
    `Microclimate fingerprint for ${place.name}. ` +
    `Strongest axes: ${topAxes.map(a => `${a.label} ${Math.round(a.v)}`).join(", ")}.`;

  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} className="w-full h-auto" role="img" aria-label={fingerprintLabel}>
      {/* Polygonal rings */}
      {rings.map(ring => {
        const pts = axes.map((_, i) => {
          const [x, y] = point(i, ring);
          return `${x},${y}`;
        }).join(" ");
        return <polygon key={ring} points={pts} fill="none" stroke="rgba(124,135,150,0.28)" strokeDasharray="2 3" />;
      })}

      {/* Axes */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(124,135,150,0.24)" />;
      })}

      {/* Compare fingerprint */}
      {compareAxes && (
        <path d={toPath(compareAxes.map(a => a.v))} fill="rgba(214,173,102,0.18)" stroke="#d6ad66" strokeWidth="1.4" strokeDasharray="4 3" />
      )}

      {/* Main fingerprint */}
      <path
        d={toPath(axes.map(a => a.v))}
        fill="rgba(140,200,224,0.24)"
        stroke="#8cc8e0"
        strokeWidth="1.6"
      />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.v);
        return <circle key={i} cx={x} cy={y} r={2.6} fill="#8cc8e0" />;
      })}

      {/* Labels */}
      {axes.map((a, i) => {
        const [x, y] = point(i, labelRadius);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            fontSize={compactLabels ? "9.25" : "10"}
            fill="#4a433c"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Inter"
          >{compactLabels ? compactAxisLabel(a.label) : a.label}</text>
        );
      })}
    </svg>
  );
}

interface Axis { label: string; v: number }

function compactAxisLabel(label: string): string {
  switch (label) {
    case "Cool summers": return "Cool";
    case "Mild winters": return "Mild";
    case "Dryness": return "Dry";
    case "Sunshine":
    case "Solar": return "Sun";
    case "Diurnal swing": return "Swing";
    case "Elevation": return "Elev.";
    case "Low humidity": return "Low hum.";
    case "Uniqueness": return "Unique";
    default: return label;
  }
}

function buildAxes(p: Place): Axis[] {
  const summerHigh = meanSummerHigh(p);
  const janLow = meanJanLow(p);
  const annualP = getAnnualPrecipMm(p);
  const diurnal = p.climate.diurnalSummerC ?? p.climate.tempHighC[6] - p.climate.tempLowC[6];
  const humidity = p.climate.humidity ? p.climate.humidity.reduce((a, b) => a + b, 0) / 12 : 65;
  const sunshine = p.climate.solarEnergyMjM2Day
    ? Math.max(0, Math.min(100, 10 + (p.climate.solarEnergyMjM2Day.reduce((a, b) => a + b, 0) / 12) * 3.75))
    : p.climate.sunshinePct
      ? p.climate.sunshinePct.reduce((a, b) => a + b, 0) / 12
      : 55;

  // All axes normalized 0..100
  return [
    { label: "Cool summers", v: clamp(100 - Math.max(0, summerHigh - 16) * 4) },
    { label: "Mild winters", v: clamp(100 - Math.max(0, -janLow) * 5) },
    { label: "Dryness", v: clamp(100 - annualP / 20) },
    { label: "Solar", v: clamp(sunshine * 1.2) },
    { label: "Diurnal swing", v: clamp((diurnal - 4) * 8) },
    { label: "Elevation", v: clamp(p.elevationM / 35) },
    { label: "Low humidity", v: clamp(100 - Math.max(0, humidity - 35) * 2) },
    { label: "Uniqueness", v: p.scores.microclimateUniqueness },
  ];
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }
