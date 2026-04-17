import type { Place, RiskAssessment } from "../../types";
import { RISK_VALUE } from "../../lib/scoring";

const LABEL: Record<string, string> = {
  wildfire: "Wildfire",
  flood: "Flood",
  drought: "Drought",
  extremeHeat: "Extreme heat",
  extremeCold: "Extreme cold",
  smoke: "Smoke",
  storm: "Storm",
  landslide: "Landslide",
  coastal: "Coastal / SLR",
};

interface Props { place: Place }

export function RiskProfile({ place }: Props) {
  const rows: [string, RiskAssessment][] = Object.entries(place.risks);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([k, v]) => {
        const val = RISK_VALUE[v.level];
        const pct = (val / 5) * 100;
        const tone = val <= 1 ? "#7ea182" : val <= 2 ? "#c6dfed" : val <= 3 ? "#e6c990" : val <= 4 ? "#d48c66" : "#c46a4a";
        const trendGlyph = v.trend === "improving" ? "↓" : v.trend === "worsening" ? "↑" : v.trend === "mixed" ? "↕" : "→";
        const trendColor = v.trend === "improving" ? "#7ea182" : v.trend === "worsening" ? "#d48c66" : "#8a99ac";

        return (
          <div key={k} className="flex items-center gap-3 text-sm" title={v.note || ""}>
            <div className="w-28 text-frost">{LABEL[k]}</div>
            <div className="flex-1 h-2 rounded-full bg-[rgba(58,77,102,0.35)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
            </div>
            <div className="w-28 text-right flex items-center justify-end gap-2">
              <span className="uppercase tracking-wide text-xs" style={{ color: tone }}>{v.level.replace("-", " ")}</span>
              <span className="font-mono-num text-xs" style={{ color: trendColor }} aria-label={`trend ${v.trend ?? "stable"}`}>{trendGlyph}</span>
            </div>
          </div>
        );
      })}
      <div className="text-xs text-stone mt-2 flex items-center gap-4">
        <span>↑ worsening</span>
        <span>↓ improving</span>
        <span>↕ mixed</span>
        <span>→ stable</span>
      </div>
    </div>
  );
}
