import type { LocalContrast } from "../../types";
import { useUnits, toDeltaUnit, fmtDist, useProse } from "../../lib/units";

interface Props { contrasts: LocalContrast[] }

/**
 * Shows micro-scale deltas relative to a radius of surrounding land.
 * Renders each contrast slice with the variables in which the place
 * differs most meaningfully from its region.
 */
export function ContrastChart({ contrasts }: Props) {
  const { temp, dist } = useUnits();
  const prose = useProse();
  if (!contrasts || contrasts.length === 0) return null;
  return (
    <div className="space-y-3">
      {contrasts.map((c, i) => (
        <div key={i} className="panel-thin p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-frost">Within <span className="font-mono-num text-ice">{fmtDist(c.radiusKm, dist)}</span></div>
            {c.note && <div className="text-xs text-stone italic max-w-[60%] text-right">{prose(c.note)}</div>}
          </div>
          <div className="flex flex-wrap gap-3">
            {c.summerHighDeltaC !== undefined && (
              <DeltaBadge
                label="Summer high"
                valueNative={c.summerHighDeltaC}
                display={toDeltaUnit(c.summerHighDeltaC, temp)}
                unit={`°${temp}`}
              />
            )}
            {c.winterLowDeltaC !== undefined && (
              <DeltaBadge
                label="Winter low"
                valueNative={c.winterLowDeltaC}
                display={toDeltaUnit(c.winterLowDeltaC, temp)}
                unit={`°${temp}`}
              />
            )}
            {c.precipDeltaPct !== undefined && (
              <DeltaBadge label="Annual precip" valueNative={c.precipDeltaPct} display={c.precipDeltaPct} unit="%" />
            )}
            {c.humidityDeltaPct !== undefined && (
              <DeltaBadge label="Humidity" valueNative={c.humidityDeltaPct} display={c.humidityDeltaPct} unit="%" />
            )}
            {c.growingSeasonDeltaDays !== undefined && (
              <DeltaBadge label="Growing season" valueNative={c.growingSeasonDeltaDays} display={c.growingSeasonDeltaDays} unit=" days" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeltaBadge({ label, valueNative, display, unit }: { label: string; valueNative: number; display: number; unit: string }) {
  const up = valueNative > 0;
  const color = up ? "#f0d29c" : "#8cc8e0";
  const bg = up ? "rgba(240,210,156,0.12)" : "rgba(140,200,224,0.12)";
  const sign = up ? "+" : "−";
  const abs = Math.abs(display);
  const digits = abs % 1 === 0 || abs >= 20 ? 0 : 1;
  return (
    <div className="flex items-baseline gap-1.5 px-2.5 py-1 rounded-md border" style={{ background: bg, borderColor: color + "55" }}>
      <span className="text-[11px] uppercase tracking-wide text-frost">{label}</span>
      <span className="font-mono-num text-sm" style={{ color }}>{sign}{abs.toFixed(digits)}{unit}</span>
    </div>
  );
}
