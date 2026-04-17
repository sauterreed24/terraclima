import type { Place } from "../../types";
import { useProse } from "../../lib/units";

interface Props { place: Place }

export function ClimateChangeDelta({ place }: Props) {
  const prose = useProse();
  const cc = place.climateChange;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <OutlookCard label="Mid-century (~2050)" body={prose(cc.outlook2050)} />
        <OutlookCard label="Late-century (~2100)" body={prose(cc.outlook2100)} />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-stone mb-2">Key shifts</div>
        <div className="space-y-1.5">
          {cc.keyShifts.map((k, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <DirArrow dir={k.direction} />
              <div className="text-frost font-medium">{k.variable}</div>
              {k.note && <div className="text-stone text-xs italic">{prose(k.note)}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-thin p-3 border-l-2 border-glacier-500 border-l-[var(--color-glacier-500)]" style={{ borderLeftColor: "var(--color-glacier-500)" }}>
        <div className="text-xs uppercase tracking-wider text-stone mb-1">Resilience read</div>
        <div className="text-sm text-frost">{prose(cc.resilienceNote)}</div>
      </div>
    </div>
  );
}

function OutlookCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="panel-thin p-3">
      <div className="text-xs uppercase tracking-wider text-stone mb-1">{label}</div>
      <div className="text-sm text-ice leading-relaxed">{body}</div>
    </div>
  );
}

function DirArrow({ dir }: { dir: "up" | "down" | "mixed" }) {
  const color = dir === "up" ? "#d48c66" : dir === "down" ? "#7fb7d2" : "#8a99ac";
  const glyph = dir === "up" ? "↑" : dir === "down" ? "↓" : "↕";
  return (
    <span className="font-mono-num text-lg w-5 text-center" style={{ color }}>{glyph}</span>
  );
}
